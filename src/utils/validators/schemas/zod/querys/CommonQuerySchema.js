// src/utils/validators/schemas/zod/querys/CommonQuerySchema.js

import { z } from 'zod';
import mongoose from 'mongoose';

export const IdSchema = z.string().refine((id) => mongoose.Types.ObjectId.isValid(id), {
    message: 'ID inválido.',
});

export const PaginationQuerySchema = z.object({
    todos: z
        .preprocess((val) => val === 'true' || val === true || val === '1' || val === 1, z.boolean())
        .optional(),
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
