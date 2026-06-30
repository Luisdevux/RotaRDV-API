// src/docs/schemas/despesaSchema.js

const despesaSchemas = {
    DespesaRequest: {
        type: "object",
        discriminator: {
            propertyName: "tipo"
        },
        required: ["viagem_id", "tipo", "valor_total", "data"],
        properties: {
            viagem_id: {
                type: "string",
                description: "ID da viagem vinculada"
            },
            tipo: {
                type: "string",
                enum: ["ABASTECIMENTO", "ALIMENTACAO", "MANUTENCAO", "PEDAGIO", "OUTROS"],
                description: "Tipo da despesa"
            },
            valor_total: {
                type: "number",
                description: "Valor total da despesa (Deve bater com litros * valor_litro no caso de abastecimento)"
            },
            data: {
                type: "string",
                format: "date-time",
                description: "Data em que a despesa ocorreu"
            },
            local: {
                type: "string"
            },
            descricao: {
                type: "string"
            },
            foto_anexo: {
                type: "string",
                description: "URL da foto (S3) anexa"
            },
            // Campos de Abastecimento
            litros: { type: "number" },
            valor_litro: { type: "number" },
            tipo_combustivel: { type: "string" },
            km_atual: { type: "number" },
            // Alimentação
            tipo_refeicao: { type: "string" },
            // Manutenção
            oficina_nome: { type: "string" },
            // Pedágio
            praca_nome: { type: "string" }
        }
    }
};

export default despesaSchemas;
