// src/services/UsuarioService.js

import {
    CustomError,
    HttpStatusCodes,
    ensurePermission,
    EmailHelper,
    ValidationHelper
} from '../utils/helpers/index.js';
import AuthHelper from '../utils/AuthHelper.js';
import UsuarioRepository from '../repositories/UsuarioRepository.js';
import UploadService from './UploadService.js';

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
        await ValidationHelper.validateEmail(this.repository, parsedData.email);

        // Validar cpf único se fornecido
        if (parsedData.cpf) {
            await ValidationHelper.validateCpf(this.repository, parsedData.cpf);
        }

        // Hash da senha
        if (parsedData.senha) {
            parsedData.senha = await AuthHelper.hashPassword(parsedData.senha);
        }

        // Configuração de verificação de email
        const tokenVerificacao = await AuthHelper.generateRandomToken();
        parsedData.token_verificacao_email = tokenVerificacao;
        parsedData.exp_token_verificacao_email = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
        parsedData.email_verificada = false;

        const data = await this.repository.criar(parsedData);

        // Envia email de verificação em background via EmailHelper
        EmailHelper.enviarEmailVerificacao({
            usuarioId: data._id,
            email: data.email,
            nome: data.nome,
            token: tokenVerificacao
        });

        return data;
    }

    async atualizar(id, parsedData, req) {
        // Não permitir alterar senha por esta rota
        delete parsedData.senha;

        await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Usuário');

        if (parsedData.email) {
            await ValidationHelper.validateEmail(this.repository, parsedData.email, id);
        }

        if (parsedData.cpf) {
            await ValidationHelper.validateCpf(this.repository, parsedData.cpf, id);
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
        await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Usuário');

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
        await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Usuário');

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
        const usuario = await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Usuário');

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
        const usuario = await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Usuário');

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
}

export default UsuarioService;
