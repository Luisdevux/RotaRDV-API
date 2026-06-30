// src/controllers/DespesaController.js

import {
  CommonResponse,
  HttpStatusCodes,
  messages,
} from '../utils/helpers/index.js';
import DespesaService from '../services/DespesaService.js';
import { DespesaSchema } from '../utils/validators/schemas/zod/DespesaSchema.js';
import { DespesaQuerySchema } from '../utils/validators/schemas/zod/querys/DespesaQuerySchema.js';

class DespesaController {
  constructor() {
    this.service = new DespesaService();
  }

  criar = async (req, res) => {
    const body = req.body || {};
    const parsedData = DespesaSchema.parse(body);

    const data = await this.service.criar(parsedData, req);
    return CommonResponse.created(res, data, 'Despesa registrada com sucesso.');
  };

  listar = async (req, res) => {
    // Valida as queries
    const queryParams = DespesaQuerySchema.parse(req.query);
    // Anexa os parâmetros validados ao request para o repositório usar
    req.validatedQuery = queryParams;

    const data = await this.service.listar(req);
    
    const { id } = req.params;
    if (id) {
        return CommonResponse.success(
            res,
            data,
            HttpStatusCodes.OK.code,
            'Despesa encontrada com sucesso.'
        );
    }

    const totalDocs = data?.totalDocs ?? data?.docs?.length ?? 0;
    if (totalDocs === 0) {
        return CommonResponse.success(
            res,
            data,
            HttpStatusCodes.OK.code,
            'Nenhuma despesa encontrada.'
        );
    }

    return CommonResponse.success(
        res,
        data,
        HttpStatusCodes.OK.code,
        `${totalDocs} despesa(s) encontrada(s).`
    );
  };

  deletar = async (req, res) => {
    const { id } = req.params;
    await this.service.deletar(id, req);
    return CommonResponse.success(
      res,
      null,
      HttpStatusCodes.OK.code,
      'Despesa deletada com sucesso.',
    );
  };
}

export default DespesaController;
