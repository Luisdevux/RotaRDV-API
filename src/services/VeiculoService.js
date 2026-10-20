// src/services/VeiculoService.js

import {
    CustomError,
    HttpStatusCodes,
    ensurePermission,
    ValidationHelper
} from '../utils/helpers/index.js';
import UsuarioRepository from '../repositories/UsuarioRepository.js';
import VeiculoRepository from '../repositories/VeiculoRepository.js';
import EmpresaRepository from '../repositories/EmpresaRepository.js';

class VeiculoService {
    constructor() {
        this.repository = new VeiculoRepository();
        this.usuarioRepository = new UsuarioRepository();
        this.empresaRepository = new EmpresaRepository();
    }

    async listar(req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        const isSuperAdmin = usuarioLogado?.role === 'superAdmin';
        const isAdmin = Boolean(usuarioLogado?.role === 'admin' || isSuperAdmin);
        const isGestor = usuarioLogado?.role === 'gestor';

        const { id } = req.params;

        if (id) {
            // Se está buscando um veículo específico, verifica permissão (Admin, Gestor da empresa do veículo, ou Motorista vinculado)
            const veiculo = await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Veículo');
            const isMotoristaDesteVeiculo = usuarioLogado.veiculo_id && String(usuarioLogado.veiculo_id) === String(id);
            let isAdminDestaEmpresa = false;
            if (isAdmin && !isSuperAdmin && veiculo.empresa_id) {
                try {
                    await ValidationHelper.validarAcessoEmpresaAdmin(this.empresaRepository, usuarioLogado, veiculo.empresa_id);
                    isAdminDestaEmpresa = true;
                } catch (_) {}
            }
            const temAcessoAoVeiculo = isMotoristaDesteVeiculo || isAdminDestaEmpresa;

            ensurePermission({
                usuarioLogado,
                isOwner: temAcessoAoVeiculo,
                empresaId: veiculo.empresa_id,
                field: 'Consulta de Veículo',
                customMessage: 'Você não tem permissões para acessar os dados deste veículo.',
            });
        }

        const filtrosOverride = {};

        if (!id) {
            if (isSuperAdmin) {
                // Super Admin visualiza veículos de qualquer empresa ou filtra por empresa_id na query
                if (req.query?.empresa_id) {
                    filtrosOverride.empresa_id = String(req.query.empresa_id);
                }
            } else if (isAdmin) {
                const targetEmpresaId = req.query?.empresa_id || req.validatedQuery?.empresa_id;
                if (targetEmpresaId) {
                    await ValidationHelper.validarAcessoEmpresaAdmin(this.empresaRepository, usuarioLogado, targetEmpresaId);
                    filtrosOverride.empresa_id = String(targetEmpresaId);
                } else {
                    filtrosOverride.empresa_id = String(usuarioLogado.empresa_id);
                }
            } else if (isGestor) {
                // Admin interno ou Gestor: restrito à frota da sua empresa
                filtrosOverride.empresa_id = String(usuarioLogado.empresa_id);
            } else {
                // Motorista: visualiza apenas o veículo atribuído ao seu perfil
                if (usuarioLogado.veiculo_id) {
                    filtrosOverride._id = String(usuarioLogado.veiculo_id._id || usuarioLogado.veiculo_id);
                } else {
                    throw new CustomError({
                        statusCode: HttpStatusCodes.FORBIDDEN.code,
                        errorType: 'forbidden',
                        field: 'Consulta de Veículo',
                        details: [],
                        customMessage: 'Você não possui nenhum veículo vinculado ao seu perfil. Entre em contato com a administração.',
                    });
                }
            }
        }

        const data = await this.repository.listar(req, filtrosOverride);
        return data;
    }

    async criar(parsedData, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        const isSuperAdmin = usuarioLogado?.role === 'superAdmin';
        const isAdmin = Boolean(usuarioLogado?.role === 'admin' || isSuperAdmin);
        const isGestor = usuarioLogado?.role === 'gestor';

        if (!isAdmin && !isGestor) {
            throw new CustomError({
                statusCode: HttpStatusCodes.FORBIDDEN.code,
                errorType: 'permissionError',
                field: 'Criação de Veículo',
                customMessage: 'Apenas administradores e gestores podem cadastrar novos veículos.',
            });
        }

        // Se for admin interno ou gestor, vincula à filial informada ou à sua empresa
        if (!isSuperAdmin) {
            if (usuarioLogado?.role === 'admin' && parsedData.empresa_id) {
                await ValidationHelper.validarAcessoEmpresaAdmin(this.empresaRepository, usuarioLogado, parsedData.empresa_id);
            } else if (usuarioLogado.empresa_id) {
                parsedData.empresa_id = usuarioLogado.empresa_id;
            }
        }

        await ValidationHelper.validatePlaca(this.repository, parsedData.placa);

        const data = await this.repository.criar(parsedData);
        return data;
    }

    async atualizar(id, parsedData, req) {
        const veiculo = await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Veículo');
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        const isAdmin = Boolean(usuarioLogado?.role === 'admin' || usuarioLogado?.role === 'superAdmin');

        let isOwnerAdmin = false;
        if (isAdmin && usuarioLogado?.role !== 'superAdmin' && veiculo.empresa_id) {
            try {
                await ValidationHelper.validarAcessoEmpresaAdmin(this.empresaRepository, usuarioLogado, veiculo.empresa_id);
                isOwnerAdmin = true;
            } catch (_) {}
        }

        ensurePermission({
            usuarioLogado,
            isOwner: isOwnerAdmin,
            empresaId: veiculo.empresa_id,
            field: 'Atualização de Veículo',
            customMessage: 'Você não tem permissão para atualizar dados deste veículo.',
        });

        if (parsedData.placa) {
            await ValidationHelper.validatePlaca(this.repository, parsedData.placa, id);
        }

        const data = await this.repository.atualizar(id, parsedData);
        return data;
    }

    async deletar(id, req) {
        const veiculo = await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Veículo');
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        const isAdmin = Boolean(usuarioLogado?.role === 'admin' || usuarioLogado?.role === 'superAdmin');

        let isOwnerAdmin = false;
        if (isAdmin && usuarioLogado?.role !== 'superAdmin' && veiculo.empresa_id) {
            try {
                await ValidationHelper.validarAcessoEmpresaAdmin(this.empresaRepository, usuarioLogado, veiculo.empresa_id);
                isOwnerAdmin = true;
            } catch (_) {}
        }

        ensurePermission({
            usuarioLogado,
            isOwner: isOwnerAdmin,
            empresaId: veiculo.empresa_id,
            field: 'Exclusão de Veículo',
            customMessage: 'Você não tem permissão para deletar este veículo.',
        });

        const data = await this.repository.deletar(id);
        return data;
    }
}

export default VeiculoService;
