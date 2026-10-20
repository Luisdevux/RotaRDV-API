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

    describe('POST /empresas/filial (Matriz e Filiais Coligadas)', () => {
        it('deve permitir criação de filial para usuário com role admin vinculando admin_id ao admin', async () => {
            const adminMaster = await criarUsuario({ role: 'admin' });
            const matriz = await criarEmpresa({ admin_id: adminMaster._id });
            adminMaster.empresa_id = matriz._id;
            await adminMaster.save();

            autenticarComo(adminMaster);

            const cnpjFilial = cnpjUtil.format(cnpjUtil.generate(false));
            const emailFilial = `filial_${Date.now()}@transporte.com`;

            const res = await request(app)
                .post('/empresas/filial')
                .send({
                    nome_empresa: 'Transportadora Batista - Filial Porto Velho',
                    cnpj: cnpjFilial,
                    email: emailFilial,
                    telefone: '6932221100',
                    endereco: {
                        cidade: 'Porto Velho',
                        estado: 'RO'
                    }
                });

            expect(res.status).toBe(201);
            expect(res.body.data.nome_empresa).toBe('Transportadora Batista - Filial Porto Velho');
            expect(String(res.body.data.admin_id)).toBe(String(adminMaster._id));

            // Testar se o Admin Master enxerga Matriz e Filial no GET /empresas
            const listRes = await request(app)
                .get('/empresas');

            expect(listRes.status).toBe(200);
            const empresasEncontradas = listRes.body.data.docs || listRes.body.data;
            expect(empresasEncontradas.length).toBe(2);
            const ids = empresasEncontradas.map((e) => String(e._id));
            expect(ids).toContain(String(matriz._id));
            expect(ids).toContain(String(res.body.data._id));
        });

        it('deve bloquear criação de filial para motorista com status 403', async () => {
            const motorista = await criarUsuario({ role: 'motorista' });
            autenticarComo(motorista);

            const res = await request(app)
                .post('/empresas/filial')
                .send({
                    nome_empresa: 'Tentativa Inválida Filial',
                    cnpj: cnpjUtil.format(cnpjUtil.generate(false)),
                    email: 'filial_bloqueada@teste.com'
                });

            expect(res.status).toBe(403);
            expect(res.body.message).toContain('Administradores');
        });
    });

    describe('Filtros e Validação de CNPJ Alfanumérico (IN RFB 2.229/2024)', () => {
        it('deve cadastrar empresa com CNPJ alfanumérico e encontrá-la tanto com filtro formatado quanto limpo ou parcial', async () => {
            const superAdmin = await criarUsuario({ role: 'superAdmin' });
            autenticarComo(superAdmin);

            const cnpjAlfanumerico = '12.ABC.345/0001-88';
            const cadRes = await request(app)
                .post('/empresas')
                .send({
                    nome_empresa: 'Transportes Alfanumérico Express',
                    cnpj: cnpjAlfanumerico,
                    email: 'contato@alfaexpress.com.br',
                });

            expect(cadRes.status).toBe(201);
            expect(cadRes.body.data.cnpj).toBe('12ABC345000188');

            // 1. Buscar filtrando pelo CNPJ formatado
            const buscaFormatada = await request(app)
                .get('/empresas')
                .query({ cnpj: '12.ABC.345/0001-88' });
            expect(buscaFormatada.status).toBe(200);
            expect(buscaFormatada.body.data.docs.length).toBe(1);
            expect(buscaFormatada.body.data.docs[0].nome_empresa).toBe('Transportes Alfanumérico Express');

            // 2. Buscar filtrando pelo CNPJ sem pontuação
            const buscaLimpa = await request(app)
                .get('/empresas')
                .query({ cnpj: '12ABC345000188' });
            expect(buscaLimpa.status).toBe(200);
            expect(buscaLimpa.body.data.docs.length).toBe(1);

            // 3. Buscar filtrando por trecho com letras (case-insensitive)
            const buscaParcial = await request(app)
                .get('/empresas')
                .query({ cnpj: '12abc' });
            expect(buscaParcial.status).toBe(200);
            expect(buscaParcial.body.data.docs.length).toBe(1);

            // 4. Tentativa de cadastrar duplicata com CNPJ alfanumérico deve retornar 400 (Validation Error)
            const dupRes = await request(app)
                .post('/empresas')
                .send({
                    nome_empresa: 'Outra Empresa Mesmo CNPJ',
                    cnpj: '12ABC345000188',
                    email: 'outro@alfaexpress.com.br',
                });
            expect(dupRes.status).toBe(400);
            expect(dupRes.body.message).toContain('CNPJ já');
        });
    });
});

