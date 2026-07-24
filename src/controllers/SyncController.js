// src/controllers/SyncController.js

import SyncService from '../services/SyncService.js';
import { SyncPayloadSchema } from '../utils/validators/schemas/zod/SyncSchema.js';
import {
    CommonResponse,
    CustomError,
    HttpStatusCodes,
} from '../utils/helpers/index.js';

class SyncController {
    constructor() {
        this.service = new SyncService();
    }

    async push(req, res) {
        if(!req.body || Object.keys(req.body).length === 0) {
          throw new CustomError({
              statusCode: HttpStatusCodes.BAD_REQUEST.code,
              errorType: 'validationError',
              field: 'body',
              customMessage: 'O corpo da requisição é obrigatório para sincronização.',
          });
        }

        const payload = await SyncPayloadSchema.parseAsync(req.body);
        const data = await this.service.pushSync({ _id: req.user_id }, payload.viagens, payload.despesas);

        return CommonResponse.success(
            res,
            data,
            HttpStatusCodes.OK.code,
            'Sincronização Push concluída com sucesso!'
        );
    }
    async pull(req, res) {
        const { updatedAfter } = req.query;
        const data = await this.service.pullSync({ _id: req.user_id }, updatedAfter);

        return CommonResponse.success(
            res,
            data,
            HttpStatusCodes.OK.code,
            'Sincronização Pull concluída com sucesso!'
        );
    }
}

export default SyncController;
