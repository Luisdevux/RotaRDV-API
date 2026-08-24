// src/utils/validators/schemas/zod/querys/ViagemQuerySchema.js

import { z } from 'zod';

export const ViagemIdSchema = z.string().uuid('UUID inválido.');

export const ViagemQuerySchema = z.object({
    todos: z
        .preprocess((val) => val === 'true' || val === true || val === '1' || val === 1, z.boolean())
        .optional(),
    empresa_id: z.string().optional(),
    usuario_id: z.string().optional(),
    veiculo_id: z.string().optional(),
    status: z.enum(['em_andamento', 'concluída', 'cancelada']).optional(),
    data_inicio: z.string().optional(),
    data_fim: z.string().optional(),
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
        .refine((val) => Number.isInteger(val) && val >= 0 && val <= 1000, {
            message: 'Limite deve ser um número inteiro entre 0 e 1000.',
        }),
});
