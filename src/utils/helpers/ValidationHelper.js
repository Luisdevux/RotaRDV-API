// src/utils/helpers/ValidationHelper.js

import { cpf as cpfValidator, cnpj as cnpjValidator } from 'cpf-cnpj-validator';
import CustomError from './CustomError.js';
import HttpStatusCodes from './HttpStatusCodes.js';

class ValidationHelper {
    /**
     * Valida formato e algoritmo de verificação do CPF
     */
    static isValidCpf(cpfValue) {
        if (!cpfValue || typeof cpfValue !== 'string') return false;
        const cleaned = cpfValue.replace(/\D/g, '');
        return cleaned.length === 11 && cpfValidator.isValid(cleaned);
    }

    /**
     * Valida formato e algoritmo de verificação do CNPJ (numérico tradicional e novo padrão alfanumérico IN RFB 2.229/2024)
     */
    static isValidCnpj(cnpjValue) {
        if (!cnpjValue || typeof cnpjValue !== 'string') return false;
        
        // Remove pontuação e normaliza em maiúsculo
        const cleaned = cnpjValue.replace(/[.\-/]/g, '').trim().toUpperCase();
        
        // Deve ter exatamente 14 caracteres: 12 alfanuméricos e 2 dígitos verificadores numéricos
        if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(cleaned)) {
            return false;
        }

        // Rejeita sequências repetidas inválidas numéricas (ex: 00000000000000, 11111111111111)
        if (/^(\d)\1{13}$/.test(cleaned)) {
            return false;
        }

        // Tabela de conversão ASCII: '0'..'9' -> 0..9; 'A'..'Z' -> 17..42 (ASCII - 48)
        const getVal = (char) => char.charCodeAt(0) - 48;

        // 1º Dígito Verificador (DV1)
        const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        let soma1 = 0;
        for (let i = 0; i < 12; i++) {
            soma1 += getVal(cleaned[i]) * pesos1[i];
        }
        const resto1 = soma1 % 11;
        const dv1 = resto1 < 2 ? 0 : 11 - resto1;

        if (parseInt(cleaned[12], 10) !== dv1) {
            return false;
        }

        // 2º Dígito Verificador (DV2)
        const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        let soma2 = 0;
        for (let i = 0; i < 12; i++) {
            soma2 += getVal(cleaned[i]) * pesos2[i];
        }
        soma2 += dv1 * pesos2[12];
        const resto2 = soma2 % 11;
        const dv2 = resto2 < 2 ? 0 : 11 - resto2;

        return parseInt(cleaned[13], 10) === dv2;
    }

    /**
     * Valida formato e unicidade de CPF no banco
     */
    static async validateCpf(repository, cpfValue, idIgnorado = null) {
        if (!this.isValidCpf(cpfValue)) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validationError',
                field: 'cpf',
                details: [{ path: 'cpf', message: 'CPF inválido.' }],
                customMessage: 'CPF inválido.',
            });
        }

        const usuarioExistente = await repository.buscarPorCpf(cpfValue, idIgnorado);
        if (usuarioExistente) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validationError',
                field: 'cpf',
                details: [{ path: 'cpf', message: 'CPF já está em uso.' }],
                customMessage: 'CPF já cadastrado.',
            });
        }
    }

    /**
     * Valida formato e unicidade de CNH no banco
     */
    static async validateCnh(repository, cnhValue, idIgnorado = null) {
        if (!cnhValue) return;
        const cleaned = String(cnhValue).replace(/\D/g, '');
        if (cleaned.length !== 11) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validationError',
                field: 'cnh',
                details: [{ path: 'cnh', message: 'CNH deve conter exatamente 11 dígitos numéricos.' }],
                customMessage: 'CNH inválida.',
            });
        }

        const usuarioExistente = await repository.buscarPorCnh(cleaned, idIgnorado);
        if (usuarioExistente) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validationError',
                field: 'cnh',
                details: [{ path: 'cnh', message: 'CNH já está em uso.' }],
                customMessage: 'CNH já cadastrada.',
            });
        }
    }

    /**
     * Valida formato e unicidade de CNPJ no banco
     */
    static async validateCnpj(repository, cnpjValue, idIgnorado = null) {
        if (!this.isValidCnpj(cnpjValue)) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validationError',
                field: 'cnpj',
                details: [{ path: 'cnpj', message: 'CNPJ inválido.' }],
                customMessage: 'CNPJ inválido.',
            });
        }

        const empresaExistente = await repository.buscarPorCNPJ(cnpjValue, idIgnorado);
        if (empresaExistente) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validationError',
                field: 'cnpj',
                details: [{ path: 'cnpj', message: 'CNPJ já está cadastrado no sistema.' }],
                customMessage: 'CNPJ já cadastrado.',
            });
        }
    }

    /**
     * Valida unicidade de email no banco
     */
    static async validateEmail(repository, email, idIgnorado = null, customMessage = 'Email já cadastrado.') {
        const registroExistente = await repository.buscarPorEmail(email, idIgnorado);
        if (registroExistente) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validationError',
                field: 'email',
                details: [{ path: 'email', message: 'Email já está em uso.' }],
                customMessage,
            });
        }
    }

    /**
     * Valida unicidade de placa veicular no banco
     */
    static async validatePlaca(repository, placa, excludeId = null) {
        const veiculoExistente = await repository.buscarPorPlaca(placa);
        if (veiculoExistente && String(veiculoExistente._id) !== String(excludeId)) {
            throw new CustomError({
                statusCode: HttpStatusCodes.CONFLICT.code,
                errorType: 'validationError',
                field: 'placa',
                details: [{ path: 'placa', message: `A placa ${placa} já está cadastrada em outro veículo.` }],
                customMessage: `A placa ${placa} já está cadastrada em outro veículo.`,
            });
        }
    }

    /**
     * Garante a existência de uma entidade / documento no banco, lançando 404 se nulo
     */
    static ensureExists(document, resourceName = 'Recurso') {
        if (!document) {
            throw new CustomError({
                statusCode: HttpStatusCodes.NOT_FOUND.code,
                errorType: 'resourceNotFound',
                field: resourceName,
                details: [],
                customMessage: `${resourceName} não encontrado(a).`
            });
        }
        return document;
    }
}

export default ValidationHelper;
