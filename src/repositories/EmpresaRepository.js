// src/repositories/EmpresaRepository.js

import Empresa from "../models/Empresa.js";
import Usuario from "../models/Usuario.js";
import Veiculo from "../models/Veiculo.js";
import Viagem from "../models/Viagem.js";
import EmpresaFilterBuild from "./filters/EmpresaFilterBuild.js";
import {
    CustomError,
    messages,
    HttpStatusCodes
} from "../utils/helpers/index.js";

class EmpresaRepository {
    constructor({ empresaModel = Empresa, usuarioModel = Usuario, veiculoModel = Veiculo, viagemModel = Viagem } = {}) {
        this.modelEmpresa = empresaModel;
        this.modelUsuario = usuarioModel;
        this.modelVeiculo = veiculoModel;
        this.modelViagem = viagemModel;
    }

    async buscarPorID(id) {
        const empresa = await this.modelEmpresa.findById(id).populate('gestor_id', 'nome email cpf foto_perfil');

        if (!empresa) {
            throw new CustomError({
                statusCode: HttpStatusCodes.NOT_FOUND.code,
                errorType: 'resourceNotFound',
                field: "Empresa",
                details: [],
                customMessage: messages.error.resourceNotFound("Empresa")
            });
        }

        return empresa;
    }

    async buscarPorCNPJ(cnpj, idIgnorado = null) {
        const cleaned = cnpj.replace(/\D/g, '');
        const filtro = {
            $or: [
                { cnpj: cnpj },
                { cnpj: cleaned }
            ]
        };
        if (idIgnorado) {
            filtro._id = { $ne: idIgnorado };
        }
        return await this.modelEmpresa.findOne(filtro);
    }

    async buscarPorEmail(email, idIgnorado = null) {
        const filtro = { email: email.toLowerCase().trim() };
        if (idIgnorado) {
            filtro._id = { $ne: idIgnorado };
        }
        return await this.modelEmpresa.findOne(filtro);
    }

    async listar(req, filtrosOverride = {}) {
        const { id } = req.params || {};
        if (id) {
            const data = await this.buscarPorID(id);
            return data;
        }

        const query = req.validatedQuery || req.query || {};
        const {
            nome_empresa,
            cnpj,
            email,
            status,
            cidade,
            estado,
            gestor_id,
            page = 1,
            todos = false
        } = query;

        const _id = filtrosOverride._id || query._id;

        const filterBuilder = new EmpresaFilterBuild()
            .comId(_id)
            .comNomeEmpresa(nome_empresa)
            .comCnpj(cnpj)
            .comEmail(email)
            .comStatus(status)
            .comCidade(cidade)
            .comEstado(estado)
            .comGestorId(gestor_id);

        const filtros = filterBuilder.build();

        if (todos || parseInt(query.limite, 10) === 0) {
            const docs = await this.modelEmpresa.find(filtros)
                .populate({ path: 'gestor_id', select: 'nome email foto_perfil' })
                .sort({ nome_empresa: 1 })
                .lean();

            return {
                docs,
                totalDocs: docs.length,
                limit: docs.length,
                totalPages: 1,
                page: 1,
                pagingCounter: 1,
                hasPrevPage: false,
                hasNextPage: false,
                prevPage: null,
                nextPage: null
            };
        }

        const limite = Math.min(parseInt(query.limite, 10) || 10, 1000);

        const options = {
            page: parseInt(page, 10),
            limit: parseInt(limite, 10),
            sort: { nome_empresa: 1 },
            populate: { path: 'gestor_id', select: 'nome email foto_perfil' }
        };

        const resultado = await this.modelEmpresa.paginate(filtros, options);
        resultado.docs = resultado.docs.map(doc => {
            return typeof doc.toObject === 'function' ? doc.toObject() : doc;
        });
        return resultado;
    }

    async criar(dadosEmpresa) {
        const empresa = new this.modelEmpresa(dadosEmpresa);
        const empresaSalva = await empresa.save();
        return empresaSalva;
    }

    async atualizar(id, parsedData) {
        const empresa = await this.modelEmpresa.findByIdAndUpdate(
            id,
            parsedData,
            { returnDocument: 'after' }
        ).populate('gestor_id', 'nome email foto_perfil');

        if (!empresa) {
            throw new CustomError({
                statusCode: HttpStatusCodes.NOT_FOUND.code,
                errorType: 'resourceNotFound',
                field: 'Empresa',
                details: [],
                customMessage: messages.error.resourceNotFound('Empresa')
            });
        }
        return empresa;
    }

    async deletar(id) {
        const empresa = await this.modelEmpresa.findByIdAndDelete(id);
        if (!empresa) {
            throw new CustomError({
                statusCode: HttpStatusCodes.NOT_FOUND.code,
                errorType: 'resourceNotFound',
                field: 'Empresa',
                details: [],
                customMessage: messages.error.resourceNotFound('Empresa')
            });
        }
        return empresa;
    }

    async contarMotoristas(empresaId) {
        return await this.modelUsuario.countDocuments({
            empresa_id: empresaId,
            role: 'motorista'
        });
    }

    async contarVeiculos(empresaId) {
        return await this.modelVeiculo.countDocuments({
            empresa_id: empresaId
        });
    }

    async contarViagens(empresaId, status = null) {
        const filtro = { empresa_id: empresaId };
        if (status) {
            filtro.status = status;
        }
        return await this.modelViagem.countDocuments(filtro);
    }
}

export default EmpresaRepository;
