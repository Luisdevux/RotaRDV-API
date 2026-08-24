// src/utils/validators/schemas/zod/querys/VeiculoQuerySchema.js

import { z } from 'zod';
import mongoose from 'mongoose';

export const VeiculoIdSchema = z.string().refine((id) => mongoose.Types.ObjectId.isValid(id), {
    message: 'ID inválido.',
});

export const VeiculoQuerySchema = z.object({
    todos: z
        .preprocess((val) => val === 'true' || val === true || val === '1' || val === 1, z.boolean())
        .optional(),
    empresa_id: z.string().optional(),
    modelo: z
        .string()
        .optional()
        .refine((val) => !val || val.trim().length > 0, {
            message: 'Modelo não pode ser vazio.',
        })
        .transform((val) => val?.trim()),
    placa: z
        .string()
        .optional()
        .refine((val) => !val || val.trim().length > 0, {
            message: 'Placa não pode ser vazia.',
        })
        .transform((val) => val?.trim()),
    reboque_placa: z
        .string()
        .optional()
        .transform((val) => val?.trim()),
    reboque_modelo: z
        .string()
        .optional()
        .transform((val) => val?.trim()),
    status: z
        .enum(['ativo', 'inativo'])
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
