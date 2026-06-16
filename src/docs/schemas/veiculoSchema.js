// src/docs/schemas/veiculoSchema.js

const veiculoSchemas = {
    VeiculoFiltro: {
        type: "object",
        properties: {
            modelo: { type: "string", description: "Filtra por modelo do veículo" },
            placa: { type: "string", description: "Filtra pela placa do veículo" },
            reboque_placa: { type: "string", description: "Filtra veículos por uma ou mais placas de reboque acoplado" },
            reboque_modelo: { type: "string", description: "Filtra veículos pelo modelo do reboque acoplado" }
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
    }
};

export default veiculoSchemas;
