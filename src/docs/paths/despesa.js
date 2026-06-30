// src/docs/paths/despesa.js

import commonResponses from "../schemas/swaggerCommonResponses.js";

const despesaPaths = {
    "/despesas": {
        get: {
            tags: ["Despesas"],
            summary: "Lista todas as despesas ou busca por filtros",
            description: `
        + Caso de uso: Permitir a listagem de despesas (Abastecimento, Alimentação, etc) e a sincronização com o aplicativo Mobile.
        + Regras de Negócio:
            - Retorna as despesas paginadas.
            - Pode filtrar por viagem_id, tipo e período (data_inicio, data_fim).
            - **(Offline-First)**: Se o motorista(app) não enviar o \`viagem_id\`, a API retornará **todas** as despesas vinculadas a **todas as suas viagens**, ideal para realizar o "Pull Sync" do banco local em apenas uma requisição.
      `,
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "viagem_id",
                    in: "query",
                    schema: { type: "string" },
                    description: "ID da viagem para filtrar as despesas"
                },
                {
                    name: "tipo",
                    in: "query",
                    schema: { type: "string", enum: ["ABASTECIMENTO", "ALIMENTACAO", "MANUTENCAO", "PEDAGIO", "OUTROS"] },
                    description: "Filtrar por tipo de despesa"
                },
                {
                    name: "data_inicio",
                    in: "query",
                    schema: { type: "string", format: "date-time" },
                    description: "Data inicial para filtro"
                },
                {
                    name: "data_fim",
                    in: "query",
                    schema: { type: "string", format: "date-time" },
                    description: "Data final para filtro"
                },
                {
                    name: "page",
                    in: "query",
                    schema: { type: "integer", default: 1 },
                    description: "Número da página para paginação"
                },
                {
                    name: "limite",
                    in: "query",
                    schema: { type: "integer", default: 10, maximum: 100 },
                    description: "Quantidade de itens por página"
                }
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/DespesaRequest"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },
        post: {
            tags: ["Despesas"],
            summary: "Cria uma nova despesa",
            description: `
        + Regras de Negócio:
            - Motoristas só podem registrar despesas nas suas próprias viagens (Admin pode em todas).
            - A viagem deve estar com status "em_andamento".
            - A data da despesa deve ser maior ou igual à data de início da viagem e não pode ser no futuro.
            - Se for Abastecimento, o km_atual deve ser >= km_inicial da viagem.
            - O valor total (em abastecimento) deve ser estritamente litros * valor_litro.
            `,
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/DespesaRequest"
                        }
                    }
                }
            },
            responses: {
                201: commonResponses[201]("#/components/schemas/DespesaRequest"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },
    "/despesas/{id}": {
        get: {
            tags: ["Despesas"],
            summary: "Busca uma despesa específica pelo ID",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "UUID da despesa"
                }
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/DespesaRequest"),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },
        delete: {
            tags: ["Despesas"],
            summary: "Remove uma despesa",
            description: `
        + Regras de Negócio:
            - É necessário ser o motorista da viagem correspondente ou Admin.
            - A viagem deve estar "em_andamento".
            `,
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "UUID da despesa"
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
                                    mensagem: { type: "string", example: "Despesa deletada com sucesso." }
                                }
                            }
                        }
                    }
                },
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    }
};

export default despesaPaths;
