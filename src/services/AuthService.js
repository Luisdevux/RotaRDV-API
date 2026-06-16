// src/services/AuthService.js

import { OAuth2Client } from 'google-auth-library';
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

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

        // Verificar se a conta é Google-Only (sem senha)
        if (!userEncontrado.senha && userEncontrado.authProvider === 'google') {
            throw new CustomError({
                statusCode: 401,
                errorType: 'googleOnly',
                field: 'Senha',
                details: [],
                customMessage: 'Esta conta utiliza login com Google. Use o botão "Entrar com Google".'
            });
        }

        // Verificar se op email foi confirmado
        if (!userEncontrado.email_verificado) {
            throw new CustomError({
                statusCode: 403,
                errorType: 'forbidden',
                field: 'Email',
                details: [],
                customMessage: 'Por favor, verifique seu email antes de fazer o login. Confira sua caixa de entrada.'
            })
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

        // Armazenar apenas o refreshtoken; o accessToken é stateless e não precisa ser persistido.
        await this.repository.armazenarTokens(userEncontrado._id, null, refreshtoken);

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

    // ═══════════════════════════════════════════
    // LOGIN COM GOOGLE
    // ═══════════════════════════════════════════

    async loginComGoogle(idToken) {
      // 1. Verificar o idToken com o Google
      let payload;
      try {
          const ticket = await googleClient.verifyIdToken({
              idToken,
              audience: process.env.GOOGLE_CLIENT_ID,
          });
          payload = ticket.getPayload();
        } catch (error) {
            throw new CustomError({
                statusCode: HttpStatusCodes.UNAUTHORIZED.code,
                errorType: 'invalidToken',
                field: 'idToken',
                details: [],
                customMessage: 'Token do Google inválido ou expirado.'
            });
        }

        const { sub: googleId, email, name, picture } = payload;

        // 2. Buscar usuário pelo googleId ou email
        let user = await this.repository.buscarPorGoogleId(googleId);
        let isNewUser = false;

        if(!user) {
            // Tentar buscar por email (conta local existente)
            const userPorEmail = await this.repository.buscarPorEmail(email);

            if(userPorEmail) {
                // Vincular conta Google a conta existente (mantém authProvider original se já tem senha)
                const novoProvider = userPorEmail.senha ? userPorEmail.authProvider : 'google';
                user = await this.repository.atualizar(userPorEmail._id, {
                    googleId,
                    authProvider: novoProvider,
                    foto_perfil: userPorEmail.foto_perfil || picture || '',
                    email_verificado: true // Conta validada pelo Google
                });
            } else {
                // Criar novo usuário Google
                isNewUser = true;
                user = await this.repository.criar({
                    nome: name,
                    email,
                    googleId,
                    authProvider: 'google',
                    foto_perfil: picture || '',
                    email_verificado: true, // Contas Google já vêm validadas
                    senha: null
                });
            }
        }

        // Verificar status
        if (user.status === 'inativo') {
            throw new CustomError({
                statusCode: HttpStatusCodes.FORBIDDEN.code,
                errorType: 'forbidden',
                field: 'Status',
                details: [],
                customMessage: 'Conta desativada. Entre em contato com o suporte.'
            });
        }

        //3. Gerar tokens JWT
        const accessToken = await this.TokenUtil.generateAccessToken(user._id);
        let refreshtoken;

        const userComToken = await this.repository.buscarPorID(user._id, true);
        refreshtoken = userComToken.refreshtoken;

        if (refreshtoken) {
            try {
                jwt.verify(refreshtoken, process.env.JWT_SECRET_REFRESH_TOKEN);
            } catch (error) {
                if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
                    refreshtoken = await this.TokenUtil.generateRefreshToken(user._id);
                } else {
                    throw new CustomError({
                        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR.code,
                        errorType: "ServerError",
                        field: "Token",
                        details: [],
                        customMessage: 'Falha na verificação do token de sessão.'
                    });
                }
            }
        } else {
            refreshtoken = await this.TokenUtil.generateRefreshToken(user._id);
        }

        // Armazenar apenas o refreshtoken; accessToken não precisa persistir no banco.
        await this.repository.armazenarTokens(user._id, null, refreshtoken);

        // 4. Retornar resposta
        const userLogado = await this.repository.buscarPorID(user._id, false);
        const userObject = userLogado.toObject();

        return {
            user: {
                acessToken,
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

        // Validar a assinatura do refresh token (não apenas comparação de string)
        try {
            jwt.verify(token, process.env.JWT_SECRET_REFRESH_TOKEN);
        } catch (error) {
            throw new CustomError({
                statusCode: HttpStatusCodes.UNAUTHORIZED.code,
                errorType: 'invalidToken',
                field: 'Token',
                details: [],
                customMessage: 'Refresh token inválido ou expirado. Faça login novamente.'
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

        // Armazenar apenas o refreshtoken; o accessToken é stateless.
        await this.repository.armazenarTokens(id, null, refreshtoken);

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

        // Retornar mensagem genérica se não encontrar (anti-enumeration)
        if (!userEncontrado) {
            return {
                message: 'Se o email informado estiver cadastrado, você receberá um link de recuperação.'
            };
        }

        // Se o usuário for do Google, ele não tem senha local para recuperar
        if (userEncontrado.authProvider === 'google') {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'invalidOperation',
                field: 'email',
                details: [],
                customMessage: 'Esta conta está vinculada ao Google. Por favor, acesse usando o botão "Continuar com Google".'
            });
        }

        const tokenUnico = await this.TokenUtil.generatePasswordRecoveryToken(userEncontrado._id);
        const expMs = Date.now() + 60 * 60 * 1000; // 1 hora

        await this.repository.atualizar(userEncontrado._id, {
            tokenUnico,
            exp_codigo_recupera_senha: new Date(expMs)
        });

        // Enviar email com o token de recuperação
        await EmailService.enviarEmailRecuperacao(
            body.email,
            tokenUnico,
            userEncontrado.nome
        );

        return {
            message: 'Se o email informado estiver cadastrado, você receberá um link de recuperação.'
        };
    }

    async atualizarSenhaToken(tokenRecuperacao, novaSenha) {
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

        const senhaHasheada = await AuthHelper.hashPassword(novaSenha);
        const usuarioAtualizado = await this.repository.atualizarSenha(usuario._id, senhaHasheada);

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

    // Verificar email do usuário usando token
    async verificarEmail(token) {
        // Buscar usuário pelo token de verificação
        const usuario = await this.repository.buscarPorTokenVerificacao(token);

        if (!usuario) {
            throw new CustomError({
                statusCode: HttpStatusCodes.NOT_FOUND.code,
                errorType: 'notFound',
                field: 'Token',
                details: [],
                customMessage: 'Token de verificação inválido ou já utilizado.'
            });
        }

        // Verificar se o token expirou
        const dataExpiracao = usuario.get('exp_token_verificacao_email', null, { getters: false });
        const dataAtual = new Date();

        if (dataExpiracao < dataAtual) {
            // Gerar novo token
            const novoToken = await AuthHelper.generateRandomToken();
            const novaExpiracao = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

            // Atualizar no banco
            await this.repository.atualizarTokenVerificacao(usuario._id, novoToken, novaExpiracao);

            // Enviar novo email
            await EmailService.enviarEmailVerificacao(usuario.email, novoToken, usuario.nome);

            throw new CustomError({
                statusCode: HttpStatusCodes.UNAUTHORIZED.code,
                errorType: 'tokenExpired',
                field: 'Token',
                details: [],
                customMessage: 'Token de verificação expirado. Enviamos um novo link para seu email. Verifique sua caixa de entrada.'
            });
        }

        // Atualizar usuário: marcar email como verificado e limpar token
        const usuarioAtualizado = await this.repository.atualizarVerificacaoEmail(usuario._id);

        return {
            message: 'Email verificado com sucesso!',
            email: usuarioAtualizado.email
        };
    }
}

export default AuthService;
