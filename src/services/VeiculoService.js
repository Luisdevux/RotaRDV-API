// src/services/VeiculoService.js

import {
    CustomError,
    HttpStatusCodes,
    messages,
    ensurePermission
} from '../utils/helpers/index.js';
import UsuarioRepository from '../repositories/UsuarioRepository.js';
import VeiculoRepository from '../repositories/VeiculoRepository.js';


class VeiculoService {
    constructor() {
        this.repository = new VeiculoRepository();
        this.usuarioRepository = new UsuarioRepository();
    }

    async validatePlaca(placa, excludeId = null) {
        const veiculoExistente = await this.repository.buscarPorPlaca(placa);
        if (veiculoExistente && String(veiculoExistente._id) !== String(excludeId)) {
            throw new CustomError({
                statusCode: HttpStatusCodes.CONFLICT.code,
                errorType: 'validationError',
                field: 'placa',
                customMessage: `A placa ${placa} já está cadastrada em outro veículo.`,
            });
        }
    }

    async listar(req) {
      const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);

      if (req.params?.id) {
          // Se está buscando um veículo específico, verifica permissão (Admin ou se o usuário logado está vinculado a este veículo)
          const isVinculadoAoVeiculo = usuarioLogado.veiculo_id && String(usuarioLogado.veiculo_id) === String(req.params.id);

          ensurePermission({
              usuarioLogado,
              isOwner: isVinculadoAoVeiculo,
              field: 'Consulta de Veículo',
              customMessage: 'Você não tem permissões para acessar os dados deste veículo.',
          });
      }

      const filtrosOverride = {};

      const { id } = req.params;
      if (!id) {
          // Se for listagem geral e for motorista, só pode listar o veículo atrelado a ele.
          if (!usuarioLogado.isAdmin) {
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
        // Apenas administradores podem criar veículos
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);

        ensurePermission({
            usuarioLogado,
            isOwner: false,
            field: 'Criação de Veículo',
            customMessage: 'Apenas administradores podem cadastrar novos veículos.',
        });

        await this.validatePlaca(parsedData.placa);

        const data = await this.repository.criar(parsedData);
        return data;
    }

    async atualizar(id, parsedData, req) {
        // Apenas administradores podem atualizar veículos
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);

        ensurePermission({
            usuarioLogado,
            isOwner: false,
            field: 'Atualização de Veículo',
            customMessage: 'Apenas administradores podem atualizar veículos.',
        });

        if (parsedData.placa) {
            await this.validatePlaca(parsedData.placa, id);
        }

        const data = await this.repository.atualizar(id, parsedData);
        return data;
    }

    async deletar(id, req) {
        // Apenas administradores podem deletar veículos
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);

        ensurePermission({
            usuarioLogado,
            isOwner: false,
            field: 'Exclusão de Veículo',
            customMessage: 'Apenas administradores podem deletar veículos.',
        });

        const data = await this.repository.deletar(id);
        return data;
    }
}

export default VeiculoService;
