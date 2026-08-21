// src/seeds/globalFakeMapping.js

import { faker } from '@faker-js/faker/locale/pt_BR';
import mongoose from 'mongoose';
import loadModels from './loadModels.js';
import TokenUtil from '../utils/TokenUtil.js';

const baseDespesa = {
  viagem_id: () => new mongoose.Types.ObjectId(),
  tipo: () => faker.helpers.arrayElement(['ABASTECIMENTO', 'ALIMENTACAO', 'MANUTENCAO', 'PEDAGIO', 'OUTROS']),
  valor_total: () => faker.finance.amount(10, 1000, 2),
  data: () => faker.date.recent(),
  local: () => faker.company.name(),
  foto_anexo: () => faker.image.url(),
};

export const fakeMappings = {
  common: {
    descricao: () => faker.lorem.sentence(),
    created_at: () => new Date().toISOString(),
    updated_at: () => new Date().toISOString(),
  },

  Empresa: {
    nome_empresa: () => `${faker.company.name()} Transportes`,
    cnpj: () => faker.string.numeric(14),
    email: () => faker.internet.email().toLowerCase(),
    telefone: () => faker.phone.number(),
    endereco: () => ({
      cep: faker.location.zipCode('#####-###'),
      logradouro: faker.location.street(),
      numero: faker.location.buildingNumber(),
      complemento: faker.location.secondaryAddress(),
      bairro: faker.location.county(),
      cidade: faker.location.city(),
      estado: faker.location.state({ abbreviated: true }),
    }),
    status: () => faker.helpers.arrayElement(['ativo', 'inativo']),
    foto_logo: () => faker.image.url(),
    gestor_id: () => new mongoose.Types.ObjectId(),
  },

  Usuario: {
    nome: () =>
    `${faker.person.firstName()} ${faker.person.lastName()} ${faker.person.lastName()}`,
    email: () => faker.internet.email().toLowerCase(),
    cpf: () => faker.string.numeric(11),
    telefone: () => faker.phone.number('(##) 9####-####'),
    senha: () => faker.internet.password(),
    status: () => faker.helpers.arrayElement(['ativo', 'inativo']),
    isAdmin: () => faker.datatype.boolean(),
    role: () => faker.helpers.arrayElement(['admin', 'gestor', 'motorista']),
    foto_perfil: () => faker.image.avatar(),
    empresa_id: () => new mongoose.Types.ObjectId(),
    email_verificado: () => faker.datatype.boolean(),
    token_verificacao_email: () => null,
    exp_token_verificacao_email: () => null,
    googleId: () => faker.string.uuid(),
    authProvider: () => faker.helpers.arrayElement(['local', 'google']),
    empresa: () => ({
      nome: faker.company.name(),
      cargo: faker.person.jobTitle(),
    }),
    veiculo_id: () => new mongoose.Types.ObjectId(),
    refreshtoken: () => TokenUtil.generateAccessToken(new mongoose.Types.ObjectId().toString()),
    accesstoken: () => TokenUtil.generateAccessToken(new mongoose.Types.ObjectId().toString()),
    tokenUnico: () => TokenUtil.generateAccessToken(new mongoose.Types.ObjectId().toString()),
    codigo_recupera_senha: () => null,
    exp_codigo_recupera_senha: () => null,
  },

  Veiculo: {
    modelo: () => faker.vehicle.model(),
    placa: () => faker.vehicle.vrm(),
    status: () => faker.helpers.arrayElement(['ativo', 'inativo']),
    capacidade_tanque: () => faker.helpers.arrayElement([300, 400, 500, 600, 800, 1000]),
    ano_fabricacao: () => faker.number.int({ min: 2015, max: 2025 }),
    empresa_id: () => new mongoose.Types.ObjectId(),
    combustivel_preferencial: () => faker.helpers.arrayElement(['DIESEL_S10', 'DIESEL_S500', 'GASOLINA', 'ARLA_32']),
    reboque: () => ({
      modelo: faker.helpers.arrayElement(['Bitrem Graneleiro 9 Eixos', 'Rodotrem Basculante', 'Sider Librelato', 'Carreta Baú Facchini']),
      placas: [faker.vehicle.vrm(), faker.vehicle.vrm()],
      ano_fabricacao: faker.date.past({ years: 20 }).getFullYear(),
    }),
  },

  Viagem: {
    usuario_id: () => new mongoose.Types.ObjectId(),
    empresa_id: () => new mongoose.Types.ObjectId(),
    usuario_snapshot: () => ({
      nome: faker.person.fullName(),
      email: faker.internet.email(),
    }),
    veiculo_id: () => new mongoose.Types.ObjectId(),
    veiculo_snapshot: () => ({
      placa: faker.vehicle.vrm(),
      modelo: faker.vehicle.model(),
      reboque: {
        modelo: faker.helpers.arrayElement(['Randon', 'Guerra', 'Librelato']),
        placas: [faker.vehicle.vrm()]
      }
    }),
    origem: () => ({ cidade: faker.location.city(), estado: faker.location.state({ abbreviated: true }) }),
    destino: () => ({ cidade: faker.location.city(), estado: faker.location.state({ abbreviated: true }) }),
    data_inicio: () => faker.date.recent(),
    data_fim: () => faker.date.future(),
    km_inicial: () => faker.number.int({ min: 10000, max: 50000 }),
    km_final: () => faker.number.int({ min: 50100, max: 80000 }),
    status: () => faker.helpers.arrayElement(['em_andamento', 'concluída', 'cancelada']),
    resumo_financeiro: () => ({
      total_geral: 0,
      por_categoria: {
        ABASTECIMENTO: 0,
        ALIMENTACAO: 0,
        MANUTENCAO: 0,
        PEDAGIO: 0,
        OUTROS: 0
      }
    })
  },

  Despesa: { ...baseDespesa },

  DespesaAbastecimento: {
    ...baseDespesa,
    tipo: () => 'ABASTECIMENTO',
    litros: () => parseFloat(faker.finance.amount({ min: 10, max: 200, dec: 2 })),
    valor_litro: () => parseFloat(faker.finance.amount({ min: 5, max: 8, dec: 2 })),
    tipo_combustivel: () => faker.helpers.arrayElement(['DIESEL_S10', 'DIESEL_S500', 'GASOLINA', 'ARLA_32']),
    km_atual: () => faker.number.int({ min: 10000, max: 80000 }),
  },

  DespesaAlimentacao: {
    ...baseDespesa,
    tipo: () => 'ALIMENTACAO',
    tipo_refeicao: () => faker.helpers.arrayElement(['CAFE_DA_MANHA', 'ALMOCO', 'JANTA', 'LANCHE']),
  },

  DespesaManutencao: {
    ...baseDespesa,
    tipo: () => 'MANUTENCAO',
    oficina_nome: () => faker.company.name(),
    servico_realizado: () => faker.helpers.arrayElement(['Troca de óleo', 'Alinhamento', 'Balanceamento', 'Troca de pneu']),
    pecas_trocadas: () => faker.helpers.arrayElements(['Óleo', 'Filtro', 'Pneu', 'Pastilha de freio'], 2),
  },

  DespesaPedagio: {
    ...baseDespesa,
    tipo: () => 'PEDAGIO',
    praca_nome: () => `Praça ${faker.location.city()}`,
  },
};

// Retorna o mapping global, consolidando os mappings comuns e específicos.
// Nesta versão automatizada, carregamos os models e combinamos o mapping comum com o mapping específico de cada model.

export async function getGlobalFakeMapping() {
  const models = await loadModels();
  let globalMapping = { ...fakeMappings.common };

  models.forEach(({ name }) => {
    if (fakeMappings[name]) {
      globalMapping = {
        ...globalMapping,
        ...fakeMappings[name],
      };
    }
  });

  return globalMapping;
}

// Função auxiliar para extrair os nomes dos campos de um schema, considerando apenas os níveis superiores (campos aninhados são verificados pela parte antes do ponto).

function getSchemaFieldNames(schema) {
  const fieldNames = new Set();

  Object.keys(schema.paths).forEach((key) => {
    if (['_id', '__v', 'createdAt', 'updatedAt'].includes(key)) return;
    const topLevel = key.split('.')[0];
    fieldNames.add(topLevel);
  });

  return Array.from(fieldNames);
}

// Valida se o mapping fornecido cobre todos os campos do model.
// Retorna um array com os nomes dos campos que estiverem faltando.

function validateModelMapping(model, modelName, mapping) {
  const fields = getSchemaFieldNames(model.schema);
  const missing = fields.filter((field) => !(field in mapping));

  if (missing.length > 0) {
    console.error(
      `Model ${modelName} está faltando mapeamento para os campos: ${missing.join(', ')}`,
    );
  } else {
    console.log(`Model ${modelName} possui mapeamento para todos os campos.`);
  }

  return missing;
}

// Executa a validação para os models fornecidos, utilizando o mapping específico de cada um.

async function validateAllMappings() {
  const models = await loadModels();
  const totalMissing = {};

  models.forEach(({ model, name }) => {
    // Combina os campos comuns com os específicos de cada model.
    const mapping = {
      ...fakeMappings.common,
      ...(fakeMappings[name] || {}),
    };
    const missing = validateModelMapping(model, name, mapping);
    if (missing.length > 0) {
      totalMissing[name] = missing;
    }
  });

  if (Object.keys(totalMissing).length === 0) {
    console.log('globalFakeMapping cobre todos os campos de todos os models.');
    return true;
  } else {
    console.warn('Faltam mapeamentos para os seguintes models:', totalMissing);
    return false;
  }
}

// Executa a validação antes de prosseguir com o seeding ou outras operações.

validateAllMappings()
  .then((valid) => {
    if (valid) {
      console.log('Podemos acessar globalFakeMapping com segurança.');
      // Prossegue com o seeding ou outras operações.
    } else {
      throw new Error(
        'globalFakeMapping não possui todos os mapeamentos necessários.',
      );
    }
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

export default getGlobalFakeMapping;
