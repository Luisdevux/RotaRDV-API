// src/repositories/ViagemRepository.js

import Viagem from "../models/Viagem.js";
import ViagemFilterBuild from "./filters/ViagemFilterBuild.js";
import {
    CustomError,
    messages
} from "../utils/helpers/index.js";

class ViagemRepository {
    constructor({ viagemModel = Viagem } = {}) {
        this.modelViagem = viagemModel;
    }

    async buscarPorID(id) {
        const viagem = await this.modelViagem.findById(id)
            .populate('usuario_id', 'nome email')
            .populate('veiculo_id', 'modelo placa');

        if (!viagem) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: "Viagem",
                details: [],
                customMessage: messages.error.resourceNotFound("Viagem")
            });
        }

        return viagem;
    }

    async buscarUltimaKmDoVeiculo(veiculoId) {
        const ultimaViagem = await this.modelViagem.findOne({
            veiculo_id: veiculoId,
            status: "concluída"
        }).sort({ data_fim: -1 });

        return ultimaViagem ? (ultimaViagem.km_final || 0) : 0;
    }

    async listar(req) {
        const { id } = req.params;
        if (id) {
            return await this.buscarPorID(id);
        }

        const { usuario_id, veiculo_id, status, data_inicio, data_fim, page = 1 } = req.query;
        const limite = Math.min(parseInt(req.query.limite, 10) || 10, 100);

        const filterBuilder = new ViagemFilterBuild()
            .comUsuarioId(usuario_id)
            .comVeiculoId(veiculo_id)
            .comStatus(status)
            .comDataRange(data_inicio, data_fim);

        const filtros = filterBuilder.build();

        const options = {
            page: parseInt(page, 10),
            limit: parseInt(limite, 10),
            sort: { data_inicio: -1 },
            populate: [
                { path: 'usuario_id', select: 'nome email' },
                { path: 'veiculo_id', select: 'modelo placa' }
            ]
        };

        const resultado = await this.modelViagem.paginate(filtros, options);
        resultado.docs = resultado.docs.map(doc => {
            return typeof doc.toObject === 'function' ? doc.toObject() : doc;
        });
        return resultado;
    }

    async criar(dadosViagem) {
        const viagem = new this.modelViagem(dadosViagem);
        const viagemSalva = await viagem.save();
        return viagemSalva;
    }

    async atualizar(id, parsedData) {
        const viagem = await this.modelViagem.findByIdAndUpdate(id, parsedData, { returnDocument: 'after' });
        if (!viagem) {
            throw new CustomError({
                statusCode: 404,
                errorType: 'resourceNotFound',
                field: 'Viagem',
                details: [],
                customMessage: messages.error.resourceNotFound('Viagem')
            });
        }
        return viagem;
    }

    async deletar(id) {
        const viagem = await this.modelViagem.findByIdAndDelete(id);
        return viagem;
    }
}

export default ViagemRepository;
