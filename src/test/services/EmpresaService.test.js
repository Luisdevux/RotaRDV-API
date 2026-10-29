// src/test/services/EmpresaService.test.js

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { cnpj as cnpjUtil, cpf as cpfUtil } from 'cpf-cnpj-validator';

import EmpresaService from '../../services/EmpresaService.js';
import Usuario from '../../models/Usuario.js';
import Empresa from '../../models/Empresa.js';
import Veiculo from '../../models/Veiculo.js';
import Viagem from '../../models/Viagem.js';
import Despesa from '../../models/Despesa.js';
import DespesaAbastecimento from '../../models/DespesaAbastecimento.js';
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
    service = new EmpresaService();
});

afterEach(async () => {
    if (mongoose.connection.readyState === 1) {
        await Promise.all([
            Usuario.deleteMany({}),
            Empresa.deleteMany({}),
            Veiculo.deleteMany({}),
            Viagem.deleteMany({}),
            Despesa.deleteMany({}),
        ]);
    }
});

afterAll(async () => {
    await mongoose.disconnect();
});

describe('Unitário: EmpresaService (Regras de Negócio de Empresas)', () => {
    describe('Criação de Empresa', () => {
        it('deve permitir criação para superAdmin', async () => {
            const superAdmin = await criarUsuario({ role: 'superAdmin' });

            const payload = {
                nome_empresa: 'Logística Rodoviária Express',
                cnpj: cnpjUtil.format(cnpjUtil.generate(false)),
                email: 'contato@express.com.br',
                telefone: '11999998888',
            };

            const resultado = await service.criar(payload, { user_id: superAdmin._id });
            expect(resultado).toBeDefined();
            expect(resultado.nome_empresa).toBe('Logística Rodoviária Express');

            // Valida agregação do dashboard: separa Arla 32, ignora viagens canceladas e não contamina média da frota com viagens abertas
            const motorista = await criarUsuario({ empresa_id: resultado._id, role: 'motorista' });
            const veiculo = await criarVeiculo({ empresa_id: resultado._id });
            const baseViagem = {
                usuario_id: motorista._id,
                empresa_id: resultado._id,
                usuario_snapshot: { nome: motorista.nome, email: motorista.email },
                veiculo_id: veiculo._id,
                veiculo_snapshot: { placa: veiculo.placa, modelo: veiculo.modelo },
                origem: { cidade: 'Vilhena', estado: 'RO' },
                destino: { cidade: 'Cuiabá', estado: 'MT' },
                data_inicio: new Date(),
            };

            const viagemConcluida = await Viagem.create({
                ...baseViagem,
                km_inicial: 10000,
                km_final: 11000, // 1000 km concluídos
                status: 'concluída',
            });
            const viagemAberta = await Viagem.create({
                ...baseViagem,
                km_inicial: 11000,
                status: 'em_andamento',
            });
            const viagemCancelada = await Viagem.create({
                ...baseViagem,
                km_inicial: 12000,
                km_final: 12500,
                status: 'cancelada',
            });

            await DespesaAbastecimento.create([
                { viagem_id: viagemConcluida._id, valor_total: 1500, data: new Date(), litros: 250, valor_litro: 6, tipo_combustivel: 'DIESEL_S10', km_atual: 10500 },
                { viagem_id: viagemConcluida._id, valor_total: 160, data: new Date(), litros: 40, valor_litro: 4, tipo_combustivel: 'ARLA_32', km_atual: 10600 },
                { viagem_id: viagemAberta._id, valor_total: 600, data: new Date(), litros: 100, valor_litro: 6, tipo_combustivel: 'DIESEL_S10', km_atual: 11300 },
                { viagem_id: viagemAberta._id, valor_total: 80, data: new Date(), litros: 20, valor_litro: 4, tipo_combustivel: 'ARLA_32', km_atual: 11350 },
                { viagem_id: viagemCancelada._id, valor_total: 480, data: new Date(), litros: 80, valor_litro: 6, tipo_combustivel: 'DIESEL_S10', km_atual: 12200 },
            ]);

            const dash = await service.obterDashboard(resultado._id, { user_id: superAdmin._id });
            expect(dash.resumo.total_km_rodado).toBe(1000);
            expect(dash.resumo.total_litros).toBe(350); // 250 (concluída) + 100 (em andamento); ignora Arla e cancelada
            expect(dash.resumo.total_litros_arla).toBe(60); // 40 + 20; ignora cancelada
            expect(dash.resumo.media_consumo_frota).toBe(4); // 1000 km / 250 L (estritamente viagens concluídas e combustível)
        });

        it('deve lançar CustomError 403 se um usuário comum ou admin tentar criar empresa', async () => {
            const admin = await criarUsuario({ role: 'admin' });

            const payload = {
                nome_empresa: 'Tentativa Negada',
                cnpj: cnpjUtil.format(cnpjUtil.generate(false)),
                email: 'negada@teste.com',
            };

            let erro;
            try {
                await service.criar(payload, { user_id: admin._id });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(403);
            expect(erro.errorType).toBe('permissionError');
        });
    });

    describe('Deleção de Empresa (Integridade Referencial)', () => {
        it('deve lançar CustomError 409 se houver motoristas vinculados à empresa', async () => {
            const superAdmin = await criarUsuario({ role: 'superAdmin' });
            const empresa = await criarEmpresa();
            await criarUsuario({ empresa_id: empresa._id, role: 'motorista' });

            let erro;
            try {
                await service.deletar(empresa._id, { user_id: superAdmin._id });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(409);
            expect(await Empresa.findById(empresa._id)).not.toBeNull();
        });

        it('deve lançar CustomError 409 se houver veículos vinculados à empresa', async () => {
            const superAdmin = await criarUsuario({ role: 'superAdmin' });
            const empresa = await criarEmpresa();
            await criarVeiculo({ empresa_id: empresa._id });

            let erro;
            try {
                await service.deletar(empresa._id, { user_id: superAdmin._id });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(409);
            expect(await Empresa.findById(empresa._id)).not.toBeNull();
        });

        it('deve deletar empresa com sucesso quando não houver vínculos', async () => {
            const superAdmin = await criarUsuario({ role: 'superAdmin' });
            const empresa = await criarEmpresa();

            await service.deletar(empresa._id, { user_id: superAdmin._id });
            expect(await Empresa.findById(empresa._id)).toBeNull();
        });
    });
});
