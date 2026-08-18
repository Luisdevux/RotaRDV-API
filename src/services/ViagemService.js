// src/services/ViagemService.js

import mongoose from 'mongoose';
import {
    CustomError,
    HttpStatusCodes,
    ensurePermission,
    ValidationHelper
} from '../utils/helpers/index.js';
import UsuarioRepository from '../repositories/UsuarioRepository.js';
import ViagemRepository from '../repositories/ViagemRepository.js';
import VeiculoRepository from '../repositories/VeiculoRepository.js';

class ViagemService {
    constructor() {
        this.repository = new ViagemRepository();
        this.usuarioRepository = new UsuarioRepository();
        this.veiculoRepository = new VeiculoRepository();
    }

    async _calcularResumoFinanceiro(viagemId, viagemDoc = null) {
        const Despesa = mongoose.model('despesas');
        const Viagem = mongoose.model('viagens');

        // Se não passarem o doc da viagem, buscamos os dados básicos de KM
        const viagem = viagemDoc || await Viagem.findById(viagemId).select('km_inicial km_final');

        const pipeline = [
            { $match: { viagem_id: viagemId } },
            {
                $group: {
                    _id: '$tipo',
                    total: { $sum: '$valor_total' },
                    litros_totais: {
                        $sum: { $ifNull: ['$litros', 0] }
                    }
                },
            },
        ];

        const resultados = await Despesa.aggregate(pipeline);

        const resumo = {
            total_geral: 0,
            por_categoria: {
                ABASTECIMENTO: 0,
                ALIMENTACAO: 0,
                MANUTENCAO: 0,
                PEDAGIO: 0,
                OUTROS: 0,
            },
            metricas: {
                km_percorrido: 0,
                total_litros: 0,
                media_consumo: 0 // km/l
            }
        };

        resultados.forEach((res) => {
            if (res._id in resumo.por_categoria) {
                resumo.por_categoria[res._id] = res.total;
                resumo.total_geral += res.total;
            }
            if (res._id === 'ABASTECIMENTO') {
                resumo.metricas.total_litros = res.litros_totais;
            }
        });

        // Aqui calcula as métricas de distância e consumo, basicamente, calculo de média de consumo, (km/l)
        if (viagem && viagem.km_final) {
            resumo.metricas.km_percorrido = viagem.km_final - viagem.km_inicial;

            if (resumo.metricas.total_litros > 0) {
                resumo.metricas.media_consumo = parseFloat(
                    (resumo.metricas.km_percorrido / resumo.metricas.total_litros).toFixed(2)
                );
            }
        }

        return resumo;
    }

    async listar(req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        const { id } = req.params;

        if (id) {
            const viagem = await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Viagem');

            const isOwner = String(viagem.usuario_id._id || viagem.usuario_id) === String(usuarioLogado._id);

            ensurePermission({
                usuarioLogado,
                isOwner,
                empresaId: viagem.empresa_id,
                field: 'Consulta de Viagem',
                customMessage: 'Você não tem permissão para acessar os dados desta viagem.',
            });

            // Converter para objeto plano para injetar o resumo dinâmico
            const viagemObj = viagem.toObject();
            viagemObj.resumo_financeiro = await this._calcularResumoFinanceiro(id, viagem);

            return viagemObj;
        }

        const filtrosOverride = {};
        const isAdmin = Boolean(usuarioLogado?.isAdmin || usuarioLogado?.role === 'admin');
        const isGestor = usuarioLogado?.role === 'gestor';

        if (!isAdmin) {
            if (isGestor) {
                filtrosOverride.empresa_id = String(usuarioLogado.empresa_id);
            } else {
                filtrosOverride.usuario_id = String(usuarioLogado._id);
            }
        }

        const data = await this.repository.listar(req, filtrosOverride);
        return data;
    }

    async criar(parsedData, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);

        const isOwner = String(parsedData.usuario_id) === String(usuarioLogado._id);

        ensurePermission({
            usuarioLogado,
            isOwner,
            field: 'Criação de Viagem',
            customMessage: 'Você não tem permissão para criar uma viagem para outro usuário.',
        });

        // Verificar se já existe viagem em andamento para este usuário
        const viagemAtivaUsuario = await this.repository.modelViagem.findOne({
            usuario_id: parsedData.usuario_id,
            status: 'em_andamento'
        });

        if (viagemAtivaUsuario) {
            throw new CustomError({
                statusCode: HttpStatusCodes.CONFLICT.code,
                errorType: 'businessRuleError',
                field: 'status',
                customMessage: 'Já existe uma viagem em andamento para este usuário. Finalize-a antes de iniciar uma nova.',
            });
        }

        // Verificar se o VEÍCULO já está em uso por outro motorista
        const viagemAtivaVeiculo = await this.repository.modelViagem.findOne({
            veiculo_id: parsedData.veiculo_id,
            status: 'em_andamento'
        });

        if (viagemAtivaVeiculo) {
            throw new CustomError({
                statusCode: HttpStatusCodes.CONFLICT.code,
                errorType: 'businessRuleError',
                field: 'veiculo_id',
                customMessage: 'Este veículo já está sendo utilizado em outra viagem em andamento.',
            });
        }

        // Validação de KM Inicial (Não pode retroceder)
        const ultimaKm = await this.repository.buscarUltimaKmDoVeiculo(parsedData.veiculo_id);
        if (parsedData.km_inicial < ultimaKm) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'businessRuleError',
                field: 'km_inicial',
                customMessage: `O KM inicial (${parsedData.km_inicial}) não pode ser menor que o KM final da última viagem do veículo (${ultimaKm}).`,
            });
        }

        // Snapshot do veículo
        const veiculo = await this.veiculoRepository.buscarPorID(parsedData.veiculo_id);
        parsedData.veiculo_snapshot = {
            placa: veiculo.placa,
            modelo: veiculo.modelo,
            reboque: {
                modelo: veiculo.reboque?.modelo,
                placas: veiculo.reboque?.placas
            }
        };

        // Snapshot do motorista (Usuário)
        const motorista = await this.usuarioRepository.buscarPorID(parsedData.usuario_id);
        parsedData.usuario_snapshot = {
            nome: motorista.nome,
            email: motorista.email
        };

        // Associação automática com a empresa do motorista ou do veículo
        parsedData.empresa_id = parsedData.empresa_id || motorista.empresa_id || veiculo.empresa_id || null;

        const data = await this.repository.criar(parsedData);
        return data;
    }

    async atualizar(id, parsedData, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        const viagemOriginal = await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Viagem');

        const isOwner = String(viagemOriginal.usuario_id._id || viagemOriginal.usuario_id) === String(usuarioLogado._id);

        ensurePermission({
            usuarioLogado,
            isOwner,
            empresaId: viagemOriginal.empresa_id,
            field: 'Atualização de Viagem',
            customMessage: 'Você não tem permissão para atualizar esta viagem.',
        });

        // Impedir alteração em viagens já finalizadas/canceladas)
        if (viagemOriginal.status !== 'em_andamento' && !usuarioLogado.isAdmin) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'businessRuleError',
                field: 'status',
                customMessage: `Esta viagem já está com status '${viagemOriginal.status}' e não pode mais ser alterada.`,
            });
        }

        // Validação para Fechamento (Status: concluída)
        if (parsedData.status === 'concluída') {
            // Garantir KM Final
            const kmFinal = parsedData.km_final || viagemOriginal.km_final;
            if (!kmFinal) {
                throw new CustomError({
                    statusCode: HttpStatusCodes.BAD_REQUEST.code,
                    errorType: 'validationError',
                    field: 'km_final',
                    customMessage: 'O KM final é obrigatório para concluir a viagem.',
                });
            }

            // Validar KM Final > Inicial
            if (kmFinal <= viagemOriginal.km_inicial) {
                throw new CustomError({
                    statusCode: HttpStatusCodes.BAD_REQUEST.code,
                    errorType: 'businessRuleError',
                    field: 'km_final',
                    customMessage: `O KM final (${kmFinal}) deve ser maior que o KM inicial (${viagemOriginal.km_inicial}).`,
                });
            }

            // Preencher data_fim automaticamente se não enviada
            if (!parsedData.data_fim) {
                parsedData.data_fim = new Date();
            }
        }

        const data = await this.repository.atualizar(id, parsedData);
        return data;
    }
    async deletar(id, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);

        await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Viagem');

        ensurePermission({
            usuarioLogado,
            isOwner: false,
            field: 'Exclusão de Viagem',
            customMessage: 'Apenas administradores podem deletar viagens.',
        });

        const data = await this.repository.deletar(id);
        return data;
    }
}

export default ViagemService;
