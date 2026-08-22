// src/services/DespesaService.js

import DespesaRepository from '../repositories/DespesaRepository.js';
import ViagemRepository from '../repositories/ViagemRepository.js';
import UsuarioRepository from '../repositories/UsuarioRepository.js';
import UploadService from './UploadService.js';
import { CustomError, HttpStatusCodes, ValidationHelper } from '../utils/helpers/index.js';

class DespesaService {
    constructor() {
        this.repository = new DespesaRepository();
        this.viagemRepository = new ViagemRepository();
        this.usuarioRepository = new UsuarioRepository();
        this.uploadService = new UploadService();
    }

    async criar(dados, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);

        // 1. Busca a Viagem
        const viagem = await ValidationHelper.ensureExists(await this.viagemRepository.buscarPorID(dados.viagem_id), 'Viagem');

        // 2. Checagem de permissão: SuperAdmin, Admin, Dono (motorista) ou Gestor da empresa da viagem
        const isSuperAdmin = usuarioLogado?.role === 'superAdmin';
        const isAdmin = Boolean(usuarioLogado?.role === 'admin' || isSuperAdmin || usuarioLogado?.isAdmin);
        const isOwner = String(viagem.usuario_id?._id || viagem.usuario_id) === String(usuarioLogado._id);
        const isGestorDaEmpresa = (usuarioLogado?.role === 'gestor' || usuarioLogado?.role === 'admin') && String(usuarioLogado?.empresa_id) === String(viagem.empresa_id);

        if (!isSuperAdmin && !isAdmin && !isOwner && !isGestorDaEmpresa) {
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

        // 5. Checagem de Abastecimento Odômetro (KM)
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
        const isSuperAdmin = usuarioLogado?.role === 'superAdmin';
        const isAdmin = Boolean(usuarioLogado?.role === 'admin' || isSuperAdmin);
        const isGestor = usuarioLogado?.role === 'gestor';

        const filtrosOverride = {};

        if (isSuperAdmin) {
            // O usuário com papel de Super Admin pode listar e filtrar todas as despesas sem restrições
        } else if (isAdmin || isGestor) {
            // Já o usuário com papel de Admin ou Gestor visualiza despesas das viagens pertencentes à sua empresa
            const { viagem_id } = req.validatedQuery || req.query;

            if (viagem_id) {
                const viagem = await ValidationHelper.ensureExists(await this.viagemRepository.buscarPorID(viagem_id), 'Viagem');
                if (String(viagem.empresa_id) !== String(usuarioLogado.empresa_id)) {
                    throw new CustomError({
                        statusCode: HttpStatusCodes.FORBIDDEN.code,
                        errorType: 'forbidden',
                        field: 'viagem_id',
                        customMessage: 'Você não tem permissão para visualizar as despesas de uma viagem de outra empresa.'
                    });
                }
            } else {
                const viagens = await this.viagemRepository.modelViagem.find({ empresa_id: usuarioLogado.empresa_id }).select('_id');
                const viagensIds = viagens.map(v => v._id);
                filtrosOverride.viagem_id = { $in: viagensIds };
            }
        } else {
            // Motorista: visualiza apenas as despesas de suas próprias viagens
            const { viagem_id } = req.validatedQuery || req.query;

            if (!viagem_id) {
                // Sincronização offline-first: Retorna despesas de todas as viagens do motorista
                const viagens = await this.viagemRepository.modelViagem.find({ usuario_id: usuarioLogado._id }).select('_id');
                const viagensIds = viagens.map(v => v._id);
                filtrosOverride.viagem_id = { $in: viagensIds };
            } else {
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

        const isSuperAdmin = usuarioLogado?.role === 'superAdmin';
        const isAdmin = Boolean(usuarioLogado?.role === 'admin' || isSuperAdmin || usuarioLogado?.isAdmin);
        const isOwner = String(viagem.usuario_id?._id || viagem.usuario_id) === String(usuarioLogado._id);
        const isGestorDaEmpresa = (usuarioLogado?.role === 'gestor' || usuarioLogado?.role === 'admin') && String(usuarioLogado?.empresa_id) === String(viagem.empresa_id);

        if (!isSuperAdmin && !isAdmin && !isOwner && !isGestorDaEmpresa) {
            throw new CustomError({
                statusCode: HttpStatusCodes.FORBIDDEN.code,
                errorType: 'forbidden',
                field: 'Viagem',
                details: [],
                customMessage: 'Você não tem permissão para deletar esta despesa.'
            });
        }

        if (viagem.status !== 'em_andamento' && !isSuperAdmin && !isAdmin && !isGestorDaEmpresa) {
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

    // ================================
    // UPLOAD DE FOTO
    // ================================
    async fotoUpload(id, file, req) {
        const despesa = await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Despesa');
        const viagem = await ValidationHelper.ensureExists(await this.viagemRepository.buscarPorID(despesa.viagem_id), 'Viagem');
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);

        const isSuperAdmin = usuarioLogado?.role === 'superAdmin';
        const isAdmin = Boolean(usuarioLogado?.role === 'admin' || isSuperAdmin || usuarioLogado?.isAdmin);
        const isOwner = String(viagem.usuario_id?._id || viagem.usuario_id) === String(usuarioLogado._id);
        const isGestorDaEmpresa = (usuarioLogado?.role === 'gestor' || usuarioLogado?.role === 'admin') && String(usuarioLogado?.empresa_id) === String(viagem.empresa_id);

        if (!isSuperAdmin && !isAdmin && !isOwner && !isGestorDaEmpresa) {
            throw new CustomError({
                statusCode: HttpStatusCodes.FORBIDDEN.code,
                errorType: 'forbidden',
                field: 'Despesa',
                details: [],
                customMessage: 'Você não tem permissão para anexar comprovantes nesta despesa.'
            });
        }

        // O 'substituirImagem' já trata se 'despesa.foto_anexo' for null ou se não existir
        const uploadResult = await this.uploadService.substituirImagem(
            file,
            despesa.foto_anexo,
            { width: 1920, height: 1920, fit: 'inside', quality: 80 }
        );

        // Atualiza a URL no banco de dados
        await this.repository.atualizar(id, { foto_anexo: uploadResult.url });

        return uploadResult;
    }

    async fotoDelete(id, req) {
        const despesa = await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Despesa');
        const viagem = await ValidationHelper.ensureExists(await this.viagemRepository.buscarPorID(despesa.viagem_id), 'Viagem');
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);

        const isSuperAdmin = usuarioLogado?.role === 'superAdmin';
        const isAdmin = Boolean(usuarioLogado?.role === 'admin' || isSuperAdmin || usuarioLogado?.isAdmin);
        const isOwner = String(viagem.usuario_id?._id || viagem.usuario_id) === String(usuarioLogado._id);
        const isGestorDaEmpresa = (usuarioLogado?.role === 'gestor' || usuarioLogado?.role === 'admin') && String(usuarioLogado?.empresa_id) === String(viagem.empresa_id);

        if (!isSuperAdmin && !isAdmin && !isOwner && !isGestorDaEmpresa) {
            throw new CustomError({
                statusCode: HttpStatusCodes.FORBIDDEN.code,
                errorType: 'forbidden',
                field: 'Despesa',
                details: [],
                customMessage: 'Você não tem permissão para remover comprovantes desta despesa.'
            });
        }

        if (!despesa.foto_anexo) {
            throw new CustomError({
                statusCode: HttpStatusCodes.NOT_FOUND.code,
                errorType: 'resourceNotFound',
                field: 'foto_anexo',
                details: [],
                customMessage: 'Esta despesa não possui foto de comprovante para remover.'
            });
        }

        const urlAntiga = despesa.foto_anexo;

        // 1. Remove a URL do banco de dados imediatamente (resposta rápida, evita carregamento desnecessário da imagem)
        await this.repository.atualizar(id, { foto_anexo: "" });

        // 2. Deleta do Garage em background com retry (se falhar, apenas loga e não impacta o usuário)
        this.uploadService.deleteImagemComRetry(urlAntiga).catch(err => {
            console.error(`Erro isolado na exclusão da foto do comprovante no storage: ${err.message}`);
        });

        return true;
    }
}

export default DespesaService;
