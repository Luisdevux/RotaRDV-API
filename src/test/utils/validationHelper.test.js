// src/test/utils/validationHelper.test.js

import { describe, it, expect } from 'vitest';
import ValidationHelper from '../../utils/helpers/ValidationHelper.js';
import ensurePermission from '../../utils/helpers/PermissionHelper.js';
import CustomError from '../../utils/helpers/CustomError.js';
import { cpf as cpfUtil, cnpj as cnpjUtil } from 'cpf-cnpj-validator';

describe('Validation and Permission Helpers (src/test/utils/validationHelper)', () => {
    describe('ValidationHelper: CPF & CNPJ', () => {
        it('deve validar CPF válido e rejeitar CPF com formato ou dígitos inválidos', () => {
            const valido = cpfUtil.generate(false);
            expect(ValidationHelper.isValidCpf(valido)).toBe(true);
            expect(ValidationHelper.isValidCpf('11111111111')).toBe(false);
            expect(ValidationHelper.isValidCpf('123')).toBe(false);
            expect(ValidationHelper.isValidCpf(null)).toBe(false);
        });

        it('deve validar CNPJ tradicional numérico', () => {
            const valido = cnpjUtil.generate(false);
            expect(ValidationHelper.isValidCnpj(valido)).toBe(true);
            expect(ValidationHelper.isValidCnpj('00000000000000')).toBe(false);
            expect(ValidationHelper.isValidCnpj('12345')).toBe(false);
        });

        it('deve validar CNPJ alfanumérico no padrão IN RFB 2.229/2024', () => {
            // Exemplos gerados sob a regra de cálculo oficial
            // DV1 e DV2 calculados com letras (ASCII - 48)
            const cnpjInvalido = '12ABC345000100'; // DVs incorretos
            expect(ValidationHelper.isValidCnpj(cnpjInvalido)).toBe(false);
        });
    });

    describe('ValidationHelper: ensureExists', () => {
        it('deve retornar o documento se existir', () => {
            const doc = { _id: '123', nome: 'Item' };
            const res = ValidationHelper.ensureExists(doc, 'Recurso');
            expect(res).toBe(doc);
        });

        it('deve lançar CustomError 404 se o documento for nulo ou indefinido', () => {
            let erroCapturado;
            try {
                ValidationHelper.ensureExists(null, 'Motorista');
            } catch (err) {
                erroCapturado = err;
            }

            expect(erroCapturado).toBeInstanceOf(CustomError);
            expect(erroCapturado.statusCode).toBe(404);
            expect(erroCapturado.errorType).toBe('resourceNotFound');
            expect(erroCapturado.field).toBe('Motorista');
        });
    });

    describe('PermissionHelper: ensurePermission', () => {
        const empresaA = '65a000000000000000000001';
        const empresaB = '65a000000000000000000002';

        it('deve autorizar irrestritamente superAdmin mesmo para empresas diferentes', () => {
            const superAdmin = { _id: 'u1', role: 'superAdmin', empresa_id: empresaA };
            const resultado = ensurePermission({
                usuarioLogado: superAdmin,
                empresaId: empresaB,
                field: 'Empresa',
            });

            expect(resultado.isSuperAdmin).toBe(true);
        });

        it('deve autorizar gestor ou admin quando a empresa coincide', () => {
            const gestor = { _id: 'u2', role: 'gestor', empresa_id: empresaA };
            const resultado = ensurePermission({
                usuarioLogado: gestor,
                empresaId: empresaA,
                field: 'Viagem',
            });

            expect(resultado.isGestor).toBe(true);
        });

        it('deve lançar CustomError 403 se gestor tentar acessar dados de outra empresa', () => {
            const gestor = { _id: 'u2', role: 'gestor', empresa_id: empresaA };

            let erroCapturado;
            try {
                ensurePermission({
                    usuarioLogado: gestor,
                    empresaId: empresaB,
                    field: 'Viagem',
                });
            } catch (err) {
                erroCapturado = err;
            }

            expect(erroCapturado).toBeInstanceOf(CustomError);
            expect(erroCapturado.statusCode).toBe(403);
            expect(erroCapturado.errorType).toBe('permissionError');
        });

        it('deve autorizar motorista apenas quando for o proprietário (isOwner === true)', () => {
            const motorista = { _id: 'u3', role: 'motorista', empresa_id: empresaA };

            const resultado = ensurePermission({
                usuarioLogado: motorista,
                isOwner: true,
                field: 'Despesa',
            });

            expect(resultado.isDriver).toBe(true);
        });

        it('deve lançar CustomError 403 para motorista quando isOwner === false', () => {
            const motorista = { _id: 'u3', role: 'motorista', empresa_id: empresaA };

            let erroCapturado;
            try {
                ensurePermission({
                    usuarioLogado: motorista,
                    isOwner: false,
                    field: 'Despesa',
                });
            } catch (err) {
                erroCapturado = err;
            }

            expect(erroCapturado).toBeInstanceOf(CustomError);
            expect(erroCapturado.statusCode).toBe(403);
        });
    });
});
