// src/utils/validators/schemas/zod/EmpresaSchema.js

import { z } from 'zod';
import objectIdSchema from './ObjectIdSchema.js';
import { cpf as cpfValidator } from 'cpf-cnpj-validator';
import ValidationHelper from '../../../helpers/ValidationHelper.js';

const cepRegex = /^\d{5}-?\d{3}$/;
const cnpjRegex = /^[0-9A-Za-z]{2}\.?[0-9A-Za-z]{3}\.?[0-9A-Za-z]{3}\/?[0-9A-Za-z]{4}-?\d{2}$/;
const senhaRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

const EnderecoSchema = z.object({
    cep: z.string().optional().refine((val) => !val || cepRegex.test(val), {
        message: 'CEP inválido. Utilize o formato 00000-000 ou 00000000.',
    }),
    logradouro: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    estado: z.string().optional().refine((val) => !val || val.length === 2, {
        message: 'O estado deve conter a sigla de 2 letras (ex: RO, MT).',
    }),
}).optional();

const EmpresaSchema = z.object({
    nome_empresa: z
        .string()
        .nonempty('Nome da empresa é obrigatório.')
        .min(2, 'Nome da empresa deve ter pelo menos 2 caracteres.'),
    cnpj: z
        .string()
        .nonempty('CNPJ é obrigatório.')
        .refine((val) => cnpjRegex.test(val), {
            message: 'Formato de CNPJ inválido.',
        })
        .refine((val) => ValidationHelper.isValidCnpj(val), {
            message: 'CNPJ inválido.',
        }),
    email: z
        .string()
        .email('Formato de email corporativo inválido.')
        .nonempty('Email corporativo é obrigatório.'),
    telefone: z.string().optional(),
    endereco: EnderecoSchema,
    status: z.enum(['ativo', 'inativo']).optional(),
    foto_logo: z
        .string()
        .refine((val) => !val || val === '' || /\.(jpg|jpeg|png|svg|webp)$/i.test(val) || /^https?:\/\//i.test(val), {
            message: 'Deve ser um link de imagem válido.',
        })
        .optional(),
    gestor_id: objectIdSchema.optional(),
});

const EmpresaUpdateSchema = EmpresaSchema.partial();

const EmpresaStatusUpdateSchema = z.object({
    status: z.enum(['ativo', 'inativo'], {
        errorMap: () => ({ message: "O status deve ser 'ativo' ou 'inativo'." })
    })
});

const CadastrarMotoristaEmpresaSchema = z.object({
    nome: z
        .string()
        .nonempty('Nome do motorista é obrigatório.')
        .min(2, 'Nome deve ter pelo menos 2 caracteres.'),
    email: z
        .string()
        .email('Email do motorista inválido.')
        .nonempty('Email é obrigatório.'),
    cpf: z
        .string()
        .nonempty('CPF do motorista é obrigatório.')
        .refine((val) => {
            const cleaned = val.replace(/\D/g, '');
            return cleaned.length === 11 && cpfValidator.isValid(cleaned);
        }, {
            message: 'CPF inválido.',
        }),
    telefone: z.string().optional(),
    cargo: z.string().optional().default('Motorista'),
    veiculo_id: objectIdSchema.optional(),
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
});

const VincularMotoristaSchema = z.object({
    usuario_id: objectIdSchema.optional(),
    email: z.string().email('Email inválido.').optional(),
    cpf: z.string().optional(),
    cargo: z.string().optional().default('Motorista'),
    veiculo_id: objectIdSchema.optional(),
}).refine((data) => data.usuario_id || data.email || data.cpf, {
    message: 'Informe o usuario_id, email ou CPF do motorista a ser vinculado.',
    path: ['usuario_id'],
});

const VincularVeiculoSchema = z.object({
    veiculo_id: objectIdSchema,
});

export {
    EmpresaSchema,
    EmpresaUpdateSchema,
    EmpresaStatusUpdateSchema,
    CadastrarMotoristaEmpresaSchema,
    VincularMotoristaSchema,
    VincularVeiculoSchema,
};
