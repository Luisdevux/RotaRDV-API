// src/utils/validators/schemas/zod/ViagemSchema.js

import { z } from 'zod';
import objectIdSchema from './ObjectIdSchema.js';

const LocalSchema = z.object({
    cidade: z.string().nonempty('A cidade é obrigatória.'),
    estado: z.string().nonempty('O estado é obrigatório.').length(2, 'O estado deve ser a sigla (ex: SP).'),
});

const ViagemBaseSchema = z.object({
    _id: z.string().uuid('UUID inválido.').optional(),
    usuario_id: objectIdSchema,
    veiculo_id: objectIdSchema,
    origem: LocalSchema,
    destino: LocalSchema,
    data_inicio: z.string().datetime({ message: 'Data de início inválida.' }).or(z.date()),
    data_fim: z.string().datetime({ message: 'Data de fim inválida.' }).or(z.date()),
    km_inicial: z.number().min(0, 'KM inicial não pode ser negativo.'),
    km_final: z.number().min(0, 'KM final não pode ser negativo.').nullable().optional().default(null),
    descricao: z.string().optional().default(''),
    status: z.enum(['em_andamento', 'concluída', 'cancelada']).optional().default('em_andamento'),
});

const ViagemSchema = ViagemBaseSchema.refine((data) => {
    const inicio = new Date(data.data_inicio);
    const fim = new Date(data.data_fim);
    return fim >= inicio;
}, {
    message: "A data de fim não pode ser anterior à data de início.",
    path: ["data_fim"],
}).refine((data) => {
    // Se status for concluída, km_final é obrigatório
    if (data.status === 'concluída' && (data.km_final === null || data.km_final === undefined)) {
        return false;
    }
    return true;
}, {
    message: "O KM final é obrigatório para concluir a viagem.",
    path: ["km_final"],
}).refine((data) => {
    // Se km_final existir, deve ser >= km_inicial
    if (data.km_final !== null && data.km_final !== undefined) {
        return data.km_final >= data.km_inicial;
    }
    return true;
}, {
    message: "O KM final não pode ser menor que o KM inicial.",
    path: ["km_final"],
});

const ViagemUpdateSchema = ViagemBaseSchema.partial().refine((data) => {
    if (data.data_inicio && data.data_fim) {
        return new Date(data.data_fim) >= new Date(data.data_inicio);
    }
    return true;
}, {
    message: "A data de fim não pode ser anterior à data de início.",
    path: ["data_fim"],
}).refine((data) => {
    // Validação condicional para o update
    if (data.status === 'concluída' && (data.km_final === null || data.km_final === undefined)) {
        return false;
    }
    return true;
}, {
    message: "O KM final é obrigatório para concluir a viagem.",
    path: ["km_final"],
});

export { ViagemSchema, ViagemUpdateSchema };
