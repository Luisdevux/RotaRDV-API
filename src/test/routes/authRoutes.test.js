// src/test/routes/authRoutes.test.js

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cpf as cpfUtil } from 'cpf-cnpj-validator';

vi.mock('../../middlewares/RateLimitMiddleware.js', () => ({
    strictRateLimit: (req, res, next) => next(),
    authRateLimit: (req, res, next) => next(),
    publicRateLimit: (req, res, next) => next(),
}));

import authRoutes from '../../routes/authRoutes.js';
import Usuario from '../../models/Usuario.js';
import errorHandler from '../../utils/helpers/errorHandler.js';

let app;
let contador = 1;

function gerarTokenAcesso(userId) {
    return jwt.sign({ id: String(userId) }, process.env.JWT_SECRET_ACCESS_TOKEN, { expiresIn: '30m' });
}

function gerarRefreshToken(userId) {
    return jwt.sign({ id: String(userId) }, process.env.JWT_SECRET_REFRESH_TOKEN, { expiresIn: '30d' });
}

async function criarUsuario(extra = {}) {
    const id = contador++;
    const senha = extra.senha !== undefined ? extra.senha : await bcrypt.hash('Senha@123', 10);
    return await Usuario.create({
        nome: `Usuario ${id}`,
        email: `usuario${id}_${Date.now()}@teste.com`,
        senha,
        cpf: cpfUtil.generate(false),
        cnh: `${Math.floor(10000000000 + Math.random() * 90000000000)}`,
        telefone: '11988887777',
        status: 'ativo',
        role: 'motorista',
        authProvider: 'local',
        email_verificado: true,
        refreshtoken: null,
        ...extra,
    });
}

beforeAll(async () => {
    process.env.JWT_SECRET_ACCESS_TOKEN = 'secret_access_test_32chars_long!';
    process.env.JWT_SECRET_REFRESH_TOKEN = 'secret_refresh_test_32chars_long';
    process.env.JWT_ACCESS_TOKEN_EXPIRATION = '30m';
    process.env.JWT_REFRESH_TOKEN_EXPIRATION = '30d';

    await mongoose.connect(process.env.DB_URL);

    app = express();
    app.use(express.json());
    app.use(authRoutes);
    app.use(errorHandler);
});

afterEach(async () => {
    if (mongoose.connection.readyState === 1) {
        await Usuario.deleteMany({});
    }
});

afterAll(async () => {
    await mongoose.disconnect();
});

describe('Rotas de Autenticação (authRoutes)', () => {
    describe('POST /login', () => {
        it('deve logar com sucesso com credenciais válidas e retornar tokens', async () => {
            const senhaPlana = 'SenhaForte@2026';
            const usuario = await criarUsuario({
                senha: await bcrypt.hash(senhaPlana, 10),
                status: 'ativo',
                email_verificado: true,
            });

            const res = await request(app)
                .post('/login')
                .send({
                    email: usuario.email,
                    senha: senhaPlana,
                });

            expect(res.status).toBe(200);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.user).toBeDefined();
            expect(res.body.data.user.accessToken).toBeDefined();
            expect(res.body.data.user.refreshtoken).toBeDefined();
            expect(res.body.data.user.email).toBe(usuario.email);
            expect(res.body.data.user.senha).toBeUndefined();
        });

        it('deve bloquear com 403 usuário com status inativo', async () => {
            const senhaPlana = 'SenhaForte@2026';
            const usuario = await criarUsuario({
                senha: await bcrypt.hash(senhaPlana, 10),
                status: 'inativo',
                email_verificado: true,
            });

            const res = await request(app)
                .post('/login')
                .send({
                    email: usuario.email,
                    senha: senhaPlana,
                });

            expect(res.status).toBe(403);
            expect(res.body.message).toContain('desativada');
        });

        it('deve bloquear com 403 usuário com email não confirmado (não originado ou ativado pelo painel)', async () => {
            const senhaPlana = 'SenhaForte@2026';
            const usuario = await criarUsuario({
                senha: await bcrypt.hash(senhaPlana, 10),
                status: 'ativo',
                email_verificado: false,
            });

            const res = await request(app)
                .post('/login')
                .send({
                    email: usuario.email,
                    senha: senhaPlana,
                });

            expect(res.status).toBe(403);
            expect(res.body.message).toContain('verifique seu email');
        });

        it('deve rejeitar com 401 senha incorreta', async () => {
            const usuario = await criarUsuario({
                status: 'ativo',
                email_verificado: true,
            });

            const res = await request(app)
                .post('/login')
                .send({
                    email: usuario.email,
                    senha: 'OutraSenha@123',
                });

            expect(res.status).toBe(401);
        });

        it('deve rejeitar com 401 email inexistente', async () => {
            const res = await request(app)
                .post('/login')
                .send({
                    email: 'naoexiste_teste@empresa.com',
                    senha: 'SenhaQualquer@123',
                });

            expect(res.status).toBe(401);
        });

        it('deve orientar login via Google com 401 para conta Google-Only', async () => {
            const usuario = await criarUsuario({
                senha: '',
                authProvider: 'google',
                status: 'ativo',
                email_verificado: true,
            });

            const res = await request(app)
                .post('/login')
                .send({
                    email: usuario.email,
                    senha: 'TentativaSenha@123',
                });

            expect(res.status).toBe(401);
            expect(res.body.message).toContain('Google');
        });
    });

    describe('POST /refresh', () => {
        it('deve renovar token com sucesso usando refresh_token válido cadastrado no banco', async () => {
            const usuario = await criarUsuario();
            const refreshTokenValido = gerarRefreshToken(usuario._id);
            await Usuario.updateOne({ _id: usuario._id }, { refreshtoken: refreshTokenValido });

            const res = await request(app)
                .post('/refresh')
                .send({
                    refresh_token: refreshTokenValido,
                });

            expect(res.status).toBe(200);
            expect(res.body.data.user.accesstoken).toBeDefined();
            expect(res.body.data.user.refreshtoken).toBe(refreshTokenValido);
        });

        it('deve rejeitar refresh com 401 para token adulterado', async () => {
            await criarUsuario();
            const tokenInvalido = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.fake_signature';

            const res = await request(app)
                .post('/refresh')
                .send({
                    refresh_token: tokenInvalido,
                });

            expect(res.status).toBe(401);
        });

        it('deve rejeitar refresh com 400 quando o refresh_token não for enviado', async () => {
            const res = await request(app)
                .post('/refresh')
                .send({});

            expect(res.status).toBe(400);
        });
    });

    describe('POST /logout', () => {
        it('deve invalidar refreshtoken no banco e revogar sessão', async () => {
            const usuario = await criarUsuario();
            const accessToken = gerarTokenAcesso(usuario._id);
            const refreshToken = gerarRefreshToken(usuario._id);
            await Usuario.updateOne({ _id: usuario._id }, { refreshtoken: refreshToken });

            const res = await request(app)
                .post('/logout')
                .send({ access_token: accessToken });

            expect(res.status).toBe(200);

            const usuarioAtualizado = await Usuario.findById(usuario._id).select('+refreshtoken');
            expect(usuarioAtualizado.refreshtoken).toBeNull();
        });

        it('deve rejeitar logout sem token com status 400', async () => {
            const res = await request(app)
                .post('/logout')
                .send({});

            expect(res.status).toBe(400);
        });
    });

    describe('POST /recover', () => {
        it('deve responder com mensagem neutra independente da existência do email para evitar enumeração', async () => {
            const res = await request(app)
                .post('/recover')
                .send({
                    email: 'qualquer_email@teste.com',
                });

            expect(res.status).toBe(200);
            expect(res.body.data.message).toContain('link de recuperação');
        });
    });

    describe('GET /verificar-email', () => {
        it('deve retornar HTML de sucesso ao receber token de verificação válido', async () => {
            const token = 'token-valido-rota-teste-456';
            await criarUsuario({
                token_verificacao_email: token,
                exp_token_verificacao_email: new Date(Date.now() + 60 * 60 * 1000),
                email_verificado: false,
            });

            const res = await request(app)
                .get(`/verificar-email?token=${token}`);

            expect(res.status).toBe(200);
            expect(res.text).toContain('Sucesso');
        });

        it('deve retornar 400 quando o token não for enviado', async () => {
            const res = await request(app)
                .get('/verificar-email');

            expect(res.status).toBe(400);
        });
    });
});
