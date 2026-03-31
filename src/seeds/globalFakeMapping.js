// src/seeds/globalFakeMapping.js

import { faker } from '@faker-js/faker/locale/pt_BR';
import mongoose from 'mongoose';
import loadModels from './loadModels.js';
import TokenUtil from '../utils/TokenUtil.js';

export const fakeMappings = {
  common: {
    descricao: () => faker.lorem.sentence(),
    created_at: () => new Date().toISOString(),
    updated_at: () => new Date().toISOString(),
  },

  Usuario: {
    nome: () =>
    `${faker.person.firstName()} ${faker.person.lastName()} ${faker.person.lastName()}`,
    email: () => faker.internet.email(),
    cpf: () => faker.string.numeric(11),
    senha: () => faker.internet.password(),
    status: () => faker.helpers.arrayElement(['ativo', 'inativo']),
    isAdmin: () => faker.datatype.boolean(),
    foto_perfil: () => faker.image.avatar(),
    empresa: () => ({
      nome: faker.company.name(),
      cargo: faker.person.jobTitle(),
    }),
    veiculo_id: () => mongoose.Types.ObjectId(),
    refreshtoken: () => TokenUtil.generateAccessToken(new mongoose.Types.ObjectId().toString()),
    accesstoken: () => TokenUtil.generateAccessToken(new mongoose.Types.ObjectId().toString()),
    tokenUnico: () => TokenUtil.generateAccessToken(new mongoose.Types.ObjectId().toString()),
    codigo_recupera_senha: () => null,
    exp_codigo_recupera_senha: () => null,
  },

  Veiculo: {
    modelo: () => faker.vehicle.model(),
    placa: () => faker.vehicle.vrm(),
    reboque: () => ({
      modelo: faker.helpers.arrayElement(['Bitrem Graneleiro 9 Eixos', 'Rodotrem Basculante', 'Sider Librelato', 'Carreta Baú Facchini']),
      placas: [faker.vehicle.vrm(), faker.vehicle.vrm()],
      ano_fabricacao: faker.date.past(20).getFullYear(),
    }),
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
