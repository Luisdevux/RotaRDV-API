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
        },
        post: {
            tags: ["Veículos"],
            summary: "Cria um novo veículo",
            description: `
        + Caso de uso: Permite o cadastro de um novo veículo na plataforma.
        + Regras de Negócio: Apenas usuários com perfil "Administrador" têm permissão para criar veículos. Placa deve ser obrigatoriamente única.
            `,
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/VeiculoCriacao"
                        }
                    }
                }
            },
            responses: {
                201: commonResponses[201]("#/components/schemas/VeiculoListagem"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](null, "Acesso negado - Apenas Administradores podem executar esta ação."),
                409: commonResponses[409](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },
    "/veiculos/{id}": {
        get: {
            tags: ["Veículos"],
            summary: "Busca um veículo específico pelo ID",
            description: "Retorna as informações de um único veículo. Apenas Administradores ou motoristas vinculados a este veículo podem consultar.",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "ID do veículo"
                }
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/VeiculoListagem"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },
        patch: {
            tags: ["Veículos"],
            summary: "Atualiza um veículo existente",
            description: "Permite atualizar os dados de um veículo. Apenas Administradores podem atualizar.",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "ID do veículo"
                }
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/VeiculoAtualizacao"
                        }
                    }
                }
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/VeiculoListagem"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](null, "Acesso negado - Apenas Administradores podem atualizar."),
                404: commonResponses[404](),
                409: commonResponses[409](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },
        delete: {
            tags: ["Veículos"],
            summary: "Remove um veículo",
            description: "Deleta um veículo do sistema. Apenas Administradores podem realizar esta exclusão.",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "ID do veículo"
                }
            ],
            responses: {
                200: {
                    description: "Operação bem-sucedida.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    erro: { type: "boolean", example: false },
                                    mensagem: { type: "string", example: "Veículo deletado com sucesso." }
                                }
                            }
                        }
                    }
                },
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](null, "Acesso negado - Apenas Administradores podem deletar."),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    }
};

export default veiculoRoutes;
