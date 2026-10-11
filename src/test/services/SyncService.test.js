// src/test/services/SyncService.test.js

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { cpf as cpfUtil } from 'cpf-cnpj-validator';

import SyncService from '../../services/SyncService.js';
import Usuario from '../../models/Usuario.js';
import Veiculo from '../../models/Veiculo.js';
import Viagem from '../../models/Viagem.js';
import Despesa from '../../models/Despesa.js';
import '../../models/DespesaAbastecimento.js';
import '../../models/DespesaAlimentacao.js';
import '../../models/DespesaManutencao.js';
import '../../models/DespesaPedagio.js';

let service;
let contador = 1;

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
        local: 'Posto Graal',
        descricao: 'Teste',
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
    await mongoose.connect(process.env.DB_URL);
    service = new SyncService();
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

describe('Unitário: SyncService (Motor de Sincronização Offline-First)', () => {
    describe('Push Sync (Processamento em Lote)', () => {
        it('deve sincronizar com sucesso lote de viagens e despesas válidas e autopreencher snapshot', async () => {
            const veiculo = await criarVeiculo({ odometro: 10000 });
            const motorista = await criarUsuario({ veiculo_id: veiculo._id });

            const vPayload = viagemPayload(motorista._id, veiculo._id, { km_inicial: 10000 });
            const dAbastecimento = despesaPayload('ABASTECIMENTO', vPayload._id, {
                km_atual: 10400,
                litros: 100,
                valor_litro: 6.00,
                valor_total: 600,
            });
            const dAlimentacao = despesaPayload('ALIMENTACAO', vPayload._id);

            const resultado = await service.pushSync(
                motorista,
                [vPayload],
                [dAbastecimento, dAlimentacao]
            );

            expect(resultado.viagensUpserted).toBe(1);
            expect(resultado.despesasUpserted).toBe(2);
            expect(resultado.rejeitados).toHaveLength(0);

            const viagemSalva = await Viagem.findById(vPayload._id);
            expect(viagemSalva.usuario_snapshot.nome).toBe(motorista.nome);
        });

        it('deve rejeitar despesa de viagem inexistente sem abortar o restante do lote', async () => {
            const veiculo = await criarVeiculo();
            const motorista = await criarUsuario({ veiculo_id: veiculo._id });

            const vValida = viagemPayload(motorista._id, veiculo._id);
            const dValida = despesaPayload('ALIMENTACAO', vValida._id);
            const dInvalidaViagem = despesaPayload('ALIMENTACAO', crypto.randomUUID());

            const resultado = await service.pushSync(
                motorista,
                [vValida],
                [dValida, dInvalidaViagem]
            );

            expect(resultado.viagensUpserted).toBe(1);
            expect(resultado.despesasUpserted).toBe(1);
            expect(resultado.rejeitados).toHaveLength(1);
            expect(resultado.rejeitados[0].id).toBe(dInvalidaViagem._id);
            expect(resultado.rejeitados[0].campo).toBe('viagem_id');
        });

        it('deve garantir imutabilidade de despesas através de $setOnInsert', async () => {
            const veiculo = await criarVeiculo();
            const motorista = await criarUsuario({ veiculo_id: veiculo._id });

            const vPayload = viagemPayload(motorista._id, veiculo._id);
            const dPayload = despesaPayload('ALIMENTACAO', vPayload._id, { valor_total: 50 });

            // Primeiro push
            await service.pushSync(motorista, [vPayload], [dPayload]);

            // Segundo push tentando alterar valor
            dPayload.valor_total = 999;
            await service.pushSync(motorista, [], [dPayload]);

            const despesaNoBanco = await Despesa.findById(dPayload._id);
            expect(despesaNoBanco.valor_total).toBe(50);
        });

        it('deve processar exclusão física quando is_deleted for true', async () => {
            const veiculo = await criarVeiculo();
            const motorista = await criarUsuario({ veiculo_id: veiculo._id });

            const vPayload = viagemPayload(motorista._id, veiculo._id);
            const dPayload = despesaPayload('ALIMENTACAO', vPayload._id);

            await service.pushSync(motorista, [vPayload], [dPayload]);

            expect(await Despesa.findById(dPayload._id)).not.toBeNull();

            const resultadoDelete = await service.pushSync(
                motorista,
                [],
                [{ _id: dPayload._id, viagem_id: vPayload._id, is_deleted: true }]
            );

            expect(resultadoDelete.despesasDeleted).toBe(1);
            expect(await Despesa.findById(dPayload._id)).toBeNull();
        });
    });

    describe('Pull Sync (Download Delta por Motorista)', () => {
        it('deve retornar apenas registros do motorista autenticado', async () => {
            const motorista1 = await criarUsuario();
            const motorista2 = await criarUsuario();

            const snapshot1 = { nome: motorista1.nome, email: motorista1.email };
            const v1 = await Viagem.create(viagemPayload(motorista1._id, new mongoose.Types.ObjectId(), { usuario_snapshot: snapshot1 }));
            const d1 = await Despesa.create(despesaPayload('ALIMENTACAO', v1._id));

            const snapshot2 = { nome: motorista2.nome, email: motorista2.email };
            const v2 = await Viagem.create(viagemPayload(motorista2._id, new mongoose.Types.ObjectId(), { usuario_snapshot: snapshot2 }));
            await Despesa.create(despesaPayload('ALIMENTACAO', v2._id));

            const pullMotorista1 = await service.pullSync(motorista1);

            expect(pullMotorista1.viagens).toHaveLength(1);
            expect(pullMotorista1.viagens[0]._id).toBe(v1._id);
            expect(pullMotorista1.despesas).toHaveLength(1);
            expect(pullMotorista1.despesas[0]._id).toBe(d1._id);
        });

        it('deve aplicar filtro incremental delta sync via updatedAfter', async () => {
            const motorista = await criarUsuario();

            const snapshot = { nome: motorista.nome, email: motorista.email };
            const dataAntiga = new Date(Date.now() - 7200000);
            const viagemAntiga = await Viagem.create(viagemPayload(motorista._id, new mongoose.Types.ObjectId(), { usuario_snapshot: snapshot }));
            await Viagem.collection.updateOne({ _id: viagemAntiga._id }, { $set: { updatedAt: dataAntiga } });

            const viagemRecente = await Viagem.create(viagemPayload(motorista._id, new mongoose.Types.ObjectId(), { usuario_snapshot: snapshot }));

            const corteDelta = new Date(Date.now() - 3600000).toISOString();
            const pullDelta = await service.pullSync(motorista, corteDelta);

            expect(pullDelta.viagens).toHaveLength(1);
            expect(pullDelta.viagens[0]._id).toBe(viagemRecente._id);
        });
    });
});
