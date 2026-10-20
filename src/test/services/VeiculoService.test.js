// src/test/services/UsuarioService.test.js

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { cnpj as cnpjUtil, cpf as cpfUtil } from 'cpf-cnpj-validator';

import VeiculoService from '../../services/VeiculoService.js';
import Usuario from '../../models/Usuario.js';
import Empresa from '../../models/Empresa.js';
import Veiculo from '../../models/Veiculo.js';
import CustomError from '../../utils/helpers/CustomError.js';

let service;
let contador = 1;

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

async function criarVeiculo(extra = {}) {
    const id = contador++;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const l1 = chars[id % 26];
    const l2 = chars[(id + 1) % 26];
    const l3 = chars[(id + 2) % 26];
    const n1 = id % 10;
    const l4 = chars[(id + 3) % 26];
    const n2 = (id + 4) % 10;
    const n3 = (id + 5) % 10;
    const placa = `${l1}${l2}${l3}${n1}${l4}${n2}${n3}`;

    return await Veiculo.create({
        placa,
        modelo: 'Volvo FH 540',
        ano_fabricacao: 2022,
        combustivel_preferencial: 'DIESEL_S10',
        status: 'ativo',
        ...extra,
    });
}

beforeAll(async () => {
    await mongoose.connect(process.env.DB_URL);
    service = new VeiculoService();
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

describe('Unitário: VeiculoService (Regras de Negócio de Veículos)', () => {
    describe('Criação de Veículo', () => {
        it('deve bloquear criação de veículo se o solicitante for motorista', async () => {
            const motorista = await criarUsuario({ role: 'motorista' });

            const payload = {
                placa: 'BRA2E19',
                modelo: 'Scania R450',
                ano_fabricacao: 2022,
                combustivel_preferencial: 'DIESEL_S10',
            };

            let erro;
            try {
                await service.criar(payload, { user_id: motorista._id });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(403);
            expect(erro.errorType).toBe('permissionError');
        });

        it('deve vincular automaticamente a empresa do gestor na criação do veículo', async () => {
            const empresa = await criarEmpresa();
            const gestor = await criarUsuario({ role: 'gestor', empresa_id: empresa._id });

            const payload = {
                placa: 'BRA2E19',
                modelo: 'Scania R450',
                ano_fabricacao: 2022,
                combustivel_preferencial: 'DIESEL_S10',
            };

            const novoVeiculo = await service.criar(payload, { user_id: gestor._id });
            expect(novoVeiculo).toBeDefined();
            expect(String(novoVeiculo.empresa_id)).toBe(String(empresa._id));
            expect(novoVeiculo.placa).toBe('BRA2E19');
        });

        it('deve lançar CustomError 409 se tentar cadastrar veículo com placa duplicada', async () => {
            const empresa = await criarEmpresa();
            const gestor = await criarUsuario({ role: 'gestor', empresa_id: empresa._id });
            await criarVeiculo({ placa: 'XYZ9K99', empresa_id: empresa._id });

            const payload = {
                placa: 'XYZ9K99',
                modelo: 'Mercedes Actros',
                ano_fabricacao: 2023,
                combustivel_preferencial: 'DIESEL_S10',
            };

            let erro;
            try {
                await service.criar(payload, { user_id: gestor._id });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(409);
            expect(erro.field).toBe('placa');
        });
    });

    describe('Listagem e Consulta de Veículos', () => {
        it('deve lançar CustomError 403 se motorista tentar listar veículos sem possuir veículo vinculado', async () => {
            const motoristaSemVeiculo = await criarUsuario({ role: 'motorista', veiculo_id: null });

            let erro;
            try {
                await service.listar({ user_id: motoristaSemVeiculo._id, params: {}, query: {} });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(403);
            expect(erro.errorType).toBe('forbidden');
        });

        it('deve restringir listagem de gestor apenas aos veículos de sua própria frota', async () => {
            const empresa1 = await criarEmpresa();
            const empresa2 = await criarEmpresa();

            const gestor = await criarUsuario({ role: 'gestor', empresa_id: empresa1._id });

            const v1 = await criarVeiculo({ empresa_id: empresa1._id });
            const v2 = await criarVeiculo({ empresa_id: empresa2._id });

            const resultado = await service.listar({
                user_id: gestor._id,
                params: {},
                query: { page: 1, limit: 10 },
            });

            expect(resultado.docs).toBeDefined();
            const ids = resultado.docs.map((v) => String(v._id));
            expect(ids).toContain(String(v1._id));
            expect(ids).not.toContain(String(v2._id));
        });

        it('deve lançar CustomError 403 se motorista tentar consultar veículo de outro usuário', async () => {
            const v1 = await criarVeiculo();
            const v2 = await criarVeiculo();
            const motorista = await criarUsuario({ role: 'motorista', veiculo_id: v1._id });

            let erro;
            try {
                await service.listar({
                    user_id: motorista._id,
                    params: { id: String(v2._id) },
                    query: {},
                });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(403);
        });
    });

    describe('Atualização e Exclusão', () => {
        it('deve bloquear exclusão de veículo por usuário de outra empresa', async () => {
            const empresa1 = await criarEmpresa();
            const empresa2 = await criarEmpresa();

            const gestorEmpresa1 = await criarUsuario({ role: 'gestor', empresa_id: empresa1._id });
            const veiculoEmpresa2 = await criarVeiculo({ empresa_id: empresa2._id });

            let erro;
            try {
                await service.deletar(veiculoEmpresa2._id, { user_id: gestorEmpresa1._id });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(403);
            expect(await Veiculo.findById(veiculoEmpresa2._id)).not.toBeNull();
        });
    });
});
