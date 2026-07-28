// src/docs/schemas/syncSchema.js

const syncSchemas = {
    SyncPushPayload: {
        type: "object",
        properties: {
            viagens: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        _id: { type: "string", format: "uuid" },
                        is_deleted: { type: "boolean" }
                    },
                    additionalProperties: true
                }
            },
            despesas: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        _id: { type: "string", format: "uuid" },
                        viagem_id: { type: "string", format: "uuid" },
                        is_deleted: { type: "boolean" }
                    },
                    additionalProperties: true
                }
            }
        }
    },
    SyncPullResponse: {
        type: "object",
        properties: {
            erro: { type: "boolean", example: false },
            mensagem: { type: "string", example: "Sincronização Pull concluída com sucesso!" },
            data: {
                type: "object",
                properties: {
                    viagens: {
                        type: "array",
                        items: { $ref: "#/components/schemas/ViagemListagem" }
                    },
                    despesas: {
                        type: "array",
                        items: { $ref: "#/components/schemas/DespesaRequest" }
                    }
                }
            }
        }
    }
};

export default syncSchemas;
