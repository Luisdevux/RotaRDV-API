// src/utils/validators/schemas/zod/querys/DespesaQuerySchema.js

import { z } from 'zod';

export const DespesaQuerySchema = z.object({
    viagem_id: z
        .string()
        .optional()
        .transform((val) => val?.trim()),
    tipo: z
        .enum(["ABASTECIMENTO", "ALIMENTACAO", "MANUTENCAO", "PEDAGIO", "OUTROS"])
        .optional(),
    data_inicio: z
        .string()
        .optional()
        .refine((val) => !val || !isNaN(Date.parse(val)), {
            message: 'data_inicio deve ser uma data válida ISO 8601.',
        }),
    data_fim: z
        .string()
        .optional()
        .refine((val) => !val || !isNaN(Date.parse(val)), {
            message: 'data_fim deve ser uma data válida ISO 8601.',
        }),
    page: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1))
        .refine((val) => Number.isInteger(val) && val > 0, {
            message: 'Page deve ser um número inteiro maior que 0.',
        }),
    limite: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 10))
        .refine((val) => Number.isInteger(val) && val > 0 && val <= 100, {
            message: 'Limite deve ser um número inteiro entre 1 e 100.',
        }),
});
