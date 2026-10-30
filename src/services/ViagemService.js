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
import EmpresaRepository from '../repositories/EmpresaRepository.js';
import ViagemDomainValidator from '../utils/validators/domain/ViagemDomainValidator.js';
import '../models/Despesa.js';

class ViagemService {
    constructor() {
        this.repository = new ViagemRepository();
        this.usuarioRepository = new UsuarioRepository();
        this.veiculoRepository = new VeiculoRepository();
        this.empresaRepository = new EmpresaRepository();
    }

    _montarResumoFinanceiro(resultados, viagem) {
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
                total_litros_arla: 0,
                media_consumo: 0 // km/l (apenas combustível do motor, sem Arla 32)
            }
        };

        let maxKmRegistrado = 0;
        let maxKmCombustivel = 0;

        (resultados || []).forEach((res) => {
            if (res._id in resumo.por_categoria) {
                resumo.por_categoria[res._id] = res.total;
                resumo.total_geral += res.total;
            }
            if (res._id === 'ABASTECIMENTO') {
                resumo.metricas.total_litros = res.litros_combustivel || 0;
                resumo.metricas.total_litros_arla = res.litros_arla || 0;
                if (res.max_km_atual) {
                    maxKmRegistrado = res.max_km_atual;
                }
                if (res.max_km_combustivel) {
                    maxKmCombustivel = res.max_km_combustivel;
                }
            }
        });

        // Calcula distância e média de consumo (km/l) exclusivamente sobre o combustível (excluindo Arla 32)
        if (viagem) {
            const kmInicial = viagem.km_inicial || 0;
            let kmParaConsumo = 0;

            if (viagem.km_final && viagem.km_final > kmInicial) {
                resumo.metricas.km_percorrido = viagem.km_final - kmInicial;
                kmParaConsumo = resumo.metricas.km_percorrido;
            } else {
                if (maxKmRegistrado > kmInicial) {
                    resumo.metricas.km_percorrido = maxKmRegistrado - kmInicial;
                }
                if (maxKmCombustivel > kmInicial) {
                    kmParaConsumo = maxKmCombustivel - kmInicial;
                }
            }

            if (resumo.metricas.total_litros > 0 && kmParaConsumo > 0) {
                resumo.metricas.media_consumo = parseFloat(
                    (kmParaConsumo / resumo.metricas.total_litros).toFixed(2)
                );
            }
        }

        return resumo;
    }

    async _calcularResumoFinanceiro(viagemId, viagemDoc = null) {
        const Despesa = mongoose.model('despesas');
        const Viagem = mongoose.model('viagens');

        // Se não passarem o doc da viagem, buscamos os dados básicos de KM
        const viagem = viagemDoc || await Viagem.findById(viagemId).select('km_inicial km_final');
        const matchIds = [String(viagemId)];
        if (mongoose.Types.ObjectId.isValid(viagemId) && String(new mongoose.Types.ObjectId(viagemId)) === String(viagemId)) {
            matchIds.push(new mongoose.Types.ObjectId(viagemId));
        }

        const pipeline = [
            { $match: { viagem_id: { $in: matchIds } } },
            {
                $group: {
                    _id: '$tipo',
                    total: { $sum: '$valor_total' },
                    litros_combustivel: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ['$tipo', 'ABASTECIMENTO'] },
                                        { $ne: ['$tipo_combustivel', 'ARLA_32'] }
                                    ]
                                },
                                { $ifNull: ['$litros', 0] },
                                0
                            ]
                        }
                    },
                    litros_arla: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ['$tipo', 'ABASTECIMENTO'] },
                                        { $eq: ['$tipo_combustivel', 'ARLA_32'] }
                                    ]
                                },
                                { $ifNull: ['$litros', 0] },
                                0
                            ]
                        }
                    },
                    max_km_combustivel: {
                        $max: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ['$tipo', 'ABASTECIMENTO'] },
                                        { $ne: ['$tipo_combustivel', 'ARLA_32'] }
                                    ]
                                },
                                { $ifNull: ['$km_atual', 0] },
                                0
                            ]
                        }
                    },
                    max_km_atual: {
                        $max: {
                            $cond: [{ $eq: ['$tipo', 'ABASTECIMENTO'] }, { $ifNull: ['$km_atual', 0] }, 0]
                        }
                    }
                },
            },
        ];

        const resultados = await Despesa.aggregate(pipeline);
        return this._montarResumoFinanceiro(resultados, viagem);
    }

    async _calcularResumoFinanceiroEmLote(viagensDocs) {
        const mapaResumos = new Map();
        if (!Array.isArray(viagensDocs) || viagensDocs.length === 0) {
            return mapaResumos;
        }

        const Despesa = mongoose.model('despesas');
        const matchIds = [];

        for (const doc of viagensDocs) {
            const idStr = String(doc._id);
            matchIds.push(idStr);
            if (mongoose.Types.ObjectId.isValid(idStr) && String(new mongoose.Types.ObjectId(idStr)) === idStr) {
                matchIds.push(new mongoose.Types.ObjectId(idStr));
            }
        }

        const pipeline = [
            { $match: { viagem_id: { $in: matchIds } } },
            {
                $group: {
                    _id: {
                        viagem_id: { $toString: '$viagem_id' },
                        tipo: '$tipo',
                    },
                    total: { $sum: '$valor_total' },
                    litros_combustivel: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ['$tipo', 'ABASTECIMENTO'] },
                                        { $ne: ['$tipo_combustivel', 'ARLA_32'] }
                                    ]
                                },
                                { $ifNull: ['$litros', 0] },
                                0
                            ]
                        }
                    },
                    litros_arla: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ['$tipo', 'ABASTECIMENTO'] },
                                        { $eq: ['$tipo_combustivel', 'ARLA_32'] }
                                    ]
                                },
                                { $ifNull: ['$litros', 0] },
                                0
                            ]
                        }
                    },
                    max_km_combustivel: {
                        $max: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ['$tipo', 'ABASTECIMENTO'] },
                                        { $ne: ['$tipo_combustivel', 'ARLA_32'] }
                                    ]
                                },
                                { $ifNull: ['$km_atual', 0] },
                                0
                            ]
                        }
                    },
                    max_km_atual: {
                        $max: {
                            $cond: [{ $eq: ['$tipo', 'ABASTECIMENTO'] }, { $ifNull: ['$km_atual', 0] }, 0]
                        }
                    }
                },
            },
        ];

        const resultadosLote = await Despesa.aggregate(pipeline);
        const agrupadoPorViagem = new Map();

        for (const item of resultadosLote) {
            const vId = item._id.viagem_id;
            if (!agrupadoPorViagem.has(vId)) {
                agrupadoPorViagem.set(vId, []);
            }
            agrupadoPorViagem.get(vId).push({
                _id: item._id.tipo,
                total: item.total,
                litros_combustivel: item.litros_combustivel,
                litros_arla: item.litros_arla,
                max_km_combustivel: item.max_km_combustivel,
                max_km_atual: item.max_km_atual,
            });
        }

        for (const doc of viagensDocs) {
            const vId = String(doc._id);
            const resultadosViagem = agrupadoPorViagem.get(vId) || [];
            mapaResumos.set(vId, this._montarResumoFinanceiro(resultadosViagem, doc));
        }

        return mapaResumos;
    }

    async listar(req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        const isSuperAdmin = usuarioLogado?.role === 'superAdmin';
        const isAdmin = Boolean(usuarioLogado?.role === 'admin' || isSuperAdmin);
        const isGestor = usuarioLogado?.role === 'gestor';
        const { id } = req.params;

        if (id) {
            const viagem = await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Viagem');

            const isMotoristaDestaViagem = String(viagem.usuario_id._id || viagem.usuario_id) === String(usuarioLogado._id);
            let isAdminDestaEmpresa = false;
            if (isAdmin && !isSuperAdmin && viagem.empresa_id) {
                try {
                    await ValidationHelper.validarAcessoEmpresaAdmin(this.empresaRepository, usuarioLogado, viagem.empresa_id);
                    isAdminDestaEmpresa = true;
                } catch (_) {}
            }
            const temAcessoAViagem = isMotoristaDestaViagem || isAdminDestaEmpresa;

            ensurePermission({
                usuarioLogado,
                isOwner: temAcessoAViagem,
                empresaId: viagem.empresa_id,
                field: 'Consulta de Viagem',
                customMessage: 'Você não tem permissão para acessar os dados desta viagem.',
            });

            // Converter para objeto plano para injetar o resumo dinâmico
            const viagemObj = viagem.toObject ? viagem.toObject() : viagem;
            viagemObj.resumo_financeiro = await this._calcularResumoFinanceiro(id, viagem);

            return viagemObj;
        }

        const filtrosOverride = {};

        if (!isSuperAdmin) {
            if (isAdmin) {
                const targetEmpresaId = req.query?.empresa_id || req.validatedQuery?.empresa_id;
                if (targetEmpresaId) {
                    await ValidationHelper.validarAcessoEmpresaAdmin(this.empresaRepository, usuarioLogado, targetEmpresaId);
                    filtrosOverride.empresa_id = String(targetEmpresaId);
                } else {
                    filtrosOverride.empresa_id = String(usuarioLogado.empresa_id);
                }
            } else if (isGestor) {
                filtrosOverride.empresa_id = String(usuarioLogado.empresa_id);
            } else {
                filtrosOverride.usuario_id = String(usuarioLogado._id);
            }
        } else {
            const { empresa_id } = req.validatedQuery || req.query || {};
            if (empresa_id) {
                filtrosOverride.empresa_id = String(empresa_id);
            }
        }

        const data = await this.repository.listar(req, filtrosOverride);
        if (data && data.docs && Array.isArray(data.docs) && data.docs.length > 0) {
            const mapaResumos = await this._calcularResumoFinanceiroEmLote(data.docs);
            for (const doc of data.docs) {
                doc.resumo_financeiro = mapaResumos.get(String(doc._id)) || this._montarResumoFinanceiro([], doc);
            }
        }
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

        if (parsedData.status === 'concluida') {
            parsedData.status = 'concluída';
        }

        // Validação unificada de regras de negócio da viagem
        const ultimaKm = await this.repository.buscarUltimaKmDoVeiculo(parsedData.veiculo_id);
        const validacao = ViagemDomainValidator.validar(parsedData, ultimaKm);
        if (!validacao.valido) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'businessRuleError',
                field: validacao.campo || 'km_inicial',
                customMessage: validacao.motivo,
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

        if (data && data.status === 'concluída' && data.km_final) {
            const veiculoId = data.veiculo_id?._id || data.veiculo_id || parsedData.veiculo_id;
            if (veiculoId) {
                try {
                    await this.veiculoRepository.modelVeiculo.findByIdAndUpdate(veiculoId, {
                        $max: { km_atual: Number(data.km_final) }
                    });
                } catch (_) {}
            }
        }

        return data;
    }

    async atualizar(id, parsedData, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        const viagemOriginal = await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Viagem');

        const isMotoristaDestaViagem = String(viagemOriginal.usuario_id._id || viagemOriginal.usuario_id) === String(usuarioLogado._id);
        const isAdmin = Boolean(usuarioLogado?.role === 'admin' || usuarioLogado?.role === 'superAdmin');

        let isAdminDestaEmpresa = false;
        if (isAdmin && usuarioLogado?.role !== 'superAdmin' && viagemOriginal.empresa_id) {
            try {
                await ValidationHelper.validarAcessoEmpresaAdmin(this.empresaRepository, usuarioLogado, viagemOriginal.empresa_id);
                isAdminDestaEmpresa = true;
            } catch (_) {}
        }
        const podeAtualizarViagem = isMotoristaDestaViagem || isAdminDestaEmpresa;

        ensurePermission({
            usuarioLogado,
            isOwner: podeAtualizarViagem,
            empresaId: viagemOriginal.empresa_id,
            field: 'Atualização de Viagem',
            customMessage: 'Você não tem permissão para atualizar esta viagem.',
        });

        // Impedir alteração em viagens já finalizadas/canceladas por usuários sem privilégio administrativo
        const podeReabrirOuEditarFinalizada = Boolean(isAdmin || usuarioLogado?.isAdmin);
        if (viagemOriginal.status !== 'em_andamento' && !podeReabrirOuEditarFinalizada) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'businessRuleError',
                field: 'status',
                customMessage: `Esta viagem já está com status '${viagemOriginal.status}' e não pode mais ser alterada.`,
            });
        }

        if (parsedData.status === 'concluida') {
            parsedData.status = 'concluída';
        }

        // Validação unificada para Fechamento (Status: concluída)
        if (parsedData.status === 'concluída') {
            const kmFinal = parsedData.km_final || viagemOriginal.km_final;
            const viagemParaValidar = {
                ...(viagemOriginal.toObject ? viagemOriginal.toObject({ getters: false }) : viagemOriginal),
                ...parsedData,
                km_final: kmFinal
            };

            const validacao = ViagemDomainValidator.validar(viagemParaValidar);
            if (!validacao.valido) {
                throw new CustomError({
                    statusCode: HttpStatusCodes.BAD_REQUEST.code,
                    errorType: 'businessRuleError',
                    field: validacao.campo || 'km_final',
                    customMessage: validacao.motivo,
                });
            }

            // Preencher data_fim automaticamente se não enviada
            if (!parsedData.data_fim) {
                parsedData.data_fim = new Date();
            }
        }

        if (parsedData.status === 'cancelada') {
            if (!parsedData.data_fim) {
                parsedData.data_fim = new Date();
            }
        }

        const data = await this.repository.atualizar(id, parsedData);

        if (data && data.status === 'concluída' && data.km_final) {
            const veiculoId = data.veiculo_id?._id || data.veiculo_id || viagemOriginal?.veiculo_id?._id || viagemOriginal?.veiculo_id;
            if (veiculoId) {
                try {
                    await this.veiculoRepository.modelVeiculo.findByIdAndUpdate(veiculoId, {
                        $max: { km_atual: Number(data.km_final) }
                    });
                } catch (_) {}
            }
        }

        return data;
    }
    async deletar(id, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);

        const viagem = await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Viagem');

        const isSuperAdmin = usuarioLogado?.role === 'superAdmin';
        const isAdmin = Boolean(usuarioLogado?.role === 'admin' || isSuperAdmin);

        let isAdminDestaEmpresa = false;
        if (isAdmin && !isSuperAdmin && viagem.empresa_id) {
            try {
                await ValidationHelper.validarAcessoEmpresaAdmin(this.empresaRepository, usuarioLogado, viagem.empresa_id);
                isAdminDestaEmpresa = true;
            } catch (_) {}
        }

        ensurePermission({
            usuarioLogado,
            isOwner: isAdminDestaEmpresa,
            empresaId: viagem.empresa_id,
            field: 'Exclusão de Viagem',
            customMessage: 'Apenas administradores podem deletar viagens.',
        });

        await mongoose.model('despesas').deleteMany({ viagem_id: id });
        const data = await this.repository.deletar(id);
        return data;
    }
}

export default ViagemService;
