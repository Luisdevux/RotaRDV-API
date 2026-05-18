// src/controllers/ViagemController.js

import ViagemService from '../services/ViagemService.js';
import {
    ViagemSchema,
    ViagemUpdateSchema,
} from '../utils/validators/schemas/zod/ViagemSchema.js';
import {
    ViagemQuerySchema,
    ViagemIdSchema,
} from '../utils/validators/schemas/zod/querys/ViagemQuerySchema.js';
import {
    CommonResponse,
    CustomError,
    HttpStatusCodes,
} from '../utils/helpers/index.js';

class ViagemController {
    constructor() {
        this.service = new ViagemService();
    }

    async listar(req, res) {
        const { id } = req.params;
        if (id) {
            ViagemIdSchema.parse(id);
        }

        const query = req.query;
        if(Object.keys(query).length !== 0) {
            await ViagemQuerySchema.parseAsync(query);
        }

        const data = await this.service.listar(req);

        if (id) {
            return CommonResponse.success(
                res,
                data,
                HttpStatusCodes.OK.code,
                'Viagem encontrada com sucesso.',
            );
        }

        const totalDocs = data?.totalDocs ?? data?.docs?.length ?? 0;
        if (totalDocs === 0) {
            return CommonResponse.success(
                res,
                data,
                HttpStatusCodes.OK.code,
                'Nenhuma viagem encontrada.',
            );
        }

        return CommonResponse.success(
            res,
            data,
            HttpStatusCodes.OK.code,
            `${totalDocs} viagem(s) encontrada(s).`,
        );
    }

    async criar(req, res) {
        if(!req.body || Object.keys(req.body).length === 0) {
          throw new CustomError({
              statusCode: HttpStatusCodes.BAD_REQUEST.code,
              errorType: 'validationError',
              field: 'body',
              customMessage: 'O corpo da requisição é obrigatório para criar uma viagem.',
          });
        }

        const parsedData = await ViagemSchema.parseAsync(req.body);
        const data = await this.service.criar(parsedData, req);

        return CommonResponse.created(res, data);
    }

    async atualizar(req, res) {
        const { id } = req.params;
        ViagemIdSchema.parse(id);

        if(!req.body || Object.keys(req.body).length === 0) {
          throw new CustomError({
              statusCode: HttpStatusCodes.BAD_REQUEST.code,
              errorType: 'validationError',
              field: 'body',
              customMessage: 'O corpo da requisição é obrigatório para atualizar uma viagem.',
          });
        }

        const parsedData = await ViagemUpdateSchema.parseAsync(req.body);
        const data = await this.service.atualizar(id, parsedData, req);

        return CommonResponse.success(
          res,
          data,
          HttpStatusCodes.OK.code,
          'Viagem atualizada com sucesso.'
        );
    }

    async deletar(req, res) {
        const { id } = req.params;
        ViagemIdSchema.parse(id);

        await this.service.deletar(id, req);
        return CommonResponse.success(
          res,
          null,
          HttpStatusCodes.OK.code,
          'Viagem deletada com sucesso.'
        );
    }
}

export default ViagemController;
