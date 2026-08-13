// src/seeds/seedsUsuario.js

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker/locale/pt_BR';
import { fakeMappings } from './globalFakeMapping.js';
import Usuario from '../models/Usuario.js';
import Veiculos from '../models/Veiculo.js';
import Empresa from '../models/Empresa.js';

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

    const empresas = await Empresa.find({ status: 'ativo' });
    const empresaPrincipal = empresas[0] || null;

    function randomVeiculoId(collection) {
        return collection[Math.floor(Math.random() * collection.length)]._id;
    }

    function randomEmpresaId() {
        if (empresas.length === 0) return null;
        return empresas[Math.floor(Math.random() * empresas.length)]._id;
    }

    const usuarios = [];

    // Criar usuários padrão com dados fixos
    usuarios.push(
        {
            nome: 'Usuario Admin',
            email: 'admin@rotardv.com',
            senha: senhaHash,
            cpf: '00000000000',
            status: 'ativo',
            isAdmin: true,
            role: 'admin',
            email_verificado: true,
            authProvider: 'local',
            foto_perfil: 'https://rotardv.web.fslab.dev/uuid.jpeg',
            empresa: {
                nome: empresaPrincipal?.nome_empresa || 'Transportadora Rota Brasil',
                cargo: 'Administrador do Sistema'
            },
            empresa_id: empresaPrincipal?._id || null,
            veiculo_id: randomVeiculoId(veiculos)
        },
        {
            nome: 'Gestor Carlos Silva',
            email: 'gestor@rotabrasil.com.br',
            senha: senhaHash,
            cpf: '99999999999',
            status: 'ativo',
            isAdmin: false,
            role: 'gestor',
            email_verificado: true,
            authProvider: 'local',
            foto_perfil: 'https://rotardv.web.fslab.dev/uuid.jpeg',
            empresa: {
                nome: empresaPrincipal?.nome_empresa || 'Transportadora Rota Brasil',
                cargo: 'Gestor de Frotas'
            },
            empresa_id: empresaPrincipal?._id || null,
            veiculo_id: randomVeiculoId(veiculos)
        },
        {
            nome: 'Motorista 1',
            email: 'motorista1@example.com',
            cpf: '11111111111',
            senha: senhaHash,
            status: 'ativo',
            isAdmin: false,
            role: 'motorista',
            email_verificado: true,
            authProvider: 'local',
            foto_perfil: 'https://rotardv.web.fslab.dev/uuid.jpeg',
            empresa: {
                nome: empresaPrincipal?.nome_empresa || 'Transportadora Rota Brasil',
                cargo: 'Motorista Carreteiro'
            },
            empresa_id: empresaPrincipal?._id || null,
            veiculo_id: randomVeiculoId(veiculos)
        },
        {
            nome: 'Motorista 2',
            email: 'motorista2@example.com',
            cpf: '22222222222',
            senha: senhaHash,
            status: 'ativo',
            isAdmin: false,
            role: 'motorista',
            email_verificado: true,
            authProvider: 'local',
            foto_perfil: 'https://rotardv.web.fslab.dev/uuid.jpeg',
            empresa: {
                nome: empresaPrincipal?.nome_empresa || 'Transportadora Rota Brasil',
                cargo: 'Motorista Truck'
            },
            empresa_id: empresaPrincipal?._id || null,
            veiculo_id: randomVeiculoId(veiculos)
        },
        {
            nome: 'Usuário Teste',
            email: 'teste@example.com',
            cpf: '33333333333',
            senha: senhaHash,
            status: 'ativo',
            isAdmin: false,
            role: 'motorista',
            email_verificado: true,
            authProvider: 'local',
            foto_perfil: 'https://rotardv.web.fslab.dev/uuid.jpeg',
            empresa: {
                nome: 'Transportadora Rota Brasil',
                cargo: 'Motorista'
            },
            empresa_id: empresaPrincipal?._id || null,
            veiculo_id: randomVeiculoId(veiculos)
        },
        {
            nome: 'Usuário Inativo',
            email: 'inativo@example.com',
            cpf: '44444444444',
            senha: senhaHash,
            status: 'inativo',
            isAdmin: false,
            role: 'motorista',
            email_verificado: true,
            authProvider: 'local',
            foto_perfil: 'https://rotardv.web.fslab.dev/uuid.jpeg',
            empresa: {
                nome: 'Transportadora Rota Brasil',
                cargo: 'Motorista'
            },
            empresa_id: empresaPrincipal?._id || null,
            veiculo_id: randomVeiculoId(veiculos)
        }
    );

    // Gerar mais 5 usuários aleatórios usando o fakeMappings para preencher os campos.
    for (let i = 0; i < 5; i++) {
        usuarios.push({
            nome: fakeMappings.Usuario.nome(),
            email: fakeMappings.Usuario.email(),
            cpf: fakeMappings.Usuario.cpf(),
            senha: senhaHash,
            status: fakeMappings.Usuario.status(),
            isAdmin: false,
            role: 'motorista',
            email_verificado: faker.datatype.boolean(),
            authProvider: 'local',
            foto_perfil: fakeMappings.Usuario.foto_perfil(),
            empresa: fakeMappings.Usuario.empresa(),
            empresa_id: randomEmpresaId(),
            veiculo_id: randomVeiculoId(veiculos),
        });
    }

    const usuariosCriados = await Usuario.insertMany(usuarios);

    // Vincula o gestor criado à empresa principal
    const gestorCriado = usuariosCriados.find(u => u.role === 'gestor');
    if (gestorCriado && empresaPrincipal) {
        await Empresa.findByIdAndUpdate(empresaPrincipal._id, { gestor_id: gestorCriado._id });
    }

    console.log(`[SEED] ${usuariosCriados.length} usuários criados.`);
    console.log(`[SEED] Senha padrão: ${senhaPura}`);
    return usuariosCriados;
}

export default seedUsuarios;
