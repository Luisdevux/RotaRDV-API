// src/test/services/AuthService.test.js

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cpf as cpfUtil } from 'cpf-cnpj-validator';

import AuthService from '../../services/AuthService.js';
import Usuario from '../../models/Usuario.js';
import CustomError from '../../utils/helpers/CustomError.js';

let service;
let contador = 1;

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
    service = new AuthService();
});

afterEach(async () => {
    if (mongoose.connection.readyState === 1) {
        await Usuario.deleteMany({});
    }
});

afterAll(async () => {
    await mongoose.disconnect();
});

describe('Unitário: AuthService (Regras de Negócio de Autenticação)', () => {
    describe('Método login', () => {
        it('deve autenticar usuário ativo e com email verificado, retornando tokens', async () => {
            const senhaPlana = 'MinhaSenha@123';
            const usuario = await criarUsuario({
                senha: await bcrypt.hash(senhaPlana, 10),
                status: 'ativo',
                email_verificado: true,
            });

            const resultado = await service.login({
                email: usuario.email,
                senha: senhaPlana,
            });

            expect(resultado).toBeDefined();
            expect(resultado.user).toBeDefined();
            expect(resultado.user.accessToken).toBeDefined();
            expect(resultado.user.refreshtoken).toBeDefined();
            expect(resultado.user.email).toBe(usuario.email);
            expect(resultado.user.senha).toBeUndefined(); // Proteção contra vazamento de hash
        });

        it('deve lançar CustomError 401 quando o email não existir', async () => {
            let erro;
            try {
                await service.login({ email: 'inexistente@teste.com', senha: 'QualquerSenha@123' });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(401);
            expect(erro.errorType).toBe('notFound');
            expect(erro.field).toBe('Email');
        });

        it('deve lançar CustomError 403 quando o usuário estiver com status inativo', async () => {
            const senhaPlana = 'SenhaForte@123';
            const usuario = await criarUsuario({
                senha: await bcrypt.hash(senhaPlana, 10),
                status: 'inativo',
                email_verificado: true,
            });

            let erro;
            try {
                await service.login({ email: usuario.email, senha: senhaPlana });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(403);
            expect(erro.errorType).toBe('forbidden');
            expect(erro.field).toBe('Status');
        });

        it('deve lançar CustomError 403 quando o email do usuário não tiver sido verificado', async () => {
            const senhaPlana = 'SenhaForte@123';
            const usuario = await criarUsuario({
                senha: await bcrypt.hash(senhaPlana, 10),
                status: 'ativo',
                email_verificado: false,
            });

            let erro;
            try {
                await service.login({ email: usuario.email, senha: senhaPlana });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(403);
            expect(erro.errorType).toBe('forbidden');
            expect(erro.field).toBe('Email');
        });

        it('deve lançar CustomError 401 googleOnly para contas criadas via Google sem senha local', async () => {
            const usuario = await criarUsuario({
                senha: '',
                authProvider: 'google',
                status: 'ativo',
                email_verificado: true,
            });

            let erro;
            try {
                await service.login({ email: usuario.email, senha: 'QualquerSenha@123' });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(401);
            expect(erro.errorType).toBe('googleOnly');
            expect(erro.field).toBe('Senha');
        });

        it('deve lançar CustomError 401 quando a senha estiver incorreta', async () => {
            const usuario = await criarUsuario({
                senha: await bcrypt.hash('SenhaCorreta@123', 10),
                status: 'ativo',
                email_verificado: true,
            });

            let erro;
            try {
                await service.login({ email: usuario.email, senha: 'SenhaIncorreta@123' });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(401);
            expect(erro.errorType).toBe('notFound');
            expect(erro.field).toBe('Senha');
        });
    });

    describe('Método refresh', () => {
        it('deve renovar token quando o refresh token for válido e corresponder ao salvo no banco', async () => {
            const usuario = await criarUsuario();
            const token = gerarRefreshToken(usuario._id);
            await Usuario.updateOne({ _id: usuario._id }, { refreshtoken: token });

            const resultado = await service.refresh(usuario._id, token);
            expect(resultado).toBeDefined();
            expect(resultado.user.accesstoken).toBeDefined();
            expect(resultado.user.refreshtoken).toBe(token);
        });

        it('deve lançar CustomError 401 quando o refresh token for adulterado', async () => {
            const usuario = await criarUsuario();
            const tokenAdulterado = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.fake_signature';

            let erro;
            try {
                await service.refresh(usuario._id, tokenAdulterado);
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(401);
            expect(erro.errorType).toBe('invalidToken');
        });
    });

    describe('Método logout', () => {
        it('deve remover o refresh token do usuário no banco', async () => {
            const usuario = await criarUsuario();
            const token = gerarRefreshToken(usuario._id);
            await Usuario.updateOne({ _id: usuario._id }, { refreshtoken: token });

            await service.logout(usuario._id);

            const usuarioAtualizado = await Usuario.findById(usuario._id).select('+refreshtoken');
            expect(usuarioAtualizado.refreshtoken).toBeNull();
        });
    });
});
