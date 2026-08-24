// src/docs/schemas/veiculoSchema.js

const veiculoSchemas = {
    VeiculoFiltro: {
        type: "object",
        properties: {
            empresa_id: { type: "string", description: "Filtra por ID da empresa (SuperAdmin / Admin)" },
            modelo: { type: "string", description: "Filtra por modelo do veículo" },
            placa: { type: "string", description: "Filtra pela placa do veículo" },
            status: { type: "string", enum: ["ativo", "inativo"], description: "Filtra por status do veículo" },
            reboque_placa: { type: "string", description: "Filtra veículos por uma ou mais placas de reboque acoplado" },
            reboque_modelo: { type: "string", description: "Filtra veículos pelo modelo do reboque acoplado" },
            todos: { type: "boolean", description: "Se true, retorna todos os veículos sem paginação" }
        }
    },

    VeiculoListagem: {
        type: "object",
        properties: {
            _id: { type: "string", example: "674fa21d79969d2172e78799" },
            modelo: { type: "string", example: "Volvo FH 540" },
            placa: { type: "string", example: "ABC1D23" },
            combustivel_preferencial: { 
                type: "string", 
                enum: ["DIESEL_S10", "DIESEL_S500", "GASOLINA", "ETANOL", "ARLA_32", "OUTRO"],
                example: "DIESEL_S10"
            },
            status: { type: "string", enum: ["ativo", "inativo"], example: "ativo" },
            capacidade_tanque: { type: "number", example: 400 },
            ano_fabricacao: { type: "number", example: 2024 },
            reboque: {
                type: "object",
                properties: {
                    modelo: { type: "string", example: "Randon Graneleiro" },
                    placas: {
                        type: "array",
                        items: { type: "string" },
                        example: ["XYZ9A87", "XYZ9A88"]
                    },
                    ano_fabricacao: { type: "number", example: 2023 }
                }
            },
            createdAt: { type: "string", format: "date-time", example: "2025-01-16T12:00:00.000Z" },
            updatedAt: { type: "string", format: "date-time", example: "2025-01-16T12:00:00.000Z" }
        },
        description: "Schema para listagem de veículos"
    },

    VeiculoCriacao: {
        type: "object",
        required: ["modelo", "placa"],
        properties: {
            modelo: { type: "string", example: "Volvo FH 540" },
            placa: { type: "string", example: "ABC1D23" },
            combustivel_preferencial: { 
                type: "string", 
                enum: ["DIESEL_S10", "DIESEL_S500", "GASOLINA", "ETANOL", "ARLA_32", "OUTRO"],
                example: "DIESEL_S10"
            },
            status: { type: "string", enum: ["ativo", "inativo"], example: "ativo" },
            capacidade_tanque: { type: "number", example: 400 },
            ano_fabricacao: { type: "number", example: 2024 },
            reboque: {
                type: "object",
                properties: {
                    modelo: { type: "string", example: "Randon Graneleiro" },
                    placas: {
                        type: "array",
                        items: { type: "string" },
                        example: ["XYZ9A87", "XYZ9A88"]
                    },
                    ano_fabricacao: { type: "number", example: 2023 }
                }
            }
        },
        description: "Schema para criação de um novo veículo"
    },

    VeiculoAtualizacao: {
        type: "object",
        properties: {
            modelo: { type: "string", example: "Volvo FH 540" },
            placa: { type: "string", example: "ABC1D23" },
            combustivel_preferencial: { 
                type: "string", 
                enum: ["DIESEL_S10", "DIESEL_S500", "GASOLINA", "ETANOL", "ARLA_32", "OUTRO"],
                example: "DIESEL_S10"
            },
            status: { type: "string", enum: ["ativo", "inativo"], example: "ativo" },
            capacidade_tanque: { type: "number", example: 400 },
            ano_fabricacao: { type: "number", example: 2024 },
            reboque: {
                type: "object",
                properties: {
                    modelo: { type: "string", example: "Randon Graneleiro" },
                    placas: {
                        type: "array",
                        items: { type: "string" },
                        example: ["XYZ9A87", "XYZ9A88"]
                    },
                    ano_fabricacao: { type: "number", example: 2023 }
                }
            }
        },
        description: "Schema para atualização de um veículo existente"
    },

    VeiculoStatusPatch: {
        type: "object",
        required: ["status"],
        properties: {
            status: {
                type: "string",
                enum: ["ativo", "inativo"],
                description: "Novo status operacional do veículo",
                example: "inativo"
            }
        },
        description: "Schema para ativação ou inativação do veículo"
    }
};

export default veiculoSchemas;
