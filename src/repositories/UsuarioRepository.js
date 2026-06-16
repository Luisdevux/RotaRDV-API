// src/repositories/UsuarioRepository.js

import Usuario from '../models/Usuario.js';
import Veiculo from '../models/Veiculo.js';
import UsuarioFilterBuild from './filters/UsuarioFilterBuild.js';
import {
    CustomError,
    messages,
    HttpStatusCodes
} from '../utils/helpers/index.js';

class UsuarioRepository {
    constructor({ usuarioModel = Usuario } = {}) {
        this.modelUsuario = usuarioModel;
    }

    /**
     * Armazena o refreshtoken do usuário no banco.
     * O accesstoken NÃO é persistido — ele é stateless (verificado via assinatura JWT).
     * Manter accesstoken no banco não agrega segurança e aumenta a superfície de ataque.
     */
    async armazenarTokens(id, accesstoken, refreshtoken) {
        const document = await this.modelUsuario.findById(id);
        if (!document) {
            throw new CustomError({
                statusCode: HttpStatusCodes.NOT_FOUND.code,
                errorType: "resourceNotFound",
                field: "Usuário",
                details: [],
                customMessage: messages.error.resourceNotFound("Usuário")
            });
        }
        document.accesstoken = accesstoken;
        document.refreshtoken = refreshtoken;
        const data = document.save();
        return data;
    }

    async removerTokens(id) {
        const parsedData = {
            refreshtoken: null,
            accesstoken: null
        };
        const usuario = await this.modelUsuario.findByIdAndUpdate(id, parsedData, { returnDocument: 'after' }).exec();
        if (!usuario) {
            throw new CustomError({
                statusCode: HttpStatusCodes.NOT_FOUND.code,
                errorType: 'resourceNotFound',
                field: "Usuário",
                details: [],
                customMessage: messages.error.resourceNotFound("Usuário")
            });
        }
        return usuario;
    }

    async buscarPorID(id, includeTokens = false) {
        let query = this.modelUsuario.findById(id).populate('veiculo_id');
        if (includeTokens) {
            query = query.select('+refreshtoken +accesstoken');
        }
        const user = await query;
        if (!user) {
            throw new CustomError({
                statusCode: HttpStatusCodes.NOT_FOUND.code,
                errorType: 'resourceNotFound',
                field: 'Usuário',
                details: [],
                customMessage: messages.error.resourceNotFound('Usuário')
            });
        }
        return user;
    }

    async buscarPorEmail(email, idIgnorado = null) {
        const filtro = { email };
        if (idIgnorado) {
            filtro._id = { $ne: idIgnorado };
        }
        const documento = await this.modelUsuario.findOne(filtro).select('+senha');
        return documento;
    }

    async buscarPorGoogleId(googleId) {
        const documento = await this.modelUsuario.findOne({ googleId });
        return documento;
    }

    async buscarPorCpf(cpfValue, idIgnorado = null) {
        const filtro = { cpf: cpfValue };
        if (idIgnorado) {
            filtro._id = { $ne: idIgnorado };
        }
        const documento = await this.modelUsuario.findOne(filtro);
        return documento;
    }

    async listar(req) {
        const { id } = req.params;
        if (id) {
            const data = await this.modelUsuario.findById(id).populate('veiculo_id');
            if (!data) {
                throw new CustomError({
                    statusCode: HttpStatusCodes.NOT_FOUND.code,
                    errorType: 'resourceNotFound',
                    field: 'Usuário',
                    details: [],
                    customMessage: messages.error.resourceNotFound('Usuário')
                });
            }
            return data;
        }

        const { nome, email, status, cpf, isAdmin, veiculo_id, empresa_nome, page = 1 } = req.query;
        const limite = Math.min(parseInt(req.query.limite, 10) || 10, 100);

        const filterBuilder = new UsuarioFilterBuild()
            .comNome(nome)
            .comEmail(email)
            .comStatus(status)
            .comCpf(cpf)
            .comIsAdmin(isAdmin)
            .comVeiculoId(veiculo_id)
            .comEmpresaNome(empresa_nome);

        const filtros = filterBuilder.build();

        const options = {
            page: parseInt(page, 10),
            limit: parseInt(limite, 10),
            sort: { nome: 1 },
            populate: 'veiculo_id'
        };

        const resultado = await this.modelUsuario.paginate(filtros, options);
        resultado.docs = resultado.docs.map(doc => {
            return typeof doc.toObject === 'function' ? doc.toObject() : doc;
        });
        return resultado;
    }

    async criar(dadosUsuario) {
        const usuario = new this.modelUsuario(dadosUsuario);
        const usuarioSalvo = await usuario.save();
        return usuarioSalvo;
    }

    async atualizar(id, parsedData) {
        const usuario = await this.modelUsuario.findByIdAndUpdate(id, parsedData, { returnDocument: 'after' });
        if (!usuario) {
            throw new CustomError({
                statusCode: HttpStatusCodes.NOT_FOUND.code,
                errorType: 'resourceNotFound',
                field: 'Usuário',
                details: [],
                customMessage: messages.error.resourceNotFound('Usuário')
            });
        }
        return usuario;
    }

    async deletar(id) {
        const usuario = await this.modelUsuario.findByIdAndDelete(id);
        return usuario;
    }

    async buscarPorTokenUnico(tokenUnico) {
        const filtro = { tokenUnico };
        const documento = await this.modelUsuario.findOne(filtro)
            .select('+tokenUnico +exp_codigo_recupera_senha +senha');
        return documento;
    }

    async atualizarSenha(id, senhaHasheada) {
        const usuario = await this.modelUsuario.findByIdAndUpdate(
            id,
            {
                senha: senhaHasheada,
                tokenUnico: null,
                codigo_recupera_senha: null,
                exp_codigo_recupera_senha: null
            },
            { returnDocument: 'after' }
        );
        if (!usuario) {
            throw new CustomError({
                statusCode: HttpStatusCodes.NOT_FOUND.code,
                errorType: 'resourceNotFound',
                field: 'Usuário',
                details: [],
                customMessage: messages.error.resourceNotFound('Usuário')
            });
        }
        return usuario;
    }

    async buscarPorTokenVerificacao(token) {
        const filtro = {
            token_verficiacao_email: token,
        };
        const documento = await this.modelUsuario.findOne(filtro)
            .select('+token_verficiacao_email +exp_token_verificacao_email');
        return documento;
    }

    async atualizarVerificacaoEmail(id) {
        const usuario = await this.modelUsuario.findByIdAndUpdate(
            id,
            {
                email_verificado:true,
                token_verficiacao_email: null,
                exp_token_verificacao_email: null
            },
            { returnDocument: 'after' }
        );

        if(!usuario) {
            throw new CustomError({
                statusCode: HttpStatusCodes.NOT_FOUND.code,
                errorType: 'resourceNotFound',
                field: 'Usuário',
                details: [],
                customMessage: messages.error.resourceNotFound('Usuário')
            });
        }

        return usuario;
    }

    async atualizarTokenVerificacao(id, novoToken, novaExpiracao) {
        const usuario = await this.modelUsuario.findByIdAndUpdate(
            id,
            {
                token_verficiacao_email: novoToken,
                exp_token_verificacao_email: novaExpiracao
            },
            { returnDocument: 'after' }
        );

        if (!usuario) {
            throw new CustomError({
                statusCode: HttpStatusCodes.NOT_FOUND.code,
                errorType: 'resourceNotFound',
                field: 'Usuário',
                details: [],
                customMessage: messages.error.resourceNotFound('Usuário')
            });
        }

        return usuario;
    }
}

export default UsuarioRepository;
