// src/docs/schemas/viagemSchema.js

const viagemSchemas = {
    ViagemFiltro: {
        type: "object",
        properties: {
            usuario_id: { type: "string", description: "Filtra por ID do usuário" },
            veiculo_id: { type: "string", description: "Filtra por ID do veículo" },
            status: { type: "string", enum: ["em_andamento", "concluída", "cancelada"], description: "Filtra pelo status da viagem" },
            data_inicio: { type: "string", format: "date", description: "Data de início (filtro range)" },
            data_fim: { type: "string", format: "date", description: "Data de fim (filtro range)" }
        }
    },

    ViagemListagem: {
        type: "object",
        properties: {
            _id: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
            usuario_id: { 
                type: "object",
                properties: {
                    _id: { type: "string", example: "674fa21d79969d2172e78799" },
                    nome: { type: "string", example: "João Silva" },
                    email: { type: "string", example: "joao@exemplo.com" }
                }
            },
            veiculo_id: {
                type: "object",
                properties: {
                    _id: { type: "string", example: "674fa21d79969d2172e78800" },
                    modelo: { type: "string", example: "Volvo FH 540" },
                    placa: { type: "string", example: "ABC1D23" }
                }
            },
            origem: {
                type: "object",
                properties: {
                    cidade: { type: "string", example: "São Paulo" },
                    estado: { type: "string", example: "SP" }
                }
            },
            destino: {
                type: "object",
                properties: {
                    cidade: { type: "string", example: "Rio de Janeiro" },
                    estado: { type: "string", example: "RJ" }
                }
            },
            data_inicio: { type: "string", format: "date-time", example: "2025-01-16T08:00:00.000Z" },
            data_fim: { type: "string", format: "date-time", example: "2025-01-17T18:00:00.000Z" },
            km_inicial: { type: "number", example: 10000 },
            km_final: { type: "number", example: 10500 },
            descricao: { type: "string", example: "Viagem de transporte de carga seca" },
            status: { type: "string", example: "em_andamento" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" }
        }
    },

    ViagemCriacao: {
        type: "object",
        required: ["usuario_id", "veiculo_id", "origem", "destino", "data_inicio", "data_fim", "km_inicial", "km_final"],
        properties: {
            _id: { type: "string", format: "uuid", description: "Opcional. UUID para sincronização offline." },
            usuario_id: { type: "string", example: "674fa21d79969d2172e78799" },
            veiculo_id: { type: "string", example: "674fa21d79969d2172e78800" },
            origem: {
                type: "object",
                required: ["cidade", "estado"],
                properties: {
                    cidade: { type: "string", example: "São Paulo" },
                    estado: { type: "string", example: "SP" }
                }
            },
            destino: {
                type: "object",
                required: ["cidade", "estado"],
                properties: {
                    cidade: { type: "string", example: "Rio de Janeiro" },
                    estado: { type: "string", example: "RJ" }
                }
            },
            data_inicio: { type: "string", format: "date-time", example: "2025-01-16T08:00:00.000Z" },
            data_fim: { type: "string", format: "date-time", example: "2025-01-17T18:00:00.000Z" },
            km_inicial: { type: "number", example: 10000 },
            km_final: { type: "number", example: 10500 },
            descricao: { type: "string", example: "Carga de eletrônicos" },
            status: { type: "string", enum: ["em_andamento", "concluída", "cancelada"], default: "em_andamento" }
        }
    },

    ViagemAtualizacao: {
        type: "object",
        properties: {
            origem: {
                type: "object",
                properties: {
                    cidade: { type: "string" },
                    estado: { type: "string" }
                }
            },
            destino: {
                type: "object",
                properties: {
                    cidade: { type: "string" },
                    estado: { type: "string" }
                }
            },
            data_inicio: { type: "string", format: "date-time" },
            data_fim: { type: "string", format: "date-time" },
            km_inicial: { type: "number" },
            km_final: { type: "number" },
            descricao: { type: "string" },
            status: { type: "string", enum: ["em_andamento", "concluída", "cancelada"] }
        }
    }
};

export default viagemSchemas;
