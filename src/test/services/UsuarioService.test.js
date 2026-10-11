// src/test/services/UsuarioService.test.js

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { cnpj as cnpjUtil, cpf as cpfUtil } from 'cpf-cnpj-validator';

import UsuarioService from '../../services/UsuarioService.js';
import Usuario from '../../models/Usuario.js';
import Empresa from '../../models/Empresa.js';
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

beforeAll(async () => {
    await mongoose.connect(process.env.DB_URL);
    service = new UsuarioService();
});

afterEach(async () => {
    if (mongoose.connection.readyState === 1) {
        await Promise.all([
            Usuario.deleteMany({}),
            Empresa.deleteMany({}),
        ]);
    }
});

afterAll(async () => {
    await mongoose.disconnect();
});

describe('Unitário: UsuarioService (Regras de Negócio e Hierarquia de Acesso)', () => {
    describe('Criação de Usuários e Validações de Hierarquia', () => {
        it('deve bloquear com CustomError 403 se um motorista tentar cadastrar um novo usuário', async () => {
            const motorista = await criarUsuario({ role: 'motorista' });

            const payload = {
                nome: 'Novo Motorista',
                email: 'novo@teste.com',
                senha: 'SenhaForte@123',
                cpf: cpfUtil.generate(false),
                role: 'motorista',
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

        it('deve bloquear com CustomError 403 se um admin comum tentar criar um superAdmin', async () => {
            const admin = await criarUsuario({ role: 'admin' });

            const payload = {
                nome: 'Tentativa SuperAdmin',
                email: 'super@teste.com',
                senha: 'SenhaForte@123',
                cpf: cpfUtil.generate(false),
                role: 'superAdmin',
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

        it('deve vincular automaticamente a empresa do admin interno na criação do usuário', async () => {
            const empresa = await criarEmpresa();
            const admin = await criarUsuario({ role: 'admin', empresa_id: empresa._id });

            const payload = {
                nome: 'Motorista da Empresa',
                email: 'motorista_empresa@teste.com',
                senha: 'SenhaForte@123',
                cpf: cpfUtil.generate(false),
                role: 'motorista',
            };

            const novoUsuario = await service.criar(payload, { user_id: admin._id });
            expect(novoUsuario).toBeDefined();
            expect(String(novoUsuario.empresa_id)).toBe(String(empresa._id));
        });

        it('deve lançar CustomError 409 se tentar cadastrar com email já existente', async () => {
            const admin = await criarUsuario({ role: 'admin' });
            await criarUsuario({ email: 'duplicado@teste.com' });

            const payload = {
                nome: 'Outro Usuario',
                email: 'duplicado@teste.com',
                senha: 'SenhaForte@123',
                cpf: cpfUtil.generate(false),
                role: 'motorista',
            };

            let erro;
            try {
                await service.criar(payload, { user_id: admin._id });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(400);
            expect(erro.errorType).toBe('validationError');
            expect(erro.field).toBe('email');
        });
    });

    describe('Atualização de Papéis e Permissões', () => {
        it('deve bloquear com CustomError 403 se admin comum tentar promover usuário a superAdmin', async () => {
            const admin = await criarUsuario({ role: 'admin' });
            const motorista = await criarUsuario({ role: 'motorista' });

            let erro;
            try {
                await service.atualizar(motorista._id, { role: 'superAdmin' }, { user_id: admin._id });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(403);
            expect(erro.errorType).toBe('permissionError');
        });

        it('não deve permitir que motorista altere sua própria role para admin', async () => {
            const motorista = await criarUsuario({ role: 'motorista' });

            const atualizado = await service.atualizar(
                motorista._id,
                { role: 'admin', isAdmin: true },
                { user_id: motorista._id }
            );

            expect(atualizado.role).toBe('motorista');
            expect(atualizado.isAdmin).toBeFalsy();
        });
    });

    describe('Atualização de Status (Ativação / Inativação)', () => {
        it('deve impedir que gestor altere o status de um admin ou outro gestor', async () => {
            const empresa = await criarEmpresa();
            const gestor = await criarUsuario({ role: 'gestor', empresa_id: empresa._id });
            const admin = await criarUsuario({ role: 'admin', empresa_id: empresa._id });

            let erro;
            try {
                await service.atualizarStatus(admin._id, { status: 'inativo' }, { user_id: gestor._id });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(403);
            expect(erro.errorType).toBe('permissionError');
        });

        it('deve permitir que gestor altere status de motorista da mesma empresa', async () => {
            const empresa = await criarEmpresa();
            const gestor = await criarUsuario({ role: 'gestor', empresa_id: empresa._id });
            const motorista = await criarUsuario({ role: 'motorista', empresa_id: empresa._id });

            const atualizado = await service.atualizarStatus(
                motorista._id,
                { status: 'inativo' },
                { user_id: gestor._id }
            );

            expect(atualizado.status).toBe('inativo');
        });
    });

    describe('Deleção de Conta', () => {
        it('deve impedir que um usuário delete a conta de outro usuário', async () => {
            const motorista1 = await criarUsuario();
            const motorista2 = await criarUsuario();

            let erro;
            try {
                await service.deletar(motorista2._id, { user_id: motorista1._id });
            } catch (err) {
                erro = err;
            }

            expect(erro).toBeInstanceOf(CustomError);
            expect(erro.statusCode).toBe(403);
            expect(erro.errorType).toBe('permissionError');
        });

        it('deve permitir que um usuário delete sua própria conta', async () => {
            const motorista = await criarUsuario();

            await service.deletar(motorista._id, { user_id: motorista._id });
            expect(await Usuario.findById(motorista._id)).toBeNull();
        });
    });
});
