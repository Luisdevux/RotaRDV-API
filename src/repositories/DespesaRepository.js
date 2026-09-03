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

    async listar(req = {}, filtrosOverride = {}) {
        const id = req.params?.id;
        if (id) {
            return await this.buscarPorID(id);
        }

        const query = req.validatedQuery || req.query || {};
        const { tipo, data_inicio, data_fim, page = 1, limite = 10, todos = false } = query;
        const viagem_id = filtrosOverride.viagem_id || query.viagem_id;

        const filtro = new DespesaFilterBuild()
            .comViagemId(viagem_id)
            .comTipo(tipo)
            .comDataEntre(data_inicio, data_fim)
            .build();

        // Se solicitado todos ou limite 0 (para relatórios em PDF e exportação)
        if (todos || parseInt(limite, 10) === 0) {
            const docs = await this.modelDespesa.find(filtro).sort({ data: -1 }).lean();
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

        const limitOptions = Math.min(parseInt(limite, 10), 1000);

        const options = {
            page: parseInt(page, 10),
            limit: limitOptions,
            sort: { data: -1 }
        };

        const resultado = await this.modelDespesa.paginate(filtro, options);
        resultado.docs = resultado.docs.map(doc => (typeof doc.toObject === 'function' ? doc.toObject() : doc));
        return resultado;
    }

    // Método utilizado estritamente para o upload de imagens que deve conseguir atualizar o campo para inserir a URL da imagem
    async atualizar(id, parsedData) {
        const despesa = await this.modelDespesa.findByIdAndUpdate(id, parsedData, { returnDocument: 'after' });
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
