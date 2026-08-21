// src/utils/validators/schemas/zod/VeiculoSchema.js

import { z } from 'zod';

const VeiculoSchema = z.object({
    modelo: z.string()
        .nonempty('Campo modelo é obrigatório.')
        .min(2, 'Modelo deve ter pelo menos 2 caracteres.'),
    placa: z.string()
        .nonempty('Campo placa é obrigatório.')
        .regex(/^[A-Za-z]{3}-?\d[A-Za-z0-9]\d{2}$/, 'Placa deve seguir o formato ABC-1234 ou ABC1D23.'),
    combustivel_preferencial: z.enum([
        'DIESEL_S10',
        'DIESEL_S500',
        'GASOLINA',
        'ETANOL',
        'ARLA_32',
        'OUTRO'
    ]).optional().default('DIESEL_S10'),
    status: z.enum(['ativo', 'inativo']).optional().default('ativo'),
    capacidade_tanque: z.number().optional(),
    ano_fabricacao: z.number().optional(),
    empresa_id: z.string().optional(),
    reboque: z.object({
        modelo: z.string().optional(),
        placas: z.array(z.string()).optional(),
        ano_fabricacao: z.number().optional(),
    }).optional(),
});

const VeiculoUpdateSchema = VeiculoSchema.partial();

const VeiculoStatusUpdateSchema = z.object({
    status: z.enum(['ativo', 'inativo'], {
        errorMap: () => ({ message: "O status deve ser 'ativo' ou 'inativo'." })
    })
});

export { VeiculoSchema, VeiculoUpdateSchema, VeiculoStatusUpdateSchema };
