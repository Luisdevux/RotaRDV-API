// src/test/routes/syncRoutes.test.js

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { cpf as cpfUtil } from 'cpf-cnpj-validator';

vi.mock('../../middlewares/RateLimitMiddleware.js', () => ({
    strictRateLimit: (req, res, next) => next(),
    authRateLimit: (req, res, next) => next(),
    publicRateLimit: (req, res, next) => next(),
}));

import syncRoutes from '../../routes/syncRoutes.js';
import Usuario from '../../models/Usuario.js';
import Veiculo from '../../models/Veiculo.js';
import Viagem from '../../models/Viagem.js';
import Despesa from '../../models/Despesa.js';
import '../../models/DespesaAbastecimento.js';
import '../../models/DespesaAlimentacao.js';
import '../../models/DespesaManutencao.js';
import '../../models/DespesaPedagio.js';
import errorHandler from '../../utils/helpers/errorHandler.js';

let app;
let contador = 1;

function gerarTokenAcesso(userId) {
    return jwt.sign({ id: String(userId) }, process.env.JWT_SECRET_ACCESS_TOKEN, { expiresIn: '30m' });
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
        refreshtoken: 'fake_refresh_token',
        ...extra,
    });
}

async function criarVeiculo(extra = {}) {
    const id = contador++;
    return await Veiculo.create({
        placa: `ABC${id % 10}D${(id + 1) % 100}`.padEnd(7, '0'),
        modelo: 'Volvo FH 540',
        ano_fabricacao: 2023,
        combustivel_preferencial: 'DIESEL_S10',
        status: 'ativo',
        ...extra,
    });
}

function viagemPayload(usuarioId, veiculoId, extra = {}) {
    return {
        _id: crypto.randomUUID(),
        usuario_id: String(usuarioId),
        veiculo_id: String(veiculoId),
        origem: { cidade: 'São Paulo', estado: 'SP' },
        destino: { cidade: 'Curitiba', estado: 'PR' },
        km_inicial: 50000,
        status: 'em_andamento',
        data_inicio: new Date(),
        usuario_snapshot: null,
        veiculo_snapshot: { placa: 'ABC1D23', modelo: 'Volvo FH 540' },
        ...extra,
    };
}

function despesaPayload(tipo, viagemId, extra = {}) {
    const base = {
        _id: crypto.randomUUID(),
        viagem_id: String(viagemId),
        tipo,
        valor_total: 100,
        data: new Date(),
        local: 'Posto Graal Rodovia BR-116',
        descricao: 'Despesa de teste',
        foto_anexo: '',
        ...extra,
    };

    if (tipo === 'ABASTECIMENTO') {
        return {
            ...base,
            litros: 100,
            valor_litro: 6.00,
            valor_total: 600,
            tipo_combustivel: 'DIESEL_S10',
            km_atual: 50300,
            ...extra,
        };
    }

    if (tipo === 'ALIMENTACAO') {
        return {
            ...base,
            tipo_refeicao: 'Almoço',
            valor_total: 45,
            ...extra,
        };
    }

    return base;
}

beforeAll(async () => {
    process.env.JWT_SECRET_ACCESS_TOKEN = 'secret_access_test_32chars_long!';
    process.env.JWT_SECRET_REFRESH_TOKEN = 'secret_refresh_test_32chars_long';
    process.env.JWT_ACCESS_TOKEN_EXPIRATION = '30m';
    process.env.JWT_REFRESH_TOKEN_EXPIRATION = '30d';

    await mongoose.connect(process.env.DB_URL);

    app = express();
    app.use(express.json());
    app.use(syncRoutes);
    app.use(errorHandler);
});

afterEach(async () => {
    if (mongoose.connection.readyState === 1) {
        await Promise.all([
            Usuario.deleteMany({}),
            Veiculo.deleteMany({}),
            Viagem.deleteMany({}),
            Despesa.deleteMany({}),
        ]);
    }
});

afterAll(async () => {
    await mongoose.disconnect();
});

describe('Rotas de Sincronização Offline-First (syncRoutes)', () => {
    describe('Segurança e Autenticação JWT', () => {
        it('deve retornar status 498 sem cabeçalho Authorization', async () => {
            const res = await request(app)
                .post('/sync/push')
                .send({ viagens: [], despesas: [] });

            expect(res.status).toBe(498);
        });

        it('deve retornar status 498 com token inválido', async () => {
            const res = await request(app)
                .get('/sync/pull')
                .set('Authorization', 'Bearer token_invalido');

            expect(res.status).toBe(498);
        });
    });

    describe('POST /sync/push', () => {
        it('deve persistir lote de viagem e despesas com discriminadores e autopreenchimento de snapshot', async () => {
            const veiculo = await criarVeiculo({ odometro: 10000 });
            const motorista = await criarUsuario({ veiculo_id: veiculo._id });
            const token = gerarTokenAcesso(motorista._id);

            const vPayload = viagemPayload(motorista._id, veiculo._id, { km_inicial: 10000 });
            const dAbastecimento = despesaPayload('ABASTECIMENTO', vPayload._id, {
                km_atual: 10400,
                litros: 150,
                valor_litro: 6.00,
                valor_total: 900,
            });
            const dAlimentacao = despesaPayload('ALIMENTACAO', vPayload._id);

            const res = await request(app)
                .post('/sync/push')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    viagens: [vPayload],
                    despesas: [dAbastecimento, dAlimentacao],
                });

            expect(res.status).toBe(200);
            expect(res.body.data.viagensUpserted).toBe(1);
            expect(res.body.data.despesasUpserted).toBe(2);
            expect(res.body.data.rejeitados).toHaveLength(0);

            // Validação no MongoDB
            const viagemSalva = await Viagem.findById(vPayload._id);
            expect(viagemSalva).toBeDefined();
            expect(viagemSalva.usuario_snapshot.nome).toBe(motorista.nome);

            const abastecimentoSalvo = await Despesa.findById(dAbastecimento._id);
            expect(abastecimentoSalvo).toBeDefined();
            expect(abastecimentoSalvo.tipo).toBe('ABASTECIMENTO');
            expect(abastecimentoSalvo.litros).toBe(150);
        });

        it('deve rejeitar despesa inválida sem abortar as demais operações do lote', async () => {
            const veiculo = await criarVeiculo({ odometro: 20000 });
            const motorista = await criarUsuario({ veiculo_id: veiculo._id });
            const token = gerarTokenAcesso(motorista._id);

            const vPayload = viagemPayload(motorista._id, veiculo._id, { km_inicial: 20000 });
            const dInvalidaDataFutura = despesaPayload('ALIMENTACAO', vPayload._id, {
                data: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 dias no futuro
            });
            const dValida = despesaPayload('ALIMENTACAO', vPayload._id, { valor_total: 60 });

            const res = await request(app)
                .post('/sync/push')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    viagens: [vPayload],
                    despesas: [dInvalidaDataFutura, dValida],
                });

            expect(res.status).toBe(200);
            expect(res.body.data.viagensUpserted).toBe(1);
            expect(res.body.data.despesasUpserted).toBe(1);
            expect(res.body.data.rejeitados).toHaveLength(1);
            expect(res.body.data.rejeitados[0].id).toBe(dInvalidaDataFutura._id);
            expect(res.body.data.rejeitados[0].campo).toBe('data');
        });

        it('deve garantir imutabilidade de despesa através de $setOnInsert', async () => {
            const veiculo = await criarVeiculo({ odometro: 30000 });
            const motorista = await criarUsuario({ veiculo_id: veiculo._id });
            const token = gerarTokenAcesso(motorista._id);

            const vPayload = viagemPayload(motorista._id, veiculo._id, { km_inicial: 30000 });
            const dPayload = despesaPayload('ALIMENTACAO', vPayload._id, { valor_total: 50 });

            // Primeiro push
            await request(app)
                .post('/sync/push')
                .set('Authorization', `Bearer ${token}`)
                .send({ viagens: [vPayload], despesas: [dPayload] });

            // Segundo push tentando alterar valor de 50 para 999
            dPayload.valor_total = 999;
            await request(app)
                .post('/sync/push')
                .set('Authorization', `Bearer ${token}`)
                .send({ viagens: [], despesas: [dPayload] });

            const despesaNoBanco = await Despesa.findById(dPayload._id);
            expect(despesaNoBanco.valor_total).toBe(50);
        });

        it('deve processar exclusão lógica via is_deleted: true', async () => {
            const veiculo = await criarVeiculo({ odometro: 40000 });
            const motorista = await criarUsuario({ veiculo_id: veiculo._id });
            const token = gerarTokenAcesso(motorista._id);

            const vPayload = viagemPayload(motorista._id, veiculo._id, { km_inicial: 40000 });
            const dPayload = despesaPayload('ALIMENTACAO', vPayload._id);

            // Cria viagem e despesa
            await request(app)
                .post('/sync/push')
                .set('Authorization', `Bearer ${token}`)
                .send({ viagens: [vPayload], despesas: [dPayload] });

            expect(await Despesa.findById(dPayload._id)).not.toBeNull();

            // Envia deleção
            const res = await request(app)
                .post('/sync/push')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    viagens: [],
                    despesas: [{ _id: dPayload._id, viagem_id: vPayload._id, is_deleted: true }],
                });

            expect(res.status).toBe(200);
            expect(res.body.data.despesasDeleted).toBe(1);
            expect(await Despesa.findById(dPayload._id)).toBeNull();
        });
    });

    describe('GET /sync/pull', () => {
        it('deve isolar os dados por motorista e aplicar filtro delta updatedAfter', async () => {
            const motoristaA = await criarUsuario();
            const motoristaB = await criarUsuario();
            const tokenA = gerarTokenAcesso(motoristaA._id);

            // Dados antigos do Motorista A (2 horas atrás)
            const dataAntiga = new Date(Date.now() - 7200000);
            const snapshotA = { nome: motoristaA.nome, email: motoristaA.email };
            const viagemAntiga = await Viagem.create(viagemPayload(motoristaA._id, new mongoose.Types.ObjectId(), { usuario_snapshot: snapshotA }));
            await Viagem.collection.updateOne({ _id: viagemAntiga._id }, { $set: { updatedAt: dataAntiga } });

            // Dados recentes do Motorista A
            const viagemRecente = await Viagem.create(viagemPayload(motoristaA._id, new mongoose.Types.ObjectId(), { usuario_snapshot: snapshotA }));

            // Dados do Motorista B
            const snapshotB = { nome: motoristaB.nome, email: motoristaB.email };
            const viagemB = await Viagem.create(viagemPayload(motoristaB._id, new mongoose.Types.ObjectId(), { usuario_snapshot: snapshotB }));

            // Pull geral do Motorista A: deve trazer 2 viagens (antiga e recente) e NÃO trazer a do motorista B
            const pullGeral = await request(app)
                .get('/sync/pull')
                .set('Authorization', `Bearer ${tokenA}`);

            expect(pullGeral.status).toBe(200);
            expect(pullGeral.body.data.viagens).toHaveLength(2);
            expect(pullGeral.body.data.viagens.some(v => v._id === viagemB._id)).toBe(false);

            // Pull delta com corte de 1 hora atrás: deve trazer apenas a viagem recente
            const corteUmaHora = new Date(Date.now() - 3600000).toISOString();
            const pullDelta = await request(app)
                .get(`/sync/pull?updatedAfter=${encodeURIComponent(corteUmaHora)}`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(pullDelta.status).toBe(200);
            expect(pullDelta.body.data.viagens).toHaveLength(1);
            expect(pullDelta.body.data.viagens[0]._id).toBe(viagemRecente._id);
        });
    });
});
