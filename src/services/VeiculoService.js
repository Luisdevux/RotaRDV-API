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

    async listar(req) {
      const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);

      if (req.params?.id) {
          // Se está buscando um veículo específico, verifica permissão (Admin ou se o usuário logado está vinculado a este veículo)
          const isVinculadoAoVeiculo = usuarioLogado.veiculo_id && String(usuarioLogado.veiculo_id) === String(req.params.id);
          
          if (!usuarioLogado.isAdmin && !isVinculadoAoVeiculo) {
              throw new CustomError({
                  statusCode: HttpStatusCodes.FORBIDDEN.code,
                  errorType: 'permissionError',
                  field: 'Consulta de Veículo',
                  customMessage: 'Você não tem permissões para acessar os dados deste veículo.',
              });
          }
      } else {
          // Se está listando todos os veículos, apenas Admin tem permissão
          if (!usuarioLogado || !usuarioLogado.isAdmin) {
              throw new CustomError({
                  statusCode: HttpStatusCodes.FORBIDDEN.code,
                  errorType: 'permissionError',
                  field: 'Consulta',
                  customMessage: 'Apenas administradores podem listar todos os veículos.',
              });
          }
      }

      const data = await this.repository.listar(req);
      return data;
    }
}

export default VeiculoService;
