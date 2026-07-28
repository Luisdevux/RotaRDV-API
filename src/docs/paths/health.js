// src/docs/paths/health.js

const healthRoutes = {
    "/health": {
        get: {
            tags: ["Sistema"],
            summary: "Verifica a saúde da API e a conexão com o banco de dados",
            description: `
            + Caso de uso: Monitoramento do Sistema (Health Check)

            + Função de Negócio:
                - Verifica em tempo real a integridade da API e seus serviços dependentes.

            + Regras de Negócio:
                - Ping no Banco de Dados: Executa um comando simples no MongoDB para garantir conectividade.
                - Uptime: Calcula há quanto tempo a API está no ar sem sofrer interrupções (crashes).

            + Resultado Esperado:
                - HTTP 200 OK com status "healthy", conectividade do banco de dados e uptime em segundos.
        `,
            security: [],
            responses: {
                200: {
                    description: "A API e o banco de dados estão operantes.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    status: { type: "string", example: "healthy" },
                                    database: { type: "string", example: "connected" },
                                    timestamp: { type: "string", format: "date-time" },
                                    uptime: { type: "number", example: 3600.45 }
                                }
                            }
                        }
                    }
                },
                503: {
                    description: "O banco de dados ou outro serviço crítico está fora do ar.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    status: { type: "string", example: "unhealthy" },
                                    database: { type: "string", example: "disconnected" },
                                    timestamp: { type: "string", format: "date-time" },
                                    uptime: { type: "number", example: 3600.45 }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

export default healthRoutes;
