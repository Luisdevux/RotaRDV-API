// src/service/UsuarioService.js

import {
    CustomError,
    HttpStatusCodes,
    messages,
    ensurePermission
} from '../utils/helpers/index.js';
import AuthHelper from '../utils/AuthHelper.js';
import UsuarioRepository from '../repositories/UsuarioRepository.js';
// import UploadService from './UploadService.js';
import { cpf } from 'cpf-cnpj-validator';

class UsuarioService {
    constructor() {
        this.repository = new UsuarioRepository();
        // this.uploadService = new UploadService();
    }

    async listar(req) {
        const data = await this.repository.listar(req);
        return data;
    }

    async criar(parsedData) {
        // Validar email único
        await this.validateEmail(parsedData.email);

        // Validar cpf único se fornecido
        if (parsedData.cpf) {
            await this.validateCpf(parsedData.cpf);
        }

        // TODO: Validar se o veiculo_id fornecido realmente existe no BD.

        // Hash da senha
        if (parsedData.senha) {
            parsedData.senha = await AuthHelper.hashPassword(parsedData.senha);
        }

        const data = await this.repository.criar(parsedData);
        return data;
    }

    async atualizar(id, parsedData, req) {
        // Não permitir alterar senha por esta rota
        delete parsedData.senha;

        await this.ensureUserExists(id);

        if (parsedData.email) {
            await this.validateEmail(parsedData.email, id);
        }

        if (parsedData.cpf) {
            await this.validateCpf(parsedData.cpf, id);
        }

        // TODO: Validar se o veiculo_id fornecido realmente existe no BD.

        const usuarioLogado = await this.repository.buscarPorID(req.user_id);
        const { isAdmin } = ensurePermission({
            usuarioLogado,
            targetId: id,
            field: 'Usuário',
            customMessage: 'Você não tem permissões para atualizar outro usuário.',
        });

        // Não permitir alterar isAdmin se não for admin
        if (!isAdmin) {
            delete parsedData.isAdmin;
        }

        const data = await this.repository.atualizar(id, parsedData);
        return data;
    }

    async atualizarStatus(id, parsedData, req) {
        await this.ensureUserExists(id);

        const usuarioLogado = await this.repository.buscarPorID(req.user_id);
        ensurePermission({
            usuarioLogado,
            targetId: id,
            field: 'Usuário',
            customMessage: 'Você não tem permissões para alterar o status deste usuário.',
        });

        const data = await this.repository.atualizar(id, { status: parsedData.status });
        return data;
    }

    async deletar(id, req) {
        await this.ensureUserExists(id);

        const usuarioLogado = await this.repository.buscarPorID(req.user_id);
        ensurePermission({
            usuarioLogado,
            targetId: id,
            field: 'Usuário',
            customMessage: 'Você só pode deletar sua própria conta.',
        });

        const data = await this.repository.deletar(id);
        return data;
    }

    // ================================
    // UPLOAD DE FOTO
    // ================================
    async fotoUpload(id, file, req) {
        const usuario = await this.ensureUserExists(id);

        const usuarioLogado = await this.repository.buscarPorID(req.user_id);
        ensurePermission({
            usuarioLogado,
            targetId: id,
            field: 'Usuário',
            customMessage: 'Você não tem permissões para alterar a foto deste usuário.',
        });

        // O 'substituirImagem' já trata se 'usuario.foto_perfil' for null ou se não existir
        const uploadResult = await this.uploadService.substituirImagem(
            file,
            usuario.foto_perfil,
            { width: 400, height: 400, fit: 'cover', quality: 80 }
        );

        // Atualiza a URL no banco de dados
        await this.repository.atualizar(id, { foto_perfil: uploadResult.url });

        return uploadResult;
    }

    async fotoDelete(id, req) {
        const usuario = await this.ensureUserExists(id);

        const usuarioLogado = await this.repository.buscarPorID(req.user_id);
        ensurePermission({
            usuarioLogado,
            targetId: id,
            field: 'Usuário',
            customMessage: 'Você não tem permissões para excluir a foto deste usuário.',
        });

        if (!usuario.foto_perfil) {
            throw new CustomError({
                statusCode: HttpStatusCodes.NOT_FOUND.code,
                errorType: 'resourceNotFound',
                field: 'foto_perfil',
                customMessage: 'Este usuário não possui uma foto de perfil para remover.'
            });
        }

        const urlAntiga = usuario.foto_perfil;

        // 1. Remove a URL do banco de dados imediatamente (resposta rápida, evita carregamento desnecessário da imagem)
        await this.repository.atualizar(id, { foto_perfil: "" });

        // 2. Deleta do Garage em background com retry (se falhar, apenas loga e não impacta o usuário)
        this.uploadService.deleteImagemComRetry(urlAntiga).catch(err => {
            console.error(`Erro isolado na exclusão da foto em background: ${err.message}`);
        });

        return true;
    }

    // ================================
    // MÉTODOS UTILITÁRIOS
    // ================================
    async validateEmail(email, id = null) {
        const usuarioExistente = await this.repository.buscarPorEmail(email, id);
        if (usuarioExistente) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validationError',
                field: 'email',
                details: [{ path: 'email', message: 'Email já está em uso.' }],
                customMessage: 'Email já cadastrado.',
            });
        }
    }

    async validateCpf(cpfValue, id = null) {
      // Validar formato do CPF
      if (!this.isValidCpf(cpfValue)) {
        throw new CustomError({
          statusCode: HttpStatusCodes.BAD_REQUEST.code,
          errorType: 'validationError',
          field: 'cpf',
          details: [{ path: 'cpf', message: 'CPF inválido.' }],
          customMessage: 'CPF inválido.',
        });
      }

      // Validar se já existe
      const usuarioExistente = await this.repository.buscarPorCpf(cpfValue, id);
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

    isValidCpf(cpfValue) {
      const cleaned = cpfValue.replace(/\D/g, '');
      return cleaned.length === 11 && cpf.isValid(cleaned);
    }

    async ensureUserExists(id) {
        const usuarioExistente = await this.repository.buscarPorID(id);
        if (!usuarioExistente) {
            throw new CustomError({
                statusCode: HttpStatusCodes.NOT_FOUND.code,
                errorType: 'resourceNotFound',
                field: 'Usuário',
                details: [],
                customMessage: 'Usuário não encontrado.'
            });
        }
        return usuarioExistente;
    }
}

export default UsuarioService;
