// src/utils/validators/schemas/zod/DespesaSchema.js

import { z } from 'zod';
import objectIdSchema from './ObjectIdSchema.js';
import { DateHelper } from '../../../helpers/index.js';

// Schema Base
const baseDespesaSchema = z.object({
    viagem_id: objectIdSchema,
    data: z.preprocess((arg) => {
        if (!arg) return arg;
        if (arg instanceof Date) return arg;
        if (typeof arg === 'string') {
            const parsed = DateHelper.parseFlexibleDate(arg);
            return parsed || arg;
        }
        return arg;
    }, z.date({
        required_error: "A data da despesa é obrigatória.",
        invalid_type_error: "Formato de data inválido. Use ISO (YYYY-MM-DD) ou formato BR (DD/MM/YYYY)."
    })).refine(data => data <= new Date(), {
        message: "A data da despesa não pode estar no futuro."
    }),
    local: z.string().optional(),
    descricao: z.string().optional(),
    foto_anexo: z.string().optional()
});

// Schema Abastecimento
const abastecimentoSchema = baseDespesaSchema.extend({
    tipo: z.literal("ABASTECIMENTO"),
    litros: z.number().positive("Litros devem ser maiores que zero."),
    valor_litro: z.number().positive("Valor por litro deve ser maior que zero."),
    tipo_combustivel: z.enum(["DIESEL_S10", "DIESEL_S500", "GASOLINA", "ETANOL", "ARLA_32", "OUTRO"], {
        errorMap: () => ({ message: "Tipo de combustível inválido." })
    }),
    km_atual: z.number().positive("KM atual deve ser maior que zero."),
    valor_total: z.number().positive("Valor total deve ser maior que zero.")
}).refine(data => {
    // Tolerância de 5 centavos para arredondamentos de bomba
    const calculado = data.litros * data.valor_litro;
    const diff = Math.abs(data.valor_total - calculado);
    return diff <= 0.05;
}, {
    message: "O valor total (litros * valor_litro) não confere. Possível fraude nos valores.",
    path: ["valor_total"]
});

// Schema Alimentacao
const alimentacaoSchema = baseDespesaSchema.extend({
    tipo: z.literal("ALIMENTACAO"),
    tipo_refeicao: z.string().min(1, "O tipo da refeição é obrigatório!"),
    valor_total: z.number().positive("Valor total deve ser maior que zero.")
});

// Schema Manutencao
const manutencaoSchema = baseDespesaSchema.extend({
    tipo: z.literal("MANUTENCAO"),
    oficina_nome: z.string().optional(),
    valor_total: z.number().positive("Valor total deve ser maior que zero.")
});

// Schema Pedagio
const pedagioSchema = baseDespesaSchema.extend({
    tipo: z.literal("PEDAGIO"),
    praca_nome: z.string().optional(),
    valor_total: z.number().positive("Valor total deve ser maior que zero.")
});

// Schema Outros
const outrosSchema = baseDespesaSchema.extend({
    tipo: z.literal("OUTROS"),
    valor_total: z.number().positive("Valor total deve ser maior que zero.")
});

// Discriminated Union principal
const DespesaSchema = z.discriminatedUnion("tipo", [
    abastecimentoSchema,
    alimentacaoSchema,
    manutencaoSchema,
    pedagioSchema,
    outrosSchema
]);

export { DespesaSchema };
