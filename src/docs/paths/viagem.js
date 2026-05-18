// src/docs/paths/viagem.js

import commonResponses from "../schemas/swaggerCommonResponses.js";
import viagemSchemas from "../schemas/viagemSchema.js";
import { generateParameters } from "./utils/generateParameters.js";

const viagemRoutes = {
    "/viagens": {
        get: {
            tags: ["Viagens"],
            summary: "Lista todas as viagens ou busca por filtros",
            description: `
        + Caso de uso: Permitir a listagem de viagens.
        + Regras de Negócio: 
            - Administradores visualizam tudo.
            - Motoristas visualizam apenas suas próprias viagens.
      `,
            security: [{ bearerAuth: [] }],
            parameters: [
                ...generateParameters(viagemSchemas.ViagemFiltro),
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
                200: commonResponses[200]("#/components/schemas/ViagemListagem"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },
        post: {
            tags: ["Viagens"],
            summary: "Cria uma nova viagem",
            description: `
        + Regras de Negócio: 
            - Usuário só pode ter uma viagem "em_andamento" por vez.
            - Deve vincular um veículo válido.
            `,
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/ViagemCriacao"
                        }
                    }
                }
            },
            responses: {
                201: commonResponses[201]("#/components/schemas/ViagemListagem"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                409: commonResponses[409]("Já existe uma viagem em andamento para este usuário."),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },
    "/viagens/{id}": {
        get: {
            tags: ["Viagens"],
            summary: "Busca uma viagem específica pelo ID",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "UUID da viagem"
                }
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/ViagemListagem"),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },
        patch: {
            tags: ["Viagens"],
            summary: "Atualiza uma viagem existente",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "UUID da viagem"
                }
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/ViagemAtualizacao"
                        }
                    }
                }
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/ViagemListagem"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },
        delete: {
            tags: ["Viagens"],
            summary: "Remove uma viagem",
            description: "Apenas Administradores podem deletar viagens.",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "UUID da viagem"
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
                                    mensagem: { type: "string", example: "Viagem deletada com sucesso." }
                                }
                            }
                        }
                    }
                },
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    }
};

export default viagemRoutes;
