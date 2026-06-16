// src/controllers/AuthController.js

import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import {
    CommonResponse,
    CustomError,
    HttpStatusCodes,
    messages
} from '../utils/helpers/index.js';
import { LoginSchema } from '../utils/validators/schemas/zod/LoginSchema.js';
import { UsuarioSchema } from '../utils/validators/schemas/zod/UsuarioSchema.js';
import { GoogleLoginSchema } from '../utils/validators/schemas/zod/GoogleLoginSchema.js';
import { UsuarioIdSchema } from '../utils/validators/schemas/zod/querys/UsuarioQuerySchema.js';
import AuthService from '../services/AuthService.js';

class AuthController {
    constructor() {
        this.service = new AuthService();
    }

    login = async (req, res) => {
        const body = req.body || {};
        const validatedBody = LoginSchema.parse(body);
        const data = await this.service.login(validatedBody);
        console.log(data)
        return CommonResponse.success(res, data);
    }

    googleLogin = async (req, res) => {
        const { idToken } = GoogleLoginSchema.parse(req.body || {});
        const data = await this.service.loginComGoogle(idToken);
        return CommonResponse.success(res, data);
    }

    logout = async (req, res) => {
        const token = req.body.access_token || req.headers.authorization?.split(' ')[1];

        if (!token || token === 'null' || token === 'undefined') {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'invalidLogout',
                field: 'Logout',
                details: [],
                customMessage: 'Token de acesso é obrigatório para logout.'
            });
        }

        let decoded;
        try {
            decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET_ACCESS_TOKEN);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                // Token expirado: decodificar sem verificar assinatura para pegar o ID
                decoded = jwt.decode(token);
            } else {
                throw new CustomError({
                    statusCode: HttpStatusCodes.INVALID_TOKEN.code,
                    errorType: 'notAuthorized',
                    field: 'Token',
                    details: [],
                    customMessage: 'Token inválido.'
                });
            }
        }

        if (!decoded || !decoded.id) {
            throw new CustomError({
                statusCode: HttpStatusCodes.INVALID_TOKEN.code,
                errorType: 'notAuthorized',
                field: 'NotAuthorized',
                details: [],
                customMessage: 'Token inválido.'
            });
        }

        const decodedId = UsuarioIdSchema.parse(decoded.id);
        await this.service.logout(decodedId);

        return CommonResponse.success(res, null, HttpStatusCodes.OK.code, messages.success.logout);
    }

    refresh = async (req, res) => {
        const token = req.body.refresh_token;

        if (!token || token === 'null' || token === 'undefined') {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'invalidRefresh',
                field: 'Refresh',
                details: [],
                customMessage: 'Refresh token é obrigatório.'
            });
        }

        let decoded;
        try {
            decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET_REFRESH_TOKEN);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                throw new CustomError({
                    statusCode: HttpStatusCodes.UNAUTHORIZED.code,
                    errorType: 'tokenExpired',
                    field: 'Token',
                    details: [],
                    customMessage: 'Refresh token expirado. Faça login novamente.'
                });
            }
            throw new CustomError({
                statusCode: HttpStatusCodes.UNAUTHORIZED.code,
                errorType: 'invalidToken',
                field: 'Token',
                details: [],
                customMessage: 'Refresh token inválido.'
            });
        }

        const data = await this.service.refresh(decoded.id, token);
        return CommonResponse.success(res, data);
    }

    recuperaSenha = async (req, res) => {
        const body = req.body || {};
        const email = body.email || body.email.trim().toLowerCase();

        if (!email || typeof email !== 'string' || !email.includes('@')) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validation',
                field: 'email',
                details: [],
                customMessage: 'Email válido é obrigatório para recuperação de senha.'
            });
        }

        const data = await this.service.recuperaSenha({ email });
        return CommonResponse.success(res, data);
    }

    atualizarSenhaToken = async (req, res) => {
        const tokenRecuperacao = req.query.token || req.params.token || null;
        const senha = req.body.senha || null;

        if (!tokenRecuperacao) {
            throw new CustomError({
                statusCode: HttpStatusCodes.UNAUTHORIZED.code,
                errorType: 'validation',
                field: 'token',
                details: [],
                customMessage: 'Token de recuperação é obrigatório.'
            });
        }

        if (!senha) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validation',
                field: 'senha',
                details: [],
                customMessage: 'Nova senha é obrigatória.'
            });
        }

        const data = await this.service.atualizarSenhaToken(tokenRecuperacao, senha);
        return CommonResponse.success(res, data, HttpStatusCodes.OK.code, 'Senha atualizada com sucesso.');
    }

    signup = async (req, res) => {
        const parsedData = UsuarioSchema.parse(req.body);

        // Ao cadastrar via signup, nunca é admin
        parsedData.isAdmin = false;

        const UsuarioService = (await import('../services/UsuarioService.js')).default;
        const usuarioService = new UsuarioService();
        let data = await usuarioService.criar(parsedData, req);

        let usuarioLimpo = data.toObject();
        delete usuarioLimpo.senha;

        return CommonResponse.created(res, usuarioLimpo);
    }

    /**
     * Verificar email do usuário
     */
    verificarEmail = async (req, res) => {
      const { token } = req.query;
      const appSchemeUrl = ''; // TODO: Definir a URL do esquema do aplicativo para redirecionamento após a verificação

      if (!token) {
        return res.status(HttpStatusCodes.BAD_REQUEST.code).send(templateErroVerificacao('Token de verificação não fornecido.', appSchemeUrl));
      }

      try {
        await this.service.verificarEmail(token);
        return res.status(HttpStatusCodes.OK.code).send(templateSucessoVerificacao(appSchemeUrl));
      } catch (error) {
        // Obter uma mensagem de erro mais amigável ou usar a do serviço
        const detalhe = error.customMessage || error.message || 'Falha ao processar o token. Ele pode ser inválido ou expirado.';
        return res.status(HttpStatusCodes.BAD_REQUEST.code).send(templateErroVerificacao(detalhe, appSchemeUrl));
      }
    };
}

export default AuthController;
