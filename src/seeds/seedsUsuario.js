// src/seeds/seedsUsuario.js

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { fakeMappings } from './globalFakeMapping.js';
import Usuario from '../models/Usuario.js';
import Veiculos from '../models/Veiculo.js';
import DbConnect from '../config/dbConnect.js';

await DbConnect.conectar();

const senhaPura = 'Senha@123';
const senhaHash = bcrypt.hashSync(senhaPura, 8);

async function seedUsuarios() {
    await Usuario.deleteMany();

    const veiculos = await Veiculos.find();

    if (veiculos.length === 0) {
      throw new Error(
        "Nenhuma veiculo encontrada. Rode o seed de veiculos primeiro."
      );
    }

    function randomCollection(collection) {
      return [collection[Math.floor(Math.random() * collection.length)]._id];
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
            foto_perfil: 'https://rotardv.web.fslab.dev/uuid.jpeg',
            empresa: {
                nome: 'Empresa Caminhões Tanque',
                cargo: 'Motorista'
            },
            veiculo_id: randomCollection(veiculos)
        },
        {
            nome: 'Motorista 1',
            email: 'motorista1@example.com',
            cpf: '11111111111',
            senha: senhaHash,
            status: 'ativo',
            isAdmin: false,
            foto_perfil: 'https://rotardv.web.fslab.dev/uuid.jpeg',
            empresa: {
                nome: 'Empresa Caminhões Tanque',
                cargo: 'Motorista'
            },
            veiculo_id: randomCollection(veiculos)
        },
        {
            nome: 'Motorista 2',
            email: 'motorista2@example.com',
            cpf: '22222222222',
            senha: senhaHash,
            status: 'ativo',
            isAdmin: false,
            foto_perfil: 'https://rotardv.web.fslab.dev/uuid.jpeg',
            empresa: {
                nome: 'Empresa Caminhões Tanque',
                cargo: 'Motorista'
            },
            veiculo_id: randomCollection(veiculos)
        },
        {
            nome: 'Usuário Teste',
            email: 'teste@example.com',
            cpf: '33333333333',
            senha: senhaHash,
            status: 'ativo',
            isAdmin: false,
            foto_perfil: 'https://rotardv.web.fslab.dev/uuid.jpeg',
            empresa: {
                nome: 'Empresa Caminhões Tanque',
                cargo: 'Motorista'
            },
            veiculo_id: randomCollection(veiculos)
        },
        {
            nome: 'Usuário Inativo',
            email: 'inativo@example.com',
            cpf: '44444444444',
            senha: senhaHash,
            status: 'inativo',
            isAdmin: false,
            foto_perfil: 'https://rotardv.web.fslab.dev/uuid.jpeg',
            empresa: {
                nome: 'Empresa Caminhões Tanque',
                cargo: 'Motorista'
            },
            veiculo_id: randomCollection(veiculos)
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
            foto_perfil: fakeMappings.Usuario.foto_perfil(),
            empresa: fakeMappings.Usuario.empresa(),
            veiculo_id: randomCollection(veiculos),
        })
    }

    const usuariosCriados = await Usuario.insertMany(usuarios);

    console.log(`[SEED] ${usuariosCriados.length} usuários criados.`);
    console.log(`[SEED] Senha padrão: ${senhaPura}`);
    return usuariosCriados;
}

export default seedUsuarios;
