// src/controllers/VeiculoController.js

import VeiculoService from '../services/VeiculoService.js';
import {
    VeiculoSchema,
    VeiculoUpdateSchema,
    VeiculoStatusUpdateSchema,
} from '../utils/validators/schemas/zod/VeiculoSchema.js';
import {
    VeiculoQuerySchema,
    VeiculoIdSchema,
} from '../utils/validators/schemas/zod/querys/VeiculoQuerySchema.js';
import {
    CommonResponse,
    CustomError,
    HttpStatusCodes,
} from '../utils/helpers/index.js';

class VeiculoController {
    constructor() {
        this.service = new VeiculoService();
    }

    async listar(req, res) {
        const { id } = req.params;
        if (id) {
            VeiculoIdSchema.parse(id);
        }

        const query = req.query;
        if(Object.keys(query).length !== 0) {
            await VeiculoQuerySchema.parseAsync(query);
        }

        const data = await this.service.listar(req);

        // Mensagem contextualizada para listagem
        if (id) {
            return CommonResponse.success(
                res,
                data,
                HttpStatusCodes.OK.code,
                'Veículo encontrado com sucesso.',
            );
        }

        // Resultado paginado - verificar se há resultados
        const totalDocs = data?.totalDocs ?? data?.docs?.length ?? 0;
        if (totalDocs === 0) {
            const temFiltros =
                query && (query.modelo || query.placa || query.reboque_placa || query.reboque_modelo);
            const mensagem = temFiltros
                ? 'Nenhum veículo encontrado com os filtros informados.'
                : 'Nenhum veículo cadastrado.';
            return CommonResponse.success(
                res,
                data,
                HttpStatusCodes.OK.code,
                mensagem,
            );
        }

        return CommonResponse.success(
            res,
            data,
            HttpStatusCodes.OK.code,
            `${totalDocs} veículo(s) encontrado(s).`,
        );
    }

    async criar(req, res) {
        // Validar se o body não está vazio
        if(!req.body || Object.keys(req.body).length === 0) {
          throw new CustomError({
              statusCode: HttpStatusCodes.BAD_REQUEST.code,
              errorType: 'validationError',
              field: 'body',
              details: [
                  {
                      path: 'body',
                      message: 'O corpo da requisição não pode ser vazio.',
                  },
              ],
              customMessage: 'O corpo da requisição é obrigatório para criar um veículo.',
          });
        }

        const parsedData = await VeiculoSchema.parse(req.body);
        const data = await this.service.criar(parsedData, req);

        return CommonResponse.created(res, data);
    }

    async atualizar(req, res) {
        const { id } = req.params;
        VeiculoIdSchema.parse(id);

        // Validar se o body não está vazio
        if(!req.body || Object.keys(req.body).length === 0) {
          throw new CustomError({
              statusCode: HttpStatusCodes.BAD_REQUEST.code,
              errorType: 'validationError',
              field: 'body',
              details: [
                  {
                      path: 'body',
                      message: 'O corpo da requisição não pode ser vazio.',
                  },
              ],
              customMessage: 'O corpo da requisição é obrigatório para atualizar um veículo.',
          });
        }

        const parsedData = await VeiculoUpdateSchema.parse(req.body);
        const data = await this.service.atualizar(id, parsedData, req);

        return CommonResponse.success(
          res,
          data,
          HttpStatusCodes.OK.code,
          'Veículo atualizado com sucesso.'
        );
    }

    async atualizarStatus(req, res) {
        const { id } = req.params;
        VeiculoIdSchema.parse(id);

        const parsedData = await VeiculoStatusUpdateSchema.parse(req.body);
        const data = await this.service.atualizar(id, { status: parsedData.status }, req);

        return CommonResponse.success(
          res,
          data,
          HttpStatusCodes.OK.code,
          `Status do veículo alterado para '${parsedData.status}' com sucesso.`
        );
    }

    async deletar(req, res) {
        const { id } = req.params;
        VeiculoIdSchema.parse(id);

        if(!id) {
          throw new CustomError({
              statusCode: HttpStatusCodes.BAD_REQUEST.code,
              errorType: 'validationError',
              field: 'id',
              details: [
                  {
                      path: 'id',
                      message: 'O ID do veículo é obrigatório.',
                  },
              ],
              customMessage: 'ID do veículo é obrigatório para deletar.',
          });
        }

        await this.service.deletar(id, req);
        return CommonResponse.success(
          res,
          null,
          HttpStatusCodes.OK.code,
          'Veículo deletado com sucesso.'
        );
    }
}
export default VeiculoController;
