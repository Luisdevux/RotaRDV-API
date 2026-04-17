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

    async listar(req) {
        const { id } = req.params;
        if (id) {
            const data = await this.buscarPorID(id);
            if (!data) {
                throw new CustomError({
                    statusCode: 404,
                    errorType: 'resourceNotFound',
                    field: "Veículo",
                    details: [],
                    customMessage: messages.error.resourceNotFound("Veículo")
                });
            }
            return data;
        }

        const { placa, modelo, reboque_placa, reboque_modelo, page = 1 } = req.query;
        const limite = Math.min(parseInt(req.query.limite, 10) || 10, 100);

        const filterBuilder = new VeiculoFilterBuild()
            .comPlaca(placa)
            .comModelo(modelo)
            .comReboquePlaca(reboque_placa)
            .comReboqueModelo(reboque_modelo);

        const filtros = filterBuilder.build();

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
