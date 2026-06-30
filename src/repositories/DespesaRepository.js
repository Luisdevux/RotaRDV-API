// src/repositories/DespesaRepository.js

import Despesa from '../models/Despesa.js';
import DespesaFilterBuild from './filters/DespesaFilterBuild.js';
import { CustomError, HttpStatusCodes, messages } from '../utils/helpers/index.js';

class DespesaRepository {
    constructor({ despesaModel = Despesa } = {}) {
        this.modelDespesa = despesaModel;
    }

    async criar(dados) {
        const despesa = new this.modelDespesa(dados);
        return await despesa.save();
    }

    async buscarPorID(id) {
        const despesa = await this.modelDespesa.findById(id);
        if (!despesa) {
            throw new CustomError({
                statusCode: HttpStatusCodes.NOT_FOUND.code,
                errorType: 'resourceNotFound',
                field: 'Despesa',
                details: [],
                customMessage: messages.error.resourceNotFound('Despesa')
            });
        }
        return despesa;
    }

    async listar(req) {
        const { id } = req.params;
        if (id) {
            return await this.buscarPorID(id);
        }

        const query = req.validatedQuery || req.query;
        const { viagem_id, tipo, data_inicio, data_fim, page = 1, limite = 10 } = query;

        const limitOptions = Math.min(parseInt(limite, 10), 100);

        const filtro = new DespesaFilterBuild()
            .comViagemId(viagem_id)
            .comTipo(tipo)
            .comDataEntre(data_inicio, data_fim)
            .build();

        const options = {
            page: parseInt(page, 10),
            limit: limitOptions,
            sort: { data: -1 }
        };

        const resultado = await this.modelDespesa.paginate(filtro, options);
        resultado.docs = resultado.docs.map(doc => (typeof doc.toObject === 'function' ? doc.toObject() : doc));
        return resultado;
    }

    async deletar(id) {
        const despesa = await this.modelDespesa.findByIdAndDelete(id);
        if (!despesa) {
            throw new CustomError({
                statusCode: HttpStatusCodes.NOT_FOUND.code,
                errorType: 'resourceNotFound',
                field: 'Despesa',
                details: [],
                customMessage: messages.error.resourceNotFound('Despesa')
            });
        }
        return despesa;
    }
}

export default DespesaRepository;
