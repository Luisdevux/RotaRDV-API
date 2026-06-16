// src/seeds/seedsViagem.js

import 'dotenv/config';
import crypto from 'crypto';
import Viagem from '../models/Viagem.js';
import Usuario from '../models/Usuario.js';
import Veiculos from '../models/Veiculo.js';
import { fakeMappings } from './globalFakeMapping.js';

async function seedViagens() {
    console.log('[SEED] Iniciando seed de viagens...');
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

        // Snapshot do motorista
        const usuario_snapshot = {
            nome: randomUsuario.nome,
            email: randomUsuario.email
        };

        // Snapshot do veículo
        const veiculo_snapshot = {
            placa: randomVeiculo.placa,
            modelo: randomVeiculo.modelo,
            reboque: {
                modelo: randomVeiculo.reboque?.modelo,
                placas: randomVeiculo.reboque?.placas || []
            }
        };

        const km_inicial = fakeMappings.Viagem.km_inicial();
        const status = fakeMappings.Viagem.status();
        // Se for concluída, km_final deve ser >= km_inicial. Se em_andamento, pode ser nulo.
        const km_final = status === 'concluída' ? km_inicial + Math.floor(Math.random() * 2000) + 100 : null;

        viagens.push({
            _id: crypto.randomUUID(),
            usuario_id: randomUsuario._id,
            usuario_snapshot,
            veiculo_id: randomVeiculo._id,
            veiculo_snapshot,
            origem: fakeMappings.Viagem.origem(),
            destino: fakeMappings.Viagem.destino(),
            data_inicio: fakeMappings.Viagem.data_inicio(),
            data_fim: fakeMappings.Viagem.data_fim(),
            km_inicial,
            km_final,
            descricao: fakeMappings.common.descricao(),
            status,
            resumo_financeiro: {
                total_geral: 0,
                por_categoria: {
                    ABASTECIMENTO: 0,
                    ALIMENTACAO: 0,
                    MANUTENCAO: 0,
                    PEDAGIO: 0,
                    OUTROS: 0
                }
            }
        });
    }

    const viagensCriadas = await Viagem.insertMany(viagens);
    console.log(`[SEED] ${viagensCriadas.length} Viagens cadastradas com Snapshots!`);
    return viagensCriadas;
}

export default seedViagens;
