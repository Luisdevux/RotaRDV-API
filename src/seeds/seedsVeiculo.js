// src/seeds/seedsVeiculo.js

import 'dotenv/config';
import { fakeMappings } from './globalFakeMapping.js';
import Veiculos from '../models/Veiculo.js';
import Empresa from '../models/Empresa.js';

async function seedVeiculos() {
    console.log('[SEED] Iniciando seed de veículos...');
    await Veiculos.deleteMany();

    const empresas = await Empresa.find({ status: 'ativo' });
    function randomEmpresaId() {
        if (empresas.length === 0) return null;
        return empresas[Math.floor(Math.random() * empresas.length)]._id;
    }

    const veiculos = [];

    // Criar 5 veículos padrão com dados fixos.
    veiculos.push(
        {
            modelo: 'Veículo Admin',
            placa: 'ABC1234',
            empresa_id: randomEmpresaId(),
            combustivel_preferencial: 'DIESEL_S10',
            reboque: {
                modelo: 'Bitrem Graneleiro 9 Eixos',
                placas: ['RYQ-5I78', 'RYQ-5A79'],
                ano_fabricacao: 2025
            },
        },
        {
            modelo: 'Veículo 1',
            placa: 'DEF5678',
            empresa_id: randomEmpresaId(),
            combustivel_preferencial: 'DIESEL_S10',
            reboque: {
                modelo: 'Carreta Baú',
                placas: ['RYQ-5B80'],
                ano_fabricacao: 2024
            },
        },
        {
            modelo: 'Veículo 2',
            placa: 'GHI9012',
            empresa_id: randomEmpresaId(),
            combustivel_preferencial: 'DIESEL_S10',
            reboque: {
                modelo: 'Rodotrem Basculante',
                placas: ['RYQ-5C81', 'RYQ-5D82', 'RYQ-5E83'],
                ano_fabricacao: 2023
            },
        },
        {
            modelo: 'Veículo 3',
            placa: 'JKL3456',
            empresa_id: randomEmpresaId(),
            combustivel_preferencial: 'DIESEL_S10',
            reboque: {
                modelo: 'Sider',
                placas: ['RYQ-5F84'],
                ano_fabricacao: 2022
            },
        },
        {
            modelo: 'Veículo 4',
            placa: 'MNO7890',
            empresa_id: randomEmpresaId(),
            combustivel_preferencial: 'DIESEL_S10',
            reboque: {
                modelo: 'Porta Container',
                placas: ['RYQ-5G85'],
                ano_fabricacao: 2021
            },
        },
    );

    // Gerar mais 5 veículos aleatórios usando o fakeMappings para preencher os campos.
    for (let i = 0; i < 5; i++) {
        veiculos.push({
            modelo: fakeMappings.Veiculo.modelo(),
            placa: fakeMappings.Veiculo.placa(),
            empresa_id: randomEmpresaId(),
            combustivel_preferencial: fakeMappings.Veiculo.combustivel_preferencial(),
            reboque: fakeMappings.Veiculo.reboque()
        });
    }

    const veiculosCriados = await Veiculos.insertMany(veiculos);

    console.log(`[SEED] ${veiculosCriados.length} veículos criados.`);
    return veiculosCriados;
}

export default seedVeiculos;
