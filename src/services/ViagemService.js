// src/services/ViagemService.js

import {
    CustomError,
    HttpStatusCodes,
    messages,
    ensurePermission
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

    async listar(req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        const { id } = req.params;

        if (id) {
            const viagem = await this.repository.buscarPorID(id);
            const isOwner = String(viagem.usuario_id._id || viagem.usuario_id) === String(usuarioLogado._id);

            ensurePermission({
                usuarioLogado,
                isOwner,
                field: 'Consulta de Viagem',
                customMessage: 'Você não tem permissão para acessar os dados desta viagem.',
            });

            return viagem;
        }

        if (!usuarioLogado.isAdmin) {
            req.query.usuario_id = String(usuarioLogado._id);
        }

        const data = await this.repository.listar(req);
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

        const data = await this.repository.criar(parsedData);
        return data;
    }

    async atualizar(id, parsedData, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        const viagemOriginal = await this.repository.buscarPorID(id);

        const isOwner = String(viagemOriginal.usuario_id._id || viagemOriginal.usuario_id) === String(usuarioLogado._id);

        ensurePermission({
            usuarioLogado,
            isOwner,
            field: 'Atualização de Viagem',
            customMessage: 'Você não tem permissão para atualizar esta viagem.',
        });

        if (viagemOriginal.status !== 'em_andamento' && !usuarioLogado.isAdmin) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'businessRuleError',
                field: 'status',
                customMessage: 'Esta viagem já foi finalizada ou cancelada e não pode mais ser alterada.',
            });
        }

        const data = await this.repository.atualizar(id, parsedData);
        return data;
    }

    async deletar(id, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);

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
