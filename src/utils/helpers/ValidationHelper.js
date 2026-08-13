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
     * Valida formato e algoritmo de verificação do CNPJ
     */
    static isValidCnpj(cnpjValue) {
        if (!cnpjValue || typeof cnpjValue !== 'string') return false;
        const cleaned = cnpjValue.replace(/\D/g, '');
        return cleaned.length === 14 && cnpjValidator.isValid(cleaned);
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
