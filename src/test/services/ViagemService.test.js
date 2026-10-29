// src/test/services/ViagemService.test.js

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { cpf as cpfUtil } from 'cpf-cnpj-validator';

import ViagemService from '../../services/ViagemService.js';
import Usuario from '../../models/Usuario.js';
import Veiculo from '../../models/Veiculo.js';
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
    service = new ViagemService();
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

describe('Unitário: ViagemService (Regras de Negócio de Viagens)', () => {
    describe('Criação de Viagem', () => {
        it('deve criar viagem com sucesso e congelar snapshots do motorista e veículo', async () => {
            const empresaId = new mongoose.Types.ObjectId();
            const veiculo = await criarVeiculo({ empresa_id: empresaId });
            const motorista = await criarUsuario({ empresa_id: empresaId, veiculo_id: veiculo._id });

            const payload = {
                usuario_id: motorista._id,
                veiculo_id: veiculo._id,
                origem: { cidade: 'São Paulo', estado: 'SP' },
                destino: { cidade: 'Joinville', estado: 'SC' },
                data_inicio: new Date(),
                km_inicial: 45000,
            };

            const req = { user_id: motorista._id };
            const viagemCriada = await service.criar(payload, req);

            expect(viagemCriada).toBeDefined();
            expect(viagemCriada.status).toBe('em_andamento');
            expect(viagemCriada.usuario_snapshot.nome).toBe(motorista.nome);
            expect(viagemCriada.usuario_snapshot.email).toBe(motorista.email);
            expect(viagemCriada.veiculo_snapshot.placa).toBe(veiculo.placa);
            expect(viagemCriada.veiculo_snapshot.modelo).toBe(veiculo.modelo);
        });

        it('deve lançar CustomError 409 quando o motorista já possuir viagem em andamento', async () => {
            const empresaId = new mongoose.Types.ObjectId();
            const veiculo = await criarVeiculo({ empresa_id: empresaId });
            const motorista = await criarUsuario({ empresa_id: empresaId });

            await criarViagem({
                usuario_id: motorista._id,
                veiculo_id: veiculo._id,
                empresa_id: empresaId,
                status: 'em_andamento',
            });

            const payloadNova = {
                usuario_id: motorista._id,
                veiculo_id: veiculo._id,
                origem: { cidade: 'Curitiba', estado: 'PR' },
                destino: { cidade: 'Porto Alegre', estado: 'RS' },
                data_inicio: new Date(),
                km_inicial: 50000,
            };

            let erro;
            try {
                await service.criar(payloadNova, { user_id: motorista._id });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(409);
            expect(erro.errorType).toBe('businessRuleError');
            expect(erro.field).toBe('status');
        });

        it('deve lançar CustomError 409 quando o veículo já estiver em uso em outra viagem em andamento', async () => {
            const empresaId = new mongoose.Types.ObjectId();
            const veiculo = await criarVeiculo({ empresa_id: empresaId });
            const motorista1 = await criarUsuario({ empresa_id: empresaId });
            const motorista2 = await criarUsuario({ empresa_id: empresaId });

            await criarViagem({
                usuario_id: motorista1._id,
                veiculo_id: veiculo._id,
                empresa_id: empresaId,
                status: 'em_andamento',
            });

            const payloadMotorista2 = {
                usuario_id: motorista2._id,
                veiculo_id: veiculo._id,
                origem: { cidade: 'Campinas', estado: 'SP' },
                destino: { cidade: 'Santos', estado: 'SP' },
                data_inicio: new Date(),
                km_inicial: 50000,
            };

            let erro;
            try {
                await service.criar(payloadMotorista2, { user_id: motorista2._id });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(409);
            expect(erro.errorType).toBe('businessRuleError');
            expect(erro.field).toBe('veiculo_id');
        });

        it('deve lançar CustomError 400 em caso de regressão de odômetro em relação à última viagem do veículo', async () => {
            const empresaId = new mongoose.Types.ObjectId();
            const veiculo = await criarVeiculo({ empresa_id: empresaId });
            const motorista = await criarUsuario({ empresa_id: empresaId });

            // Última viagem concluída terminou em 70.000 km
            await criarViagem({
                usuario_id: motorista._id,
                veiculo_id: veiculo._id,
                empresa_id: empresaId,
                status: 'concluída',
                km_inicial: 68000,
                km_final: 70000,
                data_fim: new Date(),
            });

            // Tentativa de iniciar nova viagem com 65.000 km
            const payloadRetroativo = {
                usuario_id: motorista._id,
                veiculo_id: veiculo._id,
                origem: { cidade: 'Rio de Janeiro', estado: 'RJ' },
                destino: { cidade: 'Vitória', estado: 'ES' },
                data_inicio: new Date(),
                km_inicial: 65000,
            };

            let erro;
            try {
                await service.criar(payloadRetroativo, { user_id: motorista._id });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(400);
            expect(erro.errorType).toBe('businessRuleError');
            expect(erro.field).toBe('km_inicial');
        });

        it('deve lançar CustomError 400 se o odômetro inicial da primeira viagem for menor que o km_atual registrado no veículo', async () => {
            const empresaId = new mongoose.Types.ObjectId();
            const veiculo = await criarVeiculo({ empresa_id: empresaId, km_atual: 50000 });
            const motorista = await criarUsuario({ empresa_id: empresaId, veiculo_id: veiculo._id });

            // Primeira viagem do veículo: piso deve ser os 50.000 km registrados no cadastro do veículo
            const payloadInvalido = {
                usuario_id: motorista._id,
                veiculo_id: veiculo._id,
                origem: { cidade: 'São Paulo', estado: 'SP' },
                destino: { cidade: 'Campinas', estado: 'SP' },
                data_inicio: new Date(),
                km_inicial: 48000, // Menor que km_atual (50000)
            };

            let erro;
            try {
                await service.criar(payloadInvalido, { user_id: motorista._id });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(400);
            expect(erro.errorType).toBe('businessRuleError');
            expect(erro.field).toBe('km_inicial');
        });

        it('deve lançar CustomError 403 se o motorista tentar criar viagem para outro usuário', async () => {
            const motorista1 = await criarUsuario();
            const motorista2 = await criarUsuario();
            const veiculo = await criarVeiculo();

            const payload = {
                usuario_id: motorista2._id, // Tentando criar para o motorista 2
                veiculo_id: veiculo._id,
                origem: { cidade: 'São Paulo', estado: 'SP' },
                destino: { cidade: 'Campinas', estado: 'SP' },
                data_inicio: new Date(),
                km_inicial: 10000,
            };

            let erro;
            try {
                await service.criar(payload, { user_id: motorista1._id });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(403);
            expect(erro.errorType).toBe('permissionError');
        });
    });

    describe('Auditoria Financeira e Encerramento', () => {
        it('deve calcular corretamente métricas de consumo (km/l) e totais por categoria no encerramento', async () => {
            const empresaId = new mongoose.Types.ObjectId();
            const veiculo = await criarVeiculo({ empresa_id: empresaId });
            const motorista = await criarUsuario({ empresa_id: empresaId });

            const viagem = await criarViagem({
                usuario_id: motorista._id,
                veiculo_id: veiculo._id,
                empresa_id: empresaId,
                km_inicial: 10000,
                status: 'em_andamento',
            });

            // Lança 2 abastecimentos de Diesel, 1 de Arla 32 (em KM posterior) e 1 refeição
            await criarDespesa('ABASTECIMENTO', {
                viagem_id: viagem._id,
                litros: 100,
                valor_total: 600,
                km_atual: 10250,
                tipo_combustivel: 'DIESEL_S10',
            });
            await criarDespesa('ABASTECIMENTO', {
                viagem_id: viagem._id,
                litros: 100,
                valor_total: 600,
                km_atual: 10500,
                tipo_combustivel: 'DIESEL_S10',
            });
            await criarDespesa('ABASTECIMENTO', {
                viagem_id: viagem._id,
                litros: 40,
                valor_litro: 4.0,
                valor_total: 160,
                km_atual: 10550,
                tipo_combustivel: 'ARLA_32',
            });
            await criarDespesa('ALIMENTACAO', {
                viagem_id: viagem._id,
                valor_total: 80,
            });

            // Enquanto em andamento, Arla 32 não pode contaminar litros nem inflar KM da média parcial (500 km / 200 L = 2.5 km/l)
            const viagemParcial = await service.listar({
                params: { id: viagem._id },
                user_id: motorista._id,
            });
            expect(viagemParcial.resumo_financeiro.metricas.km_percorrido).toBe(550);
            expect(viagemParcial.resumo_financeiro.metricas.total_litros).toBe(200);
            expect(viagemParcial.resumo_financeiro.metricas.total_litros_arla).toBe(40);
            expect(viagemParcial.resumo_financeiro.metricas.media_consumo).toBe(2.5);

            // Encerra a viagem com km_final = 10600 (600 km rodados, 200 litros de Diesel = 3 km/l; 40 L de Arla separados)
            await service.atualizar(
                viagem._id,
                { status: 'concluída', km_final: 10600 },
                { user_id: motorista._id }
            );

            const viagemComResumo = await service.listar({
                params: { id: viagem._id },
                user_id: motorista._id,
            });

            expect(viagemComResumo.resumo_financeiro).toBeDefined();
            expect(viagemComResumo.resumo_financeiro.total_geral).toBe(1440);
            expect(viagemComResumo.resumo_financeiro.por_categoria.ABASTECIMENTO).toBe(1360);
            expect(viagemComResumo.resumo_financeiro.por_categoria.ALIMENTACAO).toBe(80);
            expect(viagemComResumo.resumo_financeiro.metricas.km_percorrido).toBe(600);
            expect(viagemComResumo.resumo_financeiro.metricas.total_litros).toBe(200);
            expect(viagemComResumo.resumo_financeiro.metricas.total_litros_arla).toBe(40);
            expect(viagemComResumo.resumo_financeiro.metricas.media_consumo).toBe(3);
        });

        it('deve atualizar automaticamente o km_atual do veículo no encerramento da viagem', async () => {
            const empresaId = new mongoose.Types.ObjectId();
            const veiculo = await criarVeiculo({ empresa_id: empresaId, km_atual: 50000 });
            const motorista = await criarUsuario({ empresa_id: empresaId, veiculo_id: veiculo._id });

            const viagem = await criarViagem({
                usuario_id: motorista._id,
                veiculo_id: veiculo._id,
                empresa_id: empresaId,
                km_inicial: 50000,
                status: 'em_andamento',
            });

            await service.atualizar(
                viagem._id,
                { status: 'concluída', km_final: 52400 },
                { user_id: motorista._id }
            );

            const veiculoAtualizado = await Veiculo.findById(veiculo._id);
            expect(veiculoAtualizado.km_atual).toBe(52400);
        });

        it('deve lançar CustomError 403 quando um motorista tentar deletar uma viagem', async () => {
            const motorista = await criarUsuario({ role: 'motorista' });
            const viagem = await criarViagem({ usuario_id: motorista._id });

            let erro;
            try {
                await service.deletar(viagem._id, { user_id: motorista._id });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(403);
        });

        it('deve permitir que usuário admin delete viagem', async () => {
            const admin = await criarUsuario({ role: 'admin' });
            const viagem = await criarViagem();

            const resultado = await service.deletar(viagem._id, { user_id: admin._id });
            expect(resultado).toBeDefined();
            expect(await Viagem.findById(viagem._id)).toBeNull();
        });
    });
});
