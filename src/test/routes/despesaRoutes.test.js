// src/test/routes/despesaRoutes.test.js

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { cpf as cpfUtil } from 'cpf-cnpj-validator';

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

import despesaRoutes from '../../routes/despesaRoutes.js';
import Usuario from '../../models/Usuario.js';
import Viagem from '../../models/Viagem.js';
import Despesa from '../../models/Despesa.js';
import DespesaAbastecimento from '../../models/DespesaAbastecimento.js';
import DespesaAlimentacao from '../../models/DespesaAlimentacao.js';
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
        nome: `Motorista ${id}`,
        email: `motorista${id}_${Date.now()}@teste.com`,
        senha: 'hash_senha_teste_123',
        cpf: cpfUtil.generate(false),
        cnh: `${Math.floor(10000000000 + Math.random() * 90000000000)}`,
        telefone: '11988887777',
        status: 'ativo',
        role: 'motorista',
        email_verificado: true,
        authProvider: 'local',
        empresa_id: new mongoose.Types.ObjectId(),
        ...extra,
    });
}

async function criarViagem(extra = {}) {
    return await Viagem.create({
        _id: crypto.randomUUID(),
        usuario_id: extra.usuario_id || new mongoose.Types.ObjectId(),
        veiculo_id: extra.veiculo_id || new mongoose.Types.ObjectId(),
        origem: { cidade: 'Curitiba', estado: 'PR' },
        destino: { cidade: 'Florianópolis', estado: 'SC' },
        km_inicial: 20000,
        status: 'em_andamento',
        data_inicio: new Date('2026-01-01T00:00:00.000Z'),
        usuario_snapshot: { nome: 'Motorista', email: 'motorista@teste.com' },
        veiculo_snapshot: { placa: 'ABC1D23', modelo: 'Volvo FH 540' },
        empresa_id: new mongoose.Types.ObjectId(),
        ...extra,
    });
}

async function criarDespesa(tipo, extra = {}) {
    const base = {
        _id: crypto.randomUUID(),
        tipo,
        valor_total: 100,
        data: new Date(),
        local: 'Posto Rodoviário',
        descricao: 'Teste',
        ...extra,
    };

    if (tipo === 'ABASTECIMENTO') {
        return await DespesaAbastecimento.create({
            ...base,
            litros: extra.litros || 100,
            valor_litro: extra.valor_litro || 6.00,
            valor_total: extra.valor_total || 600,
            tipo_combustivel: extra.tipo_combustivel || 'DIESEL_S10',
            km_atual: extra.km_atual || 20500,
        });
    }

    if (tipo === 'ALIMENTACAO') {
        return await DespesaAlimentacao.create({
            ...base,
            tipo_refeicao: extra.tipo_refeicao || 'Almoço',
            valor_total: extra.valor_total || 60,
        });
    }

    return await Despesa.create(base);
}

beforeAll(async () => {
    await mongoose.connect(process.env.DB_URL);

    app = express();
    app.use(express.json());
    app.use(despesaRoutes);
    app.use(errorHandler);
});

afterEach(async () => {
    if (mongoose.connection.readyState === 1) {
        await Promise.all([
            Usuario.deleteMany({}),
            Viagem.deleteMany({}),
            Despesa.deleteMany({}),
        ]);
    }
});

afterAll(async () => {
    await mongoose.disconnect();
});

describe('Rotas de Despesas (despesaRoutes)', () => {
    describe('POST /despesas (Polimorfismo e Regras de Negócio)', () => {
        it('deve registrar despesa de ALIMENTACAO vinculada à viagem em andamento', async () => {
            const empresaId = new mongoose.Types.ObjectId();
            const motorista = await criarUsuario({ empresa_id: empresaId });
            const viagem = await criarViagem({ usuario_id: motorista._id, empresa_id: empresaId });
            autenticarComo(motorista);

            const res = await request(app)
                .post('/despesas')
                .send({
                    viagem_id: viagem._id,
                    tipo: 'ALIMENTACAO',
                    valor_total: 55.90,
                    data: new Date(),
                    tipo_refeicao: 'Almoço',
                    local: 'Restaurante Estrada Velha',
                });

            expect(res.status).toBe(201);
            expect(res.body.data.tipo).toBe('ALIMENTACAO');
            expect(res.body.data.valor_total).toBe(55.90);
        });

        it('deve registrar despesa de ABASTECIMENTO com consistência de cálculo e odômetro', async () => {
            const empresaId = new mongoose.Types.ObjectId();
            const motorista = await criarUsuario({ empresa_id: empresaId });
            const viagem = await criarViagem({
                usuario_id: motorista._id,
                empresa_id: empresaId,
                km_inicial: 20000,
            });
            autenticarComo(motorista);

            const res = await request(app)
                .post('/despesas')
                .send({
                    viagem_id: viagem._id,
                    tipo: 'ABASTECIMENTO',
                    litros: 150,
                    valor_litro: 6.20,
                    valor_total: 930, // 150 * 6.20 = 930
                    tipo_combustivel: 'DIESEL_S10',
                    km_atual: 20450, // Maior que km_inicial (20000)
                    data: new Date(),
                    local: 'Posto Ipiranga Rodoanel',
                });

            expect(res.status).toBe(201);
            expect(res.body.data.tipo).toBe('ABASTECIMENTO');
            expect(res.body.data.litros).toBe(150);
            expect(res.body.data.km_atual).toBe(20450);
        });

        it('deve rejeitar despesa se a viagem estiver com status cancelada', async () => {
            const empresaId = new mongoose.Types.ObjectId();
            const motorista = await criarUsuario({ empresa_id: empresaId });
            const viagemCancelada = await criarViagem({
                usuario_id: motorista._id,
                empresa_id: empresaId,
                status: 'cancelada',
            });
            autenticarComo(motorista);

            const res = await request(app)
                .post('/despesas')
                .send({
                    viagem_id: viagemCancelada._id,
                    tipo: 'ALIMENTACAO',
                    valor_total: 40,
                    data: new Date(),
                    tipo_refeicao: 'Lanche',
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('cancelada');
        });

        it('deve rejeitar abastecimento com odômetro menor que o KM inicial da viagem', async () => {
            const empresaId = new mongoose.Types.ObjectId();
            const motorista = await criarUsuario({ empresa_id: empresaId });
            const viagem = await criarViagem({
                usuario_id: motorista._id,
                empresa_id: empresaId,
                km_inicial: 30000,
            });
            autenticarComo(motorista);

            const res = await request(app)
                .post('/despesas')
                .send({
                    viagem_id: viagem._id,
                    tipo: 'ABASTECIMENTO',
                    litros: 100,
                    valor_litro: 6.00,
                    valor_total: 600,
                    tipo_combustivel: 'DIESEL_S10',
                    km_atual: 29500, // Menor que 30000
                    data: new Date(),
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('KM inicial');
        });

        it('deve rejeitar abastecimento com divergência entre valor total e litros * valor_litro', async () => {
            const empresaId = new mongoose.Types.ObjectId();
            const motorista = await criarUsuario({ empresa_id: empresaId });
            const viagem = await criarViagem({
                usuario_id: motorista._id,
                empresa_id: empresaId,
                km_inicial: 30000,
            });
            autenticarComo(motorista);

            const res = await request(app)
                .post('/despesas')
                .send({
                    viagem_id: viagem._id,
                    tipo: 'ABASTECIMENTO',
                    litros: 100,
                    valor_litro: 6.00,
                    valor_total: 800, // Inconsistente (100 * 6 = 600 != 800)
                    tipo_combustivel: 'DIESEL_S10',
                    km_atual: 30200,
                    data: new Date(),
                });

            expect(res.status).toBe(400);
            expect(res.body.errors[0].path).toBe('valor_total');
            expect(res.body.errors[0].message).toContain('não confere');
        });
    });

    describe('DELETE /despesas/:id (Travamento em Viagens Concluídas)', () => {
        it('deve bloquear exclusão de despesa se a viagem já estiver com status concluída', async () => {
            const empresaId = new mongoose.Types.ObjectId();
            const motorista = await criarUsuario({ empresa_id: empresaId });
            const viagemConcluida = await criarViagem({
                usuario_id: motorista._id,
                empresa_id: empresaId,
                status: 'concluída',
            });

            const despesa = await criarDespesa('ALIMENTACAO', {
                viagem_id: viagemConcluida._id,
            });

            autenticarComo(motorista);
            const res = await request(app)
                .delete(`/despesas/${despesa._id}`);

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('concluída');
            expect(await Despesa.findById(despesa._id)).not.toBeNull();
        });

        it('deve permitir exclusão de despesa se a viagem estiver em andamento', async () => {
            const empresaId = new mongoose.Types.ObjectId();
            const motorista = await criarUsuario({ empresa_id: empresaId });
            const viagemAtiva = await criarViagem({
                usuario_id: motorista._id,
                empresa_id: empresaId,
                status: 'em_andamento',
            });

            const despesa = await criarDespesa('ALIMENTACAO', {
                viagem_id: viagemAtiva._id,
            });

            autenticarComo(motorista);
            const res = await request(app)
                .delete(`/despesas/${despesa._id}`);

            expect(res.status).toBe(200);
            expect(await Despesa.findById(despesa._id)).toBeNull();
        });

        it('deve bloquear IDOR em GET /despesas/:id quando solicitada por outro motorista', async () => {
            const empresaId = new mongoose.Types.ObjectId();
            const motoristaA = await criarUsuario({ empresa_id: empresaId });
            const motoristaB = await criarUsuario({ empresa_id: empresaId });
            const viagemA = await criarViagem({
                usuario_id: motoristaA._id,
                empresa_id: empresaId,
            });
            const despesaA = await criarDespesa('ALIMENTACAO', { viagem_id: viagemA._id });

            autenticarComo(motoristaB);
            const resIntruso = await request(app).get(`/despesas/${despesaA._id}`);
            expect(resIntruso.status).toBe(403);

            autenticarComo(motoristaA);
            const resDono = await request(app).get(`/despesas/${despesaA._id}`);
            expect(resDono.status).toBe(200);
            expect(resDono.body.data._id).toBe(despesaA._id);
        });
    });
});
