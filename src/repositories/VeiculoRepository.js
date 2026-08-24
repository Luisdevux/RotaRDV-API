// src/repositories/VeiculoRepository.js

import Veiculo from "../models/Veiculo.js";
import VeiculoFilterBuild from "./filters/VeiculoFilterBuild.js";
import {
    CustomError,
    messages
} from "../utils/helpers/index.js";

class VeiculoRepository {
    constructor({ veiculoModel = Veiculo } = {}) {
        this.modelVeiculo = veiculoModel;
    }

    async buscarPorID(id) {
        const veiculo = await this.modelVeiculo.findById(id);

        if (!veiculo) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: "Veículo",
                details: [],
                customMessage: messages.error.resourceNotFound("Veículo")
            });
        }

        return veiculo;
    }

    async buscarPorPlaca(placa) {
        return await this.modelVeiculo.findOne({ placa });
    }

    async listar(req, filtrosOverride = {}) {
        const { id } = req.params;
        if (id) {
            const data = await this.buscarPorID(id);
            return data;
        }

        const query = req.validatedQuery || req.query;
        const { placa, modelo, reboque_placa, reboque_modelo, status, page = 1, todos = false } = query;
        const _id = filtrosOverride._id || query._id;
        const empresa_id = filtrosOverride.empresa_id || query.empresa_id;

        const filterBuilder = new VeiculoFilterBuild()
            .comId(_id)
            .comEmpresaId(empresa_id)
            .comStatus(status)
            .comPlaca(placa)
            .comModelo(modelo)
            .comReboquePlaca(reboque_placa)
            .comReboqueModelo(reboque_modelo);

        const filtros = filterBuilder.build();

        if (todos || parseInt(query.limite, 10) === 0) {
            const docs = await this.modelVeiculo.find(filtros).sort({ modelo: 1 }).lean();
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
            sort: { modelo: 1 }
        };

        const resultado = await this.modelVeiculo.paginate(filtros, options);
        resultado.docs = resultado.docs.map(doc => {
            return typeof doc.toObject === 'function' ? doc.toObject() : doc;
        });
        return resultado;
    }

    async criar(dadosVeiculo) {
        const veiculo = new this.modelVeiculo(dadosVeiculo);
        const veiculoSalvo = await veiculo.save();
        return veiculoSalvo;
    }

    async atualizar(id, parsedData) {
        const veiculo = await this.modelVeiculo.findByIdAndUpdate(id, parsedData, { returnDocument: 'after' });
        if (!veiculo) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'Veículo',
                details: [],
                customMessage: messages.error.resourceNotFound('Veículo')
            });
        }
        return veiculo;
    }

    async deletar(id) {
        const veiculo = await this.modelVeiculo.findByIdAndDelete(id);
        return veiculo;
    }
}

export default VeiculoRepository;
