// src/services/DespesaService.js

import DespesaRepository from '../repositories/DespesaRepository.js';
import ViagemRepository from '../repositories/ViagemRepository.js';
import UsuarioRepository from '../repositories/UsuarioRepository.js';
import { CustomError, HttpStatusCodes, ValidationHelper } from '../utils/helpers/index.js';

class DespesaService {
    constructor() {
        this.repository = new DespesaRepository();
        this.viagemRepository = new ViagemRepository();
        this.usuarioRepository = new UsuarioRepository();
    }

    async criar(dados, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);

        // 1. Busca a Viagem
        const viagem = await ValidationHelper.ensureExists(await this.viagemRepository.buscarPorID(dados.viagem_id), 'Viagem');

        // 2. Dono da viagem
        // Se for admin, pula essa checagem. Caso contrário, só dono lança despesa.
        if (!usuarioLogado.isAdmin && String(viagem.usuario_id._id || viagem.usuario_id) !== String(usuarioLogado._id)) {
            throw new CustomError({
                statusCode: HttpStatusCodes.FORBIDDEN.code,
                errorType: 'forbidden',
                field: 'Viagem',
                details: [],
                customMessage: 'Você não tem permissão para lançar despesas na viagem de outro motorista.'
            });
        }

        // 3. Viagem precisa estar em andamento
        if (viagem.status !== 'em_andamento') {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validation',
                field: 'status',
                details: [],
                customMessage: `Não é possível lançar despesas. A viagem está ${viagem.status}.`
            });
        }

        // 4. Data da despesa (não pode ser antes do início da viagem)
        const dataDespesa = new Date(dados.data);
        const dataInicioViagem = new Date(viagem.data_inicio);
        if (dataDespesa < dataInicioViagem) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validation',
                field: 'data',
                details: [],
                customMessage: 'A data da despesa não pode ser anterior à data de início da viagem.'
            });
        }

        // 5. Checagem (mais específica): Abastecimento Odômetro (KM)
        if (dados.tipo === 'ABASTECIMENTO') {
            if (dados.km_atual < viagem.km_inicial) {
                throw new CustomError({
                    statusCode: HttpStatusCodes.BAD_REQUEST.code,
                    errorType: 'validation',
                    field: 'km_atual',
                    details: [],
                    customMessage: `O KM de abastecimento (${dados.km_atual}) não pode ser menor que o KM inicial da viagem (${viagem.km_inicial}).`
                });
            }
        }

        return await this.repository.criar(dados);
    }

    async listar(req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);

        const filtrosOverride = {};
        if (!usuarioLogado.isAdmin) {
            // O app deve obrigatoriamente informar a viagem_id para listar despesas
            const { viagem_id } = req.validatedQuery || req.query;

            if (!viagem_id) {
                // Sincronização offline-first: Retorna despesas de todas as viagens do motorista
                const viagens = await this.viagemRepository.modelViagem.find({ usuario_id: usuarioLogado._id }).select('_id');
                const viagensIds = viagens.map(v => v._id);
                filtrosOverride.viagem_id = { $in: viagensIds };
            } else {
                // Verifica se a viagem pertence a ele
                const viagem = await ValidationHelper.ensureExists(await this.viagemRepository.buscarPorID(viagem_id), 'Viagem');
                if (String(viagem.usuario_id._id || viagem.usuario_id) !== String(usuarioLogado._id)) {
                    throw new CustomError({
                        statusCode: HttpStatusCodes.FORBIDDEN.code,
                        errorType: 'forbidden',
                        field: 'viagem_id',
                        customMessage: 'Você não tem permissão para visualizar as despesas desta viagem.'
                    });
                }
            }
        }

        return await this.repository.listar(req, filtrosOverride);
    }

    async deletar(id, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);

        const despesa = await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Despesa');
        const viagem = await ValidationHelper.ensureExists(await this.viagemRepository.buscarPorID(despesa.viagem_id), 'Viagem');

        if (!usuarioLogado.isAdmin && String(viagem.usuario_id._id || viagem.usuario_id) !== String(usuarioLogado._id)) {
            throw new CustomError({
                statusCode: HttpStatusCodes.FORBIDDEN.code,
                errorType: 'forbidden',
                field: 'Viagem',
                details: [],
                customMessage: 'Você não tem permissão para deletar esta despesa.'
            });
        }

        if (viagem.status !== 'em_andamento') {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validation',
                field: 'status',
                details: [],
                customMessage: `Não é possível deletar despesas de uma viagem ${viagem.status}.`
            });
        }

        return await this.repository.deletar(id);
    }
}

export default DespesaService;
