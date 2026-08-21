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
            modelo: 'Volvo FH 540',
            placa: 'ABC1D23',
            status: 'ativo',
            capacidade_tanque: 600,
            ano_fabricacao: 2024,
            empresa_id: randomEmpresaId(),
            combustivel_preferencial: 'DIESEL_S10',
            reboque: {
                modelo: 'Bitrem Graneleiro 9 Eixos',
                placas: ['RYQ-5I78', 'RYQ-5A79'],
                ano_fabricacao: 2024
            },
        },
        {
            modelo: 'Scania R450',
            placa: 'DEF5G78',
            status: 'ativo',
            capacidade_tanque: 500,
            ano_fabricacao: 2023,
            empresa_id: randomEmpresaId(),
            combustivel_preferencial: 'DIESEL_S10',
            reboque: {
                modelo: 'Carreta Baú Facchini',
                placas: ['RYQ-5B80'],
                ano_fabricacao: 2023
            },
        },
        {
            modelo: 'Mercedes-Benz Actros 2651',
            placa: 'GHI9J12',
            status: 'ativo',
            capacidade_tanque: 700,
            ano_fabricacao: 2024,
            empresa_id: randomEmpresaId(),
            combustivel_preferencial: 'DIESEL_S10',
            reboque: {
                modelo: 'Rodotrem Basculante Randon',
                placas: ['RYQ-5C81', 'RYQ-5D82', 'RYQ-5E83'],
                ano_fabricacao: 2024
            },
        },
        {
            modelo: 'DAF XF 530',
            placa: 'JKL3M56',
            status: 'ativo',
            capacidade_tanque: 550,
            ano_fabricacao: 2022,
            empresa_id: randomEmpresaId(),
            combustivel_preferencial: 'DIESEL_S10',
            reboque: {
                modelo: 'Sider Librelato',
                placas: ['RYQ-5F84'],
                ano_fabricacao: 2022
            },
        },
        {
            modelo: 'MAN TGX 28.440 (Parado Manutenção)',
            placa: 'MNO7P90',
            status: 'inativo',
            capacidade_tanque: 450,
            ano_fabricacao: 2020,
            empresa_id: randomEmpresaId(),
            combustivel_preferencial: 'DIESEL_S10',
            reboque: {
                modelo: 'Porta Container Guerra',
                placas: ['RYQ-5G85'],
                ano_fabricacao: 2020
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
