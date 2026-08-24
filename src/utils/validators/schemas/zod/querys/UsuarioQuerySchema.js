// src/utils/validators/schemas/zod/querys/UsuarioQuerySchema.js

import { z } from 'zod';
import mongoose from 'mongoose';

export const UsuarioIdSchema = z.string().refine((id) => mongoose.Types.ObjectId.isValid(id), {
    message: 'ID inválido.',
});

export const UsuarioQuerySchema = z.object({
    todos: z
        .preprocess((val) => val === 'true' || val === true || val === '1' || val === 1, z.boolean())
        .optional(),
    nome: z
        .string()
        .optional()
        .refine((val) => !val || val.trim().length > 0, {
            message: 'Nome não pode ser vazio.',
        })
        .transform((val) => val?.trim()),
    email: z
        .string()
        .optional()
        .transform((val) => val?.trim()),
    status: z
        .enum(['ativo', 'inativo'])
        .optional(),
    role: z
        .string()
        .optional(),
    cpf: z
        .string()
        .optional()
        .transform((val) => val?.trim()),
    cnh: z
        .string()
        .optional()
        .transform((val) => val?.trim()),
    empresa_id: z
        .string()
        .optional(),
    empresa_nome: z
        .string()
        .optional()
        .transform((val) => val?.trim()),
    veiculo_id: z
        .string()
        .optional(),
    isAdmin: z
        .preprocess(
            (val) => {
                if (val === 'true' || val === true || val === '1' || val === 1) return true;
                if (val === 'false' || val === false || val === '0' || val === 0) return false;
                return undefined;
            },
            z.boolean().optional()
        ),
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
