// src/docs/paths/sync.js

import commonResponses from "../schemas/swaggerCommonResponses.js";

const syncRoutes = {
    "/sync/push": {
        post: {
            tags: ["Sincronização"],
            summary: "Sincroniza dados locais com a nuvem (Push)",
            description: `
            + Caso de uso: Envio de Dados Offline (Push Sync)

            + Função de Negócio:
                - Recebe as viagens e despesas criadas, atualizadas ou deletadas localmente no dispositivo.
                - Consolida (upsert/delete) os dados no banco de dados da nuvem.

            + Regras de Negócio:
                - Resolução de Conflitos: Atualiza os registros no banco com base no UUID gerado offline. Se não existir, cria.
                - Deleções: Entidades com a marcação de 'deletado' no payload são removidas do banco na nuvem.
                - Isolamento de Dados: Os dados salvos são automaticamente associados ao usuário dono do token.

            + Resultado Esperado:
                - HTTP 200 OK com confirmação e número de registros sincronizados.
        `,
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/SyncPushPayload" }
                    }
                }
            },
            responses: {
                200: {
                    description: "Sincronização concluída com sucesso",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    erro: { type: "boolean", example: false },
                                    mensagem: { type: "string", example: "Sincronização Push concluída com sucesso!" },
                                    data: {
                                        type: "object",
                                        properties: {
                                            viagensSincronizadas: { type: "number", example: 1 },
                                            despesasSincronizadas: { type: "number", example: 2 }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                400: commonResponses[400](),
                401: commonResponses[401](),
                500: commonResponses[500]()
            }
        }
    },
    "/sync/pull": {
        get: {
            tags: ["Sincronização"],
            summary: "Busca dados da nuvem (Pull)",
            description: `
            + Caso de uso: Recebimento de Dados (Pull Sync)

            + Função de Negócio:
                - Retorna as viagens e despesas associadas ao motorista diretamente do banco na nuvem.
                - Atualiza o app com os dados mais recentes.

            + Regras de Negócio:
                - Sincronização Delta: A API filtra retornando apenas registros mutados após a data updatedAfter.
                - Espelhamento Local: O app usa os dados retornados para atualizar seu banco IsarDB local.

            + Resultado Esperado:
                - HTTP 200 OK com as listas de viagens e despesas encontradas.
        `,
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "updatedAfter",
                    in: "query",
                    schema: { type: "string", format: "date-time" },
                    description: "Retornar apenas registros criados/atualizados após esta data"
                }
            ],
            responses: {
                200: {
                    description: "Dados obtidos com sucesso",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/SyncPullResponse" }
                        }
                    }
                },
                401: commonResponses[401](),
                500: commonResponses[500]()
            }
        }
    }
};

export default syncRoutes;
