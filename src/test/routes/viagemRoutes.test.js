// src/test/routes/syncRoutes.test.js

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
import viagemRoutes from '../../routes/viagemRoutes.js';
import Usuario from '../../models/Usuario.js';
import Veiculo from '../../models/Veiculo.js';
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

async function criarVeiculo(extra = {}) {
    const id = contador++;
    return await Veiculo.create({
        placa: `ABC${id % 10}D${(id + 1) % 100}`.padEnd(7, '0'),
        modelo: 'Volvo FH 540',
        ano_fabricacao: 2023,
        combustivel_preferencial: 'DIESEL_S10',
        status: 'ativo',
        empresa_id: new mongoose.Types.ObjectId(),
        ...extra,
    });
}

async function criarViagem(extra = {}) {
    return await Viagem.create({
        _id: crypto.randomUUID(),
        usuario_id: extra.usuario_id || new mongoose.Types.ObjectId(),
        veiculo_id: extra.veiculo_id || new mongoose.Types.ObjectId(),
        origem: { cidade: 'São Paulo', estado: 'SP' },
        destino: { cidade: 'Curitiba', estado: 'PR' },
        km_inicial: 50000,
        status: 'em_andamento',
        data_inicio: new Date(),
        usuario_snapshot: { nome: 'Motorista', email: 'motorista@teste.com' },
        veiculo_snapshot: { placa: 'ABC1D23', modelo: 'Volvo FH 540' },
        ...extra,
    });
}

async function criarDespesa(tipo, extra = {}) {
    const base = {
        _id: crypto.randomUUID(),
        tipo,
        valor_total: 100,
        data: new Date(),
        local: 'Posto Graal',
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
            km_atual: extra.km_atual || 50300,
        });
    }

    if (tipo === 'ALIMENTACAO') {
        return await DespesaAlimentacao.create({
            ...base,
            tipo_refeicao: extra.tipo_refeicao || 'Almoço',
            valor_total: extra.valor_total || 50,
        });
    }

    return await Despesa.create(base);
}

beforeAll(async () => {
    await mongoose.connect(process.env.DB_URL);

    app = express();
    app.use(express.json());
    app.use(viagemRoutes);
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

describe('Rotas de Viagens (viagemRoutes)', () => {
    describe('POST /viagens (Regras de Concorrência e Odômetro)', () => {
        it('deve criar viagem com sucesso e congelar snapshots do motorista e veículo', async () => {
            const empresaId = new mongoose.Types.ObjectId();
            const veiculo = await criarVeiculo({ empresa_id: empresaId });
            const motorista = await criarUsuario({ empresa_id: empresaId, veiculo_id: veiculo._id });
            autenticarComo(motorista);

            const res = await request(app)
                .post('/viagens')
                .send({
                    usuario_id: motorista._id,
                    veiculo_id: veiculo._id,
                    origem: { cidade: 'São Paulo', estado: 'SP' },
                    destino: { cidade: 'Joinville', estado: 'SC' },
                    data_inicio: new Date(),
                    km_inicial: 45000,
                });

            expect(res.status).toBe(201);
            expect(res.body.data._id).toBeDefined();
            expect(res.body.data.status).toBe('em_andamento');
            expect(res.body.data.usuario_snapshot.nome).toBe(motorista.nome);
            expect(res.body.data.veiculo_snapshot.placa).toBe(veiculo.placa);
        });

        it('deve rejeitar com 409 se o motorista já possuir uma viagem em andamento', async () => {
            const empresaId = new mongoose.Types.ObjectId();
            const veiculo = await criarVeiculo({ empresa_id: empresaId });
            const motorista = await criarUsuario({ empresa_id: empresaId });
            autenticarComo(motorista);

            // Viagem 1 ativa
            await criarViagem({
                usuario_id: motorista._id,
                veiculo_id: veiculo._id,
                empresa_id: empresaId,
                status: 'em_andamento',
            });

            // Tentativa de criar Viagem 2
            const res = await request(app)
                .post('/viagens')
                .send({
                    usuario_id: motorista._id,
                    veiculo_id: veiculo._id,
                    origem: { cidade: 'Curitiba', estado: 'PR' },
                    destino: { cidade: 'Porto Alegre', estado: 'RS' },
                    data_inicio: new Date(),
                    km_inicial: 50000,
                });

            expect(res.status).toBe(409);
            expect(res.body.message).toContain('em andamento');
        });

        it('deve rejeitar com 409 se o veículo já estiver em uso em outra viagem ativa', async () => {
            const empresaId = new mongoose.Types.ObjectId();
            const veiculo = await criarVeiculo({ empresa_id: empresaId });
            const motorista1 = await criarUsuario({ empresa_id: empresaId });
            const motorista2 = await criarUsuario({ empresa_id: empresaId });

            // Motorista 1 está usando o veículo
            await criarViagem({
                usuario_id: motorista1._id,
                veiculo_id: veiculo._id,
                empresa_id: empresaId,
                status: 'em_andamento',
            });

            // Motorista 2 tenta iniciar viagem com o mesmo veículo
            autenticarComo(motorista2);
            const res = await request(app)
                .post('/viagens')
                .send({
                    usuario_id: motorista2._id,
                    veiculo_id: veiculo._id,
                    origem: { cidade: 'Campinas', estado: 'SP' },
                    destino: { cidade: 'Santos', estado: 'SP' },
                    data_inicio: new Date(),
                    km_inicial: 50000,
                });

            expect(res.status).toBe(409);
            expect(res.body.message).toContain('já está sendo utilizado');
        });

        it('deve rejeitar com 400 regressão de odômetro em relação ao histórico do veículo', async () => {
            const empresaId = new mongoose.Types.ObjectId();
            const veiculo = await criarVeiculo({ empresa_id: empresaId });
            const motorista = await criarUsuario({ empresa_id: empresaId });
            autenticarComo(motorista);

            // Viagem anterior concluída com km_final = 70000
            await criarViagem({
                usuario_id: motorista._id,
                veiculo_id: veiculo._id,
                empresa_id: empresaId,
                status: 'concluída',
                km_inicial: 68000,
                km_final: 70000,
                data_fim: new Date(),
            });

            // Tentativa de criar nova viagem com km_inicial = 65000 (< 70000)
            const res = await request(app)
                .post('/viagens')
                .send({
                    usuario_id: motorista._id,
                    veiculo_id: veiculo._id,
                    origem: { cidade: 'Rio de Janeiro', estado: 'RJ' },
                    destino: { cidade: 'Vitória', estado: 'ES' },
                    data_inicio: new Date(),
                    km_inicial: 65000,
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('KM inicial');
        });
    });

    describe('Encerramento e Auditoria de Métricas Financeiras', () => {
        it('deve encerrar viagem e calcular resumo com médias de consumo na consulta', async () => {
            const empresaId = new mongoose.Types.ObjectId();
            const veiculo = await criarVeiculo({ empresa_id: empresaId, odometro: 10000 });
            const motorista = await criarUsuario({ empresa_id: empresaId });
            autenticarComo(motorista);

            const viagem = await criarViagem({
                usuario_id: motorista._id,
                veiculo_id: veiculo._id,
                empresa_id: empresaId,
                km_inicial: 10000,
                status: 'em_andamento',
            });

            // Lança 2 abastecimentos e 1 refeição
            await criarDespesa('ABASTECIMENTO', {
                viagem_id: viagem._id,
                litros: 100,
                valor_total: 600,
                km_atual: 10250,
            });
            await criarDespesa('ABASTECIMENTO', {
                viagem_id: viagem._id,
                litros: 100,
                valor_total: 600,
                km_atual: 10500,
            });
            await criarDespesa('ALIMENTACAO', {
                viagem_id: viagem._id,
                valor_total: 80,
            });

            // Encerra a viagem (km_final = 10600 -> 600 km percorridos, 200 litros = 3.00 km/l)
            const patchRes = await request(app)
                .patch(`/viagens/${viagem._id}`)
                .send({
                    status: 'concluída',
                    km_final: 10600,
                });

            expect(patchRes.status).toBe(200);
            expect(patchRes.body.data.status).toBe('concluída');

            // Consulta individual da viagem para verificar o resumo financeiro dinâmico
            const getRes = await request(app)
                .get(`/viagens/${viagem._id}`);

            expect(getRes.status).toBe(200);
            const resumo = getRes.body.data.resumo_financeiro;
            expect(resumo).toBeDefined();
            expect(resumo.total_geral).toBe(1280);
            expect(resumo.por_categoria.ABASTECIMENTO).toBe(1200);
            expect(resumo.por_categoria.ALIMENTACAO).toBe(80);
            expect(resumo.metricas.km_percorrido).toBe(600);
            expect(resumo.metricas.total_litros).toBe(200);
            expect(resumo.metricas.media_consumo).toBe(3);
        });

        it('deve impedir que motorista delete viagens (apenas admin pode deletar)', async () => {
            const empresaId = new mongoose.Types.ObjectId();
            const motorista = await criarUsuario({ role: 'motorista', empresa_id: empresaId });
            const viagem = await criarViagem({ usuario_id: motorista._id, empresa_id: empresaId });

            // Motorista tenta deletar
            autenticarComo(motorista);
            const deleteMotoristaRes = await request(app)
                .delete(`/viagens/${viagem._id}`);

            expect(deleteMotoristaRes.status).toBe(403);

            // Admin deleta
            const admin = await criarUsuario({ role: 'admin', empresa_id: empresaId });
            autenticarComo(admin);
            const deleteAdminRes = await request(app)
                .delete(`/viagens/${viagem._id}`);

            expect(deleteAdminRes.status).toBe(200);
            expect(await Viagem.findById(viagem._id)).toBeNull();
        });
    });
});
