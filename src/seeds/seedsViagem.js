// src/seeds/seedsViagem.js

import 'dotenv/config';
import Viagem from '../models/Viagem.js';
import Usuario from '../models/Usuario.js';
import Veiculos from '../models/Veiculo.js';
import { fakeMappings } from './globalFakeMapping.js';
import DbConnect from '../config/dbConnect.js';

await DbConnect.conectar();

async function seedViagens() {
    await Viagem.deleteMany();

    const usuarios = await Usuario.find();
    if (usuarios.length === 0) {
        throw new Error("Nenhum usuário encontrado. Rode o seed de usuários primeiro.");
    }

    const veiculos = await Veiculos.find();
    if (veiculos.length === 0) {
        throw new Error("Nenhum veículo encontrado. Rode o seed de veículos primeiro.");
    }

    const viagens = [];

    // Gerar 10 viagens aleatórias associando usuários e veículos existentes
    for (let i = 0; i < 10; i++) {
        const randomUsuario = usuarios[Math.floor(Math.random() * usuarios.length)];
        const randomVeiculo = veiculos[Math.floor(Math.random() * veiculos.length)];

        viagens.push({
            usuario_id: randomUsuario._id,
            veiculo_id: randomVeiculo._id,
            origem: fakeMappings.Viagem.origem(),
            destino: fakeMappings.Viagem.destino(),
            data_inicio: fakeMappings.Viagem.data_inicio(),
            data_fim: fakeMappings.Viagem.data_fim(),
            km_inicial: fakeMappings.Viagem.km_inicial(),
            km_final: fakeMappings.Viagem.km_final(),
            descricao: fakeMappings.common.descricao(),
            status: fakeMappings.Viagem.status()
        });
    }

    const viagensCriadas = await Viagem.insertMany(viagens);
    console.log(`[SEED] ${viagensCriadas.length} Viagens cadastradas!`);
    return viagensCriadas;
}

export default seedViagens;
