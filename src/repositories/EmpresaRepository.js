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
        const empresa = await this.modelEmpresa.findById(id)
            .populate('admin_id', 'nome email cpf foto_perfil empresa_id')
            .populate('matriz_id', 'nome_empresa cnpj');

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
        const raw = cnpj.trim();
        const cleaned = raw.replace(/[.\-/]/g, '').toUpperCase();
        const conditions = [
            { cnpj: raw },
            { cnpj: cleaned },
            { cnpj: new RegExp(`^${cleaned}$`, 'i') }
        ];

        if (cleaned.length === 14) {
            const formatted = `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12, 14)}`;
            conditions.push({ cnpj: formatted });
            conditions.push({ cnpj: new RegExp(`^${formatted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
        }

        const filtro = { $or: conditions };
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
            admin_id,
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
            .comAdminId(admin_id);

        const filtros = filterBuilder.build();

        if (filtrosOverride.$or) {
            filtros.$or = filtrosOverride.$or;
        }

        if (todos || parseInt(query.limite, 10) === 0) {
            const docs = await this.modelEmpresa.find(filtros)
                .populate([
                    { path: 'admin_id', select: 'nome email foto_perfil empresa_id' },
                    { path: 'matriz_id', select: 'nome_empresa cnpj' }
                ])
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
            populate: [
                { path: 'admin_id', select: 'nome email foto_perfil empresa_id' },
                { path: 'matriz_id', select: 'nome_empresa cnpj' }
            ]
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
        ).populate('admin_id', 'nome email foto_perfil');

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
