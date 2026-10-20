// src/test/services/DespesaService.test.js

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { cpf as cpfUtil } from 'cpf-cnpj-validator';

import DespesaService from '../../services/DespesaService.js';
import Usuario from '../../models/Usuario.js';
import Viagem from '../../models/Viagem.js';
import Despesa from '../../models/Despesa.js';
import DespesaAbastecimento from '../../models/DespesaAbastecimento.js';
import DespesaAlimentacao from '../../models/DespesaAlimentacao.js';
import CustomError from '../../utils/helpers/CustomError.js';

let service;
let contador = 1;

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
    service = new DespesaService();
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

describe('Unitário: DespesaService (Regras de Negócio de Despesas)', () => {
    describe('Criação de Despesa', () => {
        it('deve registrar despesa com sucesso quando os dados forem válidos', async () => {
            const empresaId = new mongoose.Types.ObjectId();
            const motorista = await criarUsuario({ empresa_id: empresaId });
            const viagem = await criarViagem({ usuario_id: motorista._id, empresa_id: empresaId });

            const payload = {
                viagem_id: viagem._id,
                tipo: 'ALIMENTACAO',
                valor_total: 45,
                data: new Date(),
                tipo_refeicao: 'Almoço',
                local: 'Posto Rodovia',
            };

            const despesaCriada = await service.criar(payload, { user_id: motorista._id });
            expect(despesaCriada).toBeDefined();
            expect(despesaCriada.tipo).toBe('ALIMENTACAO');
            expect(despesaCriada.valor_total).toBe(45);
        });

        it('deve lançar CustomError 404 se a viagem vinculada não existir', async () => {
            const motorista = await criarUsuario();
            const payload = {
                viagem_id: crypto.randomUUID(),
                tipo: 'ALIMENTACAO',
                valor_total: 45,
                data: new Date(),
            };

            let erro;
            try {
                await service.criar(payload, { user_id: motorista._id });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(404);
            expect(erro.errorType).toBe('resourceNotFound');
        });

        it('deve lançar CustomError 403 se o motorista tentar lançar despesa em viagem de outro motorista', async () => {
            const motorista1 = await criarUsuario();
            const motorista2 = await criarUsuario();
            const viagemMotorista2 = await criarViagem({ usuario_id: motorista2._id });

            const payload = {
                viagem_id: viagemMotorista2._id,
                tipo: 'ALIMENTACAO',
                valor_total: 50,
                data: new Date(),
            };

            let erro;
            try {
                await service.criar(payload, { user_id: motorista1._id });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(403);
            expect(erro.errorType).toBe('forbidden');
        });

        it('deve lançar CustomError 400 se a viagem estiver com status cancelada', async () => {
            const motorista = await criarUsuario();
            const viagemCancelada = await criarViagem({
                usuario_id: motorista._id,
                status: 'cancelada',
            });

            const payload = {
                viagem_id: viagemCancelada._id,
                tipo: 'ALIMENTACAO',
                valor_total: 50,
                data: new Date(),
            };

            let erro;
            try {
                await service.criar(payload, { user_id: motorista._id });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(400);
            expect(erro.errorType).toBe('validation');
            expect(erro.field).toBe('viagem_id');
        });
    });

    describe('Exclusão de Despesa', () => {
        it('deve lançar CustomError 400 ao tentar excluir despesa vinculada a viagem concluída', async () => {
            const motorista = await criarUsuario();
            const viagemConcluida = await criarViagem({
                usuario_id: motorista._id,
                status: 'concluída',
                km_final: 25000,
            });

            const despesa = await criarDespesa('ALIMENTACAO', { viagem_id: viagemConcluida._id });

            let erro;
            try {
                await service.deletar(despesa._id, { user_id: motorista._id });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(400);
            expect(erro.errorType).toBe('validation');
            expect(await Despesa.findById(despesa._id)).not.toBeNull();
        });

        it('deve permitir exclusão de despesa vinculada a viagem em andamento', async () => {
            const motorista = await criarUsuario();
            const viagemAtiva = await criarViagem({
                usuario_id: motorista._id,
                status: 'em_andamento',
            });

            const despesa = await criarDespesa('ALIMENTACAO', { viagem_id: viagemAtiva._id });

            const res = await service.deletar(despesa._id, { user_id: motorista._id });
            expect(res).toBeDefined();
            expect(await Despesa.findById(despesa._id)).toBeNull();
        });
    });
});
