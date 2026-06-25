// src/seeds/seedsUsuario.js

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker/locale/pt_BR';
import { fakeMappings } from './globalFakeMapping.js';
import Usuario from '../models/Usuario.js';
import Veiculos from '../models/Veiculo.js';

const senhaPura = 'Senha@123';
const senhaHash = bcrypt.hashSync(senhaPura, 8);

async function seedUsuarios() {
    console.log('[SEED] Iniciando seed de usuários...');
    await Usuario.deleteMany();

    const veiculos = await Veiculos.find();

    if (veiculos.length === 0) {
      throw new Error(
        "Nenhum veículo encontrado. Rode o seed de veiculos primeiro."
      );
    }

    function randomVeiculoId(collection) {
      return collection[Math.floor(Math.random() * collection.length)]._id;
    }

    const usuarios = [];

    // Criar 5 usuários padrão com dados fixos.
    usuarios.push(
        {
            nome: 'Usuario Admin',
            email: 'admin@rotardv.com',
            senha: senhaHash,
            cpf: '00000000000',
            status: 'ativo',
            isAdmin: true,
            email_verificado: true,
            authProvider: 'local',
            foto_perfil: 'https://rotardv.web.fslab.dev/uuid.jpeg',
            empresa: {
                nome: 'Empresa Caminhões Tanque',
                cargo: 'Motorista'
            },
            veiculo_id: randomVeiculoId(veiculos)
        },
        {
            nome: 'Motorista 1',
            email: 'motorista1@example.com',
            cpf: '11111111111',
            senha: senhaHash,
            status: 'ativo',
            isAdmin: false,
            email_verificado: true,
            authProvider: 'local',
            foto_perfil: 'https://rotardv.web.fslab.dev/uuid.jpeg',
            empresa: {
                nome: 'Empresa Caminhões Tanque',
                cargo: 'Motorista'
            },
            veiculo_id: randomVeiculoId(veiculos)
        },
        {
            nome: 'Motorista 2',
            email: 'motorista2@example.com',
            cpf: '22222222222',
            senha: senhaHash,
            status: 'ativo',
            isAdmin: false,
            email_verificado: true,
            authProvider: 'local',
            foto_perfil: 'https://rotardv.web.fslab.dev/uuid.jpeg',
            empresa: {
                nome: 'Empresa Caminhões Tanque',
                cargo: 'Motorista'
            },
            veiculo_id: randomVeiculoId(veiculos)
        },
        {
            nome: 'Usuário Teste',
            email: 'teste@example.com',
            cpf: '33333333333',
            senha: senhaHash,
            status: 'ativo',
            isAdmin: false,
            email_verificado: true,
            authProvider: 'local',
            foto_perfil: 'https://rotardv.web.fslab.dev/uuid.jpeg',
            empresa: {
                nome: 'Empresa Caminhões Tanque',
                cargo: 'Motorista'
            },
            veiculo_id: randomVeiculoId(veiculos)
        },
        {
            nome: 'Usuário Inativo',
            email: 'inativo@example.com',
            cpf: '44444444444',
            senha: senhaHash,
            status: 'inativo',
            isAdmin: false,
            email_verificado: true,
            authProvider: 'local',
            foto_perfil: 'https://rotardv.web.fslab.dev/uuid.jpeg',
            empresa: {
                nome: 'Empresa Caminhões Tanque',
                cargo: 'Motorista'
            },
            veiculo_id: randomVeiculoId(veiculos)
        }
    );

    // Gerar mais 5 usuários aleatórios usando o fakeMappings para preencher os campos.
    for(let i = 0; i < 5; i++) {
        usuarios.push({
            nome: fakeMappings.Usuario.nome(),
            email: fakeMappings.Usuario.email(),
            cpf: fakeMappings.Usuario.cpf(),
            senha: senhaHash,
            status: fakeMappings.Usuario.status(),
            isAdmin: fakeMappings.Usuario.isAdmin(),
            email_verificado: faker.datatype.boolean(),
            authProvider: 'local',
            foto_perfil: fakeMappings.Usuario.foto_perfil(),
            empresa: fakeMappings.Usuario.empresa(),
            veiculo_id: randomVeiculoId(veiculos),
        })
    }

    const usuariosCriados = await Usuario.insertMany(usuarios);

    console.log(`[SEED] ${usuariosCriados.length} usuários criados.`);
    console.log(`[SEED] Senha padrão: ${senhaPura}`);
    return usuariosCriados;
}

export default seedUsuarios;
