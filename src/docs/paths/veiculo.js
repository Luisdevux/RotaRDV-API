// src/docs/paths/veiculo.js

import commonResponses from "../schemas/swaggerCommonResponses.js";
import veiculoSchemas from "../schemas/veiculoSchema.js";
import { generateParameters } from "./utils/generateParameters.js";

const veiculoRoutes = {
    "/veiculos": {
        get: {
            tags: ["Veículos"],
            summary: "Lista todos os veículos ou busca um específico",
            description: `
        + Caso de uso: Permitir a listagem de todos os veículos cadastrados ou aplicar filtros dinâmicos de busca de cavalos e carretas.

        + Função de Negócio:
            - Permitir ao front-end obter uma lista paginada dos veículos cadastrados.
            + Recebe como query parameters (opcionais):
                • filtros: modelo, placa, reboque_placa, reboque_modelo.

        + Regras de Negócio:
            - Apenas administradores podem listar todos sem filtros abertamente.
            - Suporte a paginação via parâmetros page e limite.

        + Resultado Esperado:
            - 200 OK com corpo retornando uma estrutura preenchida conforme o schema **VeiculoListagem**.
      `,
            security: [{ bearerAuth: [] }],
            parameters: [
                ...generateParameters(veiculoSchemas.VeiculoFiltro),
                {
                    name: "limite",
                    in: "query",
                    schema: { type: "number" },
                    required: false,
                    description: "Quantidade de registros por página"
                },
                {
                    name: "page",
                    in: "query",
                    schema: { type: "number" },
                    required: false,
                    description: "Número da página"
                }
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/VeiculoListagem"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: {
                    description: "Forbidden - Apenas administradores podem listar todos os veículos.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    erro: { type: "boolean", example: true },
                                    mensagem: { type: "string", example: "Você não tem permissão para acessar este recurso." }
                                }
                            }
                        }
                    }
                },
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    }
};

export default veiculoRoutes;
