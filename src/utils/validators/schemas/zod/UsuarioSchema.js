// src/utils/validators/schemas/zod/UsuarioSchema.js

import { z } from 'zod';
import objectIdSchema from './ObjectIdSchema.js';

const senhaRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
const cpfRegex = /^\d{11}$/;

const UsuarioSchema = z.object({
    nome: z
        .string()
        .nonempty('Campo nome é obrigatório.')
        .min(2, 'Nome deve ter pelo menos 2 caracteres.'),
    email: z
        .string()
        .email('Formato de email inválido.')
        .nonempty('Campo email é obrigatório.'),
    senha: z
        .string()
        .min(8, 'A senha deve ter pelo menos 8 caracteres.')
        .refine((senha) => {
            if (!senha) return true;
            return senhaRegex.test(senha);
        }, {
            message: 'A senha deve conter pelo menos 1 letra maiúscula, 1 letra minúscula, 1 número, 1 caractere especial e no mínimo 8 caracteres.',
        })
        .optional(),
    cpf: z
        .string()
        .nonempty('Campo CPF é obrigatório.')
        .refine((val) => cpfRegex.test(val), {
            message: 'CPF deve conter exatamente 11 dígitos numéricos.',
        }),
    status: z.enum(['ativo', 'inativo']).optional(),
    isAdmin: z.boolean().optional(),
    foto_perfil: z
        .string()
        .refine((val) => val === '' || /\.(jpg|jpeg|png|svg)$/i.test(val), {
            message: 'Deve ser um link de imagem com extensão válida (jpg, png, etc).',
        })
        .optional(),
    empresa: z
        .object({
          nome: z.string().optional(),
          cargo: z.string().optional(),
    }).optional(),
    veiculo_id: objectIdSchema.optional(),
    googleId: z.string().optional(),
    authProvider: z.enum(['local', 'google']).default('local'),
});

const UsuarioUpdateSchema = UsuarioSchema.partial();

const UsuarioStatusUpdateSchema = z.object({
    status: z.enum(['ativo', 'inativo'], {
        errorMap: () => ({ message: "O status deve ser 'ativo' ou 'inativo'." })
    })
});

export { UsuarioSchema, UsuarioUpdateSchema, UsuarioStatusUpdateSchema };
