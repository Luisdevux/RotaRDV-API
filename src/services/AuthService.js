// src/service/AuthService.js

import jwt from 'jsonwebtoken';
import {
    CustomError,
    HttpStatusCodes,
    messages
} from '../utils/helpers/index.js';
import tokenUtil from '../utils/TokenUtil.js';
import bcrypt from 'bcryptjs';
import AuthHelper from '../utils/AuthHelper.js';
import UsuarioRepository from "../repositories/UsuarioRepository.js";

class AuthService {
    constructor(params = {}) {
        const { tokenUtil: injectedToken } = params;
        this.TokenUtil = injectedToken || tokenUtil;
        this.repository = new UsuarioRepository();
    }

    async carregatokens(id) {
        const data = await this.repository.buscarPorID(id, true);
        return { data };
    }

    async login(body) {
        const email = body.email || body.email.trim().toLowerCase();
        const userEncontrado = await this.repository.buscarPorEmail(email);
        if (!userEncontrado) {
            throw new CustomError({
                statusCode: 401,
                errorType: 'notFound',
                field: "Email",
                details: [],
                customMessage: messages.error.unauthorized("Credenciais inválidas")
            });
        }

        // Verificar se o status do usuário é ativo
        if (userEncontrado.status === 'inativo') {
            throw new CustomError({
                statusCode: 403,
                errorType: 'forbidden',
                field: 'Status',
                details: [],
                customMessage: 'Conta desativada. Entre em contato com o suporte.'
            });
        }

        const senhaValida = await bcrypt.compare(body.senha, userEncontrado.senha);
        if (!senhaValida) {
            throw new CustomError({
                statusCode: 401,
                errorType: 'notFound',
                field: 'Senha',
                details: [],
                customMessage: messages.error.unauthorized('Credenciais inválidas')
            });
        }

        // Gerar novo access token
        const accessToken = await this.TokenUtil.generateAccessToken(userEncontrado._id);

        // Verificar refresh token existente
        const userComToken = await this.repository.buscarPorID(userEncontrado._id, true);
        let refreshtoken = userComToken.refreshtoken;

        if (refreshtoken) {
            try {
                jwt.verify(refreshtoken, process.env.JWT_SECRET_REFRESH_TOKEN);
            } catch (error) {
                if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
                    refreshtoken = await this.TokenUtil.generateRefreshToken(userEncontrado._id);
                } else {
                    throw new CustomError({
                        statusCode: 500,
                        errorType: "ServerError",
                        field: "Token",
                        details: [],
                        customMessage: messages.error.unauthorized('Falha na criação do token')
                    });
                }
            }
        } else {
            refreshtoken = await this.TokenUtil.generateRefreshToken(userEncontrado._id);
        }

        await this.repository.armazenarTokens(userEncontrado._id, accessToken, refreshtoken);

        const userLogado = await this.repository.buscarPorID(userEncontrado._id, false);
        const userObject = userLogado.toObject();

        return {
            user: {
                accessToken,
                refreshtoken,
                ...userObject
            }
        };
    }

    async logout(id) {
        const data = await this.repository.removerTokens(id);
        return { data };
    }

    async refresh(id, token) {
        const userEncontrado = await this.repository.buscarPorID(id, true);

        if (!userEncontrado) {
            throw new CustomError({
                statusCode: HttpStatusCodes.NOT_FOUND.code,
                field: 'Token',
                details: [],
                customMessage: HttpStatusCodes.NOT_FOUND.message
            });
        }

        if (userEncontrado.refreshtoken !== token) {
            throw new CustomError({
                statusCode: HttpStatusCodes.UNAUTHORIZED.code,
                errorType: 'invalidToken',
                field: 'Token',
                details: [],
                customMessage: messages.error.unauthorized('Token')
            });
        }

        const accesstoken = await this.TokenUtil.generateAccessToken(id);
        let refreshtoken = userEncontrado.refreshtoken;

        await this.repository.armazenarTokens(id, accesstoken, refreshtoken);

        const userLogado = await this.repository.buscarPorID(id, true);
        const userObjeto = userLogado.toObject();

        const userComTokens = {
            accesstoken,
            refreshtoken,
            ...userObjeto
        };

        return { user: userComTokens };
    }

    async recuperaSenha(body) {
        const userEncontrado = await this.repository.buscarPorEmail(body.email);
        if (!userEncontrado) {
            throw new CustomError({
                statusCode: HttpStatusCodes.NOT_FOUND.code,
                field: 'Email',
                details: [],
                customMessage: HttpStatusCodes.NOT_FOUND.message
            });
        }

        const tokenUnico = await this.TokenUtil.generatePasswordRecoveryToken(userEncontrado._id);
        const expMs = Date.now() + 60 * 60 * 1000; // 1 hora

        await this.repository.atualizar(userEncontrado._id, {
            tokenUnico,
            exp_codigo_recupera_senha: new Date(expMs)
        });

        // Em produção, aqui seria enviado o email com o token
        return {
            message: 'Solicitação de recuperação de senha recebida.',
            token: tokenUnico // Retorna o token para teste (remover em produção)
        };
    }

    async atualizarSenhaToken(tokenRecuperacao, senhaBody) {
        const usuarioId = await this.TokenUtil.decodePasswordRecoveryToken(
            tokenRecuperacao,
            process.env.JWT_SECRET_PASSWORD_RECOVERY
        );

        const usuario = await this.repository.buscarPorTokenUnico(tokenRecuperacao);
        if (!usuario) {
            throw new CustomError({
                statusCode: HttpStatusCodes.NOT_FOUND.code,
                field: 'Token',
                details: [],
                customMessage: "Token de recuperação já foi utilizado ou é inválido."
            });
        }

        if (usuario.exp_codigo_recupera_senha < new Date()) {
            throw new CustomError({
                statusCode: HttpStatusCodes.UNAUTHORIZED.code,
                field: 'Token de Recuperação',
                details: [],
                customMessage: 'Token de recuperação expirado.'
            });
        }

        const senhaHasheada = await AuthHelper.hashPassword(senhaBody.senha);
        const usuarioAtualizado = await this.repository.atualizarSenha(usuarioId, senhaHasheada);

        if (!usuarioAtualizado) {
            throw new CustomError({
                statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR.code,
                field: 'Senha',
                details: [],
                customMessage: 'Erro ao atualizar a senha.'
            });
        }

        return { message: 'Senha atualizada com sucesso.' };
    }
}

export default AuthService;
