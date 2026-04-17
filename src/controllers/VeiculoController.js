// src/controllers/VeiculoController.js

import VeiculoService from '../services/VeiculoService.js';
import {
    VeiculoSchema,
    VeiculoUpdateSchema,
} from '../utils/validators/schemas/zod/VeiculoSchema.js';
import {
    VeiculoQuerySchema,
    VeiculoIdSchema,
} from '../utils/validators/schemas/zod/querys/VeiculoQuerySchema.js';
import {
    CommonResponse,
    CustomError,
    HttpStatusCodes,
    messages,
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
}

export default VeiculoController;
