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

        const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET_ACCESS_TOKEN);

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
        await this.service.logout(decodedId, token);

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

        const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET_REFRESH_TOKEN);
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
}

export default AuthController;
