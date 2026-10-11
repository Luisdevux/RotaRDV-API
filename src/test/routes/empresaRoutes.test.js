// src/test/routes/empresaRoutes.test.js

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { cnpj as cnpjUtil, cpf as cpfUtil } from 'cpf-cnpj-validator';

vi.mock('../../middlewares/RateLimitMiddleware.js', () => ({
    strictRateLimit: (req, res, next) => next(),
    authRateLimit: (req, res, next) => next(),
    publicRateLimit: (req, res, next) => next(),
}));

vi.mock('../../middlewares/AuthMiddleware.js', () => ({
    default: vi.fn((req, res, next) => {
        req.user_id = currentUserId;
        next();
    }),
}));

import empresaRoutes from '../../routes/empresaRoutes.js';
import Usuario from '../../models/Usuario.js';
import Empresa from '../../models/Empresa.js';
import Veiculo from '../../models/Veiculo.js';
import errorHandler from '../../utils/helpers/errorHandler.js';

let app;
let currentUserId = null;
let contador = 1;

function autenticarComo(usuarioOuId) {
    currentUserId = String(usuarioOuId._id || usuarioOuId);
}

async function criarUsuario(extra = {}) {
    const id = contador++;
    return await Usuario.create({
        nome: `Usuario ${id}`,
        email: `usuario${id}_${Date.now()}@teste.com`,
        senha: 'hash_senha_teste_123',
        cpf: cpfUtil.generate(false),
        cnh: `${Math.floor(10000000000 + Math.random() * 90000000000)}`,
        telefone: '11988887777',
        status: 'ativo',
        role: 'motorista',
        email_verificado: true,
        authProvider: 'local',
        ...extra,
    });
}

async function criarEmpresa(extra = {}) {
    const id = contador++;
    return await Empresa.create({
        nome_empresa: `Transportadora Teste ${id}`,
        cnpj: cnpjUtil.format(cnpjUtil.generate(false)),
        email: `contato${id}_${Date.now()}@transporte.com`,
        telefone: '1133334444',
        status: 'ativo',
        ...extra,
    });
}

async function criarVeiculo(extra = {}) {
    const id = contador++;
    return await Veiculo.create({
        placa: `ABC${id % 10}D${(id + 1) % 100}`.padEnd(7, '0'),
        modelo: 'Scania R500',
        ano_fabricacao: 2021,
        combustivel_preferencial: 'DIESEL_S10',
        status: 'ativo',
        ...extra,
    });
}

beforeAll(async () => {
    await mongoose.connect(process.env.DB_URL);

    app = express();
    app.use(express.json());
    app.use(empresaRoutes);
    app.use(errorHandler);
});

afterEach(async () => {
    if (mongoose.connection.readyState === 1) {
        await Promise.all([
            Usuario.deleteMany({}),
            Empresa.deleteMany({}),
            Veiculo.deleteMany({}),
        ]);
    }
});

afterAll(async () => {
    await mongoose.disconnect();
});

describe('Rotas de Empresas (empresaRoutes)', () => {
    describe('POST /empresas (Permissões de SuperAdmin)', () => {
        it('deve permitir criação de empresa para usuário com role superAdmin', async () => {
            const superAdmin = await criarUsuario({ role: 'superAdmin' });
            autenticarComo(superAdmin);

            const res = await request(app)
                .post('/empresas')
                .send({
                    nome_empresa: 'Logística Rodoviária Brasil Ltda',
                    cnpj: cnpjUtil.format(cnpjUtil.generate(false)),
                    email: 'diretoria@logistica.com.br',
                    telefone: '11999998888',
                });

            expect(res.status).toBe(201);
            expect(res.body.data.nome_empresa).toBe('Logística Rodoviária Brasil Ltda');
        });

        it('deve bloquear com 403 criação de empresa para usuário com role admin comum', async () => {
            const adminComum = await criarUsuario({ role: 'admin' });
            autenticarComo(adminComum);

            const res = await request(app)
                .post('/empresas')
                .send({
                    nome_empresa: 'Tentativa Invalida Ltda',
                    cnpj: cnpjUtil.format(cnpjUtil.generate(false)),
                    email: 'invalido@teste.com',
                });

            expect(res.status).toBe(403);
            expect(res.body.message).toContain('Super Administradores');
        });
    });

    describe('DELETE /empresas/:id (Integridade Referencial)', () => {
        it('deve bloquear deleção de empresa com 409 se houver motoristas vinculados', async () => {
            const superAdmin = await criarUsuario({ role: 'superAdmin' });
            const empresa = await criarEmpresa();
            await criarUsuario({ empresa_id: empresa._id, role: 'motorista' });

            autenticarComo(superAdmin);
            const res = await request(app)
                .delete(`/empresas/${empresa._id}`);

            expect(res.status).toBe(409);
            expect(res.body.message).toContain('motorista');
            expect(await Empresa.findById(empresa._id)).not.toBeNull();
        });

        it('deve bloquear deleção de empresa com 409 se houver veículos vinculados', async () => {
            const superAdmin = await criarUsuario({ role: 'superAdmin' });
            const empresa = await criarEmpresa();
            await criarVeiculo({ empresa_id: empresa._id });

            autenticarComo(superAdmin);
            const res = await request(app)
                .delete(`/empresas/${empresa._id}`);

            expect(res.status).toBe(409);
            expect(res.body.message).toContain('veículo');
            expect(await Empresa.findById(empresa._id)).not.toBeNull();
        });

        it('deve permitir deleção de empresa sem dependências vinculadas', async () => {
            const superAdmin = await criarUsuario({ role: 'superAdmin' });
            const empresa = await criarEmpresa();

            autenticarComo(superAdmin);
            const res = await request(app)
                .delete(`/empresas/${empresa._id}`);

            expect(res.status).toBe(200);
            expect(await Empresa.findById(empresa._id)).toBeNull();
        });
    });
});
