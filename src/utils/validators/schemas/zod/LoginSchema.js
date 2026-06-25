// src/utils/validators/schemas/zod/LoginSchema.js

import { z } from 'zod';

const senhaRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

const LoginSchema = z.object({
    email: z
        .string()
        .min(1, 'Campo de identificação é obrigatório.')
        .refine((value) => {
            const isEmail = z.string().email().safeParse(value).success;
            return isEmail;
        }, {
            message: 'Email deve ser um email válido.',
        }),
    senha: z
        .string()
        .min(8, 'A senha deve ter pelo menos 8 caracteres.')
        .refine((senha) => {
            if (!senha) return true;
            return senhaRegex.test(senha);
        }, {
            message: 'A senha deve conter pelo menos 1 letra maiúscula, 1 letra minúscula, 1 número, 1 caractere especial e no mínimo 8 caracteres.',
        }),
});

export { LoginSchema };
