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
import VeiculoRepository from '../repositories/VeiculoRepository.js';
import UploadService from './UploadService.js';

class UsuarioService {
    constructor() {
        this.repository = new UsuarioRepository();
        this.veiculoRepository = new VeiculoRepository();
        this.uploadService = new UploadService();
    }

    async listar(req) {
        const usuarioLogado = await this.repository.buscarPorID(req.user_id);
        const isSuperAdmin = usuarioLogado?.role === 'superAdmin';
        const isAdmin = Boolean(usuarioLogado?.role === 'admin' || isSuperAdmin);
        const isGestor = usuarioLogado?.role === 'gestor';

        if (req.params?.id) {
            // Se está buscando um usuário específico, verifica permissão (Admin, Dono do Perfil, ou Gestor da mesma empresa)
            const targetUser = await this.repository.buscarPorID(req.params.id);
            ensurePermission({
                usuarioLogado,
                targetId: req.params.id,
                empresaId: targetUser?.empresa_id,
                field: 'Consulta de Usuário',
                customMessage: 'Você não tem permissões para acessar os dados deste usuário.',
            });
        } else {
            // Se está listando todos os usuários, apenas Admin ou Gestor têm permissão
            if (!isAdmin && !isGestor) {
                throw new CustomError({
                    statusCode: HttpStatusCodes.FORBIDDEN.code,
                    errorType: 'permissionError',
                    field: 'Consulta',
                    customMessage: 'Apenas administradores e gestores podem listar usuários.',
                });
            }
        }

        const filtrosOverride = {};
        if (!isSuperAdmin) {
            // Admin interno e gestor: só enxergam usuários vinculados à sua própria empresa
            filtrosOverride.empresa_id = usuarioLogado.empresa_id;
        }

        const data = await this.repository.listar(req, filtrosOverride);
        return data;
    }

    async criar(parsedData, req) {
        // Bloquear criação avulsa via API por usuários não administradores
        if (req && req.user_id) {
            const usuarioLogado = await this.repository.buscarPorID(req.user_id);
            const isSuperAdmin = usuarioLogado?.role === 'superAdmin';
            const isAdmin = Boolean(usuarioLogado?.role === 'admin' || isSuperAdmin);

            if (!usuarioLogado || !isAdmin) {
                throw new CustomError({
                    statusCode: HttpStatusCodes.FORBIDDEN.code,
                    errorType: 'permissionError',
                    field: 'Criação de Usuário',
                    customMessage: 'Apenas administradores podem cadastrar novos usuários por esta rota.',
                });
            }

            // Apenas superAdmin pode criar outro superAdmin
            if (parsedData.role === 'superAdmin' && !isSuperAdmin) {
                throw new CustomError({
                    statusCode: HttpStatusCodes.FORBIDDEN.code,
                    errorType: 'permissionError',
                    field: 'Criação de Usuário',
                    customMessage: 'Apenas Super Administradores podem criar contas com perfil Super Administrador.',
                });
            }

            // Admin interno só pode criar usuários vinculados à sua empresa
            if (!isSuperAdmin && usuarioLogado.empresa_id) {
                parsedData.empresa_id = usuarioLogado.empresa_id;
            }
        }

        // Validar email único
        await ValidationHelper.validateEmail(this.repository, parsedData.email);

        // Validar cpf único se fornecido
        if (parsedData.cpf) {
            await ValidationHelper.validateCpf(this.repository, parsedData.cpf);
        }

        // Validar se o veiculo_id fornecido realmente existe no BD
        if (parsedData.veiculo_id) {
            await ValidationHelper.ensureExists(await this.veiculoRepository.buscarPorID(parsedData.veiculo_id), 'Veículo');
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

        const targetUser = await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Usuário');

        if (parsedData.email) {
            await ValidationHelper.validateEmail(this.repository, parsedData.email, id);
        }

        if (parsedData.cpf) {
            await ValidationHelper.validateCpf(this.repository, parsedData.cpf, id);
        }

        // Validar se o veiculo_id fornecido realmente existe no BD (se informado)
        if (parsedData.veiculo_id) {
            await ValidationHelper.ensureExists(await this.veiculoRepository.buscarPorID(parsedData.veiculo_id), 'Veículo');
        }

        const usuarioLogado = await this.repository.buscarPorID(req.user_id);
        const { isSuperAdmin, isAdmin } = ensurePermission({
            usuarioLogado,
            targetId: id,
            empresaId: targetUser.empresa_id,
            field: 'Usuário',
            customMessage: 'Você não tem permissões para atualizar outro usuário.',
        });

        // Apenas Super Admin pode alterar perfil para 'superAdmin'
        if (parsedData.role === 'superAdmin' && !isSuperAdmin) {
            throw new CustomError({
                statusCode: HttpStatusCodes.FORBIDDEN.code,
                errorType: 'permissionError',
                field: 'Usuário',
                customMessage: 'Apenas Super Administradores podem conceder o perfil Super Administrador.',
            });
        }

        // Apenas Admin/SuperAdmin pode alterar a role de acesso e o status isAdmin
        if (!isAdmin) {
            delete parsedData.isAdmin;
            delete parsedData.role;
        } else if (parsedData.role !== undefined) {
            parsedData.isAdmin = parsedData.role === 'admin' || parsedData.role === 'superAdmin';
        }

        const data = await this.repository.atualizar(id, parsedData);
        return data;
    }

    async atualizarStatus(id, parsedData, req) {
        const targetUser = await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Usuário');

        const usuarioLogado = await this.repository.buscarPorID(req.user_id);
        const isSuperAdmin = usuarioLogado?.role === 'superAdmin';
        const isAdminEmpresa = usuarioLogado?.role === 'admin' && String(usuarioLogado?.empresa_id) === String(targetUser.empresa_id);

        if (targetUser.role === 'superAdmin' && !isSuperAdmin) {
            throw new CustomError({
                statusCode: HttpStatusCodes.FORBIDDEN.code,
                errorType: 'permissionError',
                field: 'Usuário',
                customMessage: 'Você não tem permissão para alterar o status de um Super Administrador.',
            });
        }

        if (targetUser.role === 'admin' && !isSuperAdmin && !isAdminEmpresa) {
            throw new CustomError({
                statusCode: HttpStatusCodes.FORBIDDEN.code,
                errorType: 'permissionError',
                field: 'Usuário',
                customMessage: 'Apenas Administradores podem alterar o status de outros administradores.',
            });
        }

        if (usuarioLogado?.role === 'gestor' && (targetUser.role === 'admin' || targetUser.role === 'gestor')) {
            throw new CustomError({
                statusCode: HttpStatusCodes.FORBIDDEN.code,
                errorType: 'permissionError',
                field: 'Usuário',
                customMessage: 'Gestores não possuem permissão para alterar o status de membros administrativos.',
            });
        }

        ensurePermission({
            usuarioLogado,
            targetId: id,
            empresaId: targetUser.empresa_id,
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
