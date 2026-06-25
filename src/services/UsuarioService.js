// src/services/UsuarioService.js

import {
    CustomError,
    HttpStatusCodes,
    messages,
    ensurePermission
} from '../utils/helpers/index.js';
import AuthHelper from '../utils/AuthHelper.js';
import UsuarioRepository from '../repositories/UsuarioRepository.js';
import UploadService from './UploadService.js';
import { cpf } from 'cpf-cnpj-validator';

class UsuarioService {
    constructor() {
        this.repository = new UsuarioRepository();
        this.uploadService = new UploadService();
    }

    async listar(req) {
        const usuarioLogado = await this.repository.buscarPorID(req.user_id);

        if (req.params?.id) {
            // Se está buscando um usuário específico, verifica permissão (Admin ou Dono do Perfil)
            ensurePermission({
                usuarioLogado,
                targetId: req.params.id,
                field: 'Consulta de Usuário',
                customMessage: 'Você não tem permissões para acessar os dados deste usuário.',
            });
        } else {
            // Se está listando todos os usuários, apenas Admin tem permissão
            if (!usuarioLogado.isAdmin) {
                throw new CustomError({
                    statusCode: HttpStatusCodes.FORBIDDEN.code,
                    errorType: 'permissionError',
                    field: 'Consulta',
                    customMessage: 'Apenas administradores podem listar todos os usuários.',
                });
            }
        }

        const data = await this.repository.listar(req);
        return data;
    }

    async criar(parsedData, req) {
        // Bloquear criação avulsa via API por usuários não administradores
        // (Motoristas devem usar obrigatoriamente a rota pública de Signup)
        if (req && req.user_id) {
            const usuarioLogado = await this.repository.buscarPorID(req.user_id);
            if (!usuarioLogado || !usuarioLogado.isAdmin) {
                throw new CustomError({
                    statusCode: HttpStatusCodes.FORBIDDEN.code,
                    errorType: 'permissionError',
                    field: 'Criação de Usuário',
                    customMessage: 'Apenas administradores podem cadastrar novos usuários por esta rota.',
                });
            }
        }

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

        // Configuração de verificação de email
        const tokenVerificacao = await AuthHelper.generateRandomToken();
        parsedData.token_verificacao_email = tokenVerificacao;
        parsedData.exp_token_verificacao_email = new Date(Date.now() + 24 * 60 *60 * 1000); // 24 horas
        parsedData.email_verificada = false;

        const data = await this.repository.criar(parsedData);

        // Envia email de verificação em background (não bloqueia o fluxo)
        const hermesClient = (await import('../config/hermesClient.js')).default;
        const linkVerificacao = `${process.env.API_BASE_URL || 'http://localhost:5040'}/verificar-email?token=${tokenVerificacao}`;

        hermesClient.sendEmail({
            usuarioId: data._id,
            recipient_to: data.email,
            subject: 'Verificação de Email - RotaRDV',
            template_id: '95f9e573-039c-43fa-862a-376858c02728',
            variables: {
                nomeUsuario: data.nome,
                linkVerificacao: linkVerificacao
            }
        })
        .then((resposta) => console.log(`[Sucesso] Email de verificação enviado para: ${data.email}. ID: ${resposta?.dados?._id || 'N/A'}`))
        .catch((error) => console.error(`[Erro] Falha ao enviar email de verificação: ${error.message}`));

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

        // Validar CPF ao atualizar (não apenas no cadastro)
        if (parsedData.cpf) {
            await this.validateCpf(parsedData.cpf, id);
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
