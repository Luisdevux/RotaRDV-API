// src/seeds/seedsDespesa.js

import { faker } from '@faker-js/faker/locale/pt_BR';
import 'dotenv/config';
import crypto from 'crypto';
import Despesa from '../models/Despesa.js';
import DespesaAbastecimento from '../models/DespesaAbastecimento.js';
import DespesaAlimentacao from '../models/DespesaAlimentacao.js';
import DespesaManutencao from '../models/DespesaManutencao.js';
import DespesaPedagio from '../models/DespesaPedagio.js';
import Viagem from '../models/Viagem.js';
import { fakeMappings } from './globalFakeMapping.js';
import DbConnect from '../config/dbConnect.js';

await DbConnect.conectar();

async function seedDespesas() {
    await Despesa.deleteMany();

    const viagens = await Viagem.find();
    if (viagens.length === 0) {
        throw new Error("Nenhuma viagem encontrada. Rode o seed de viagens primeiro.");
    }

    let count = 0;

    // Para cada viagem, gera algumas despesas sortidas
    for (const viagem of viagens) {
        const numDespesas = Math.floor(Math.random() * 5) + 2; // entre 2 e 6 despesas por viagem

        for (let i = 0; i < numDespesas; i++) {
            // Pega um schema derivado aleatoriamente
            const modelsDisponiveis = ['DespesaAbastecimento', 'DespesaAlimentacao', 'DespesaManutencao', 'DespesaPedagio'];
            const tipoSeed = modelsDisponiveis[Math.floor(Math.random() * modelsDisponiveis.length)];

            const dadosComuns = {
                _id: crypto.randomUUID(),
                viagem_id: viagem._id,
                valor_total: parseFloat(fakeMappings.Despesa.valor_total()),
                data: fakeMappings.Despesa.data(),
                local: fakeMappings.Despesa.local(),
                descricao: fakeMappings.common.descricao(),
                foto_anexo: fakeMappings.Despesa.foto_anexo()
            };

            switch (tipoSeed) {
                case 'DespesaAbastecimento': {
                    // KM de abastecimento deve estar entre inicial e final (se existir)
                    let km_abast = viagem.km_inicial + Math.floor(Math.random() * 50);
                    if (viagem.km_final) {
                        km_abast = faker.number.int({ min: viagem.km_inicial, max: viagem.km_final });
                    }

                    await DespesaAbastecimento.create({
                        ...dadosComuns,
                        tipo: 'ABASTECIMENTO',
                        litros: fakeMappings.DespesaAbastecimento.litros(),
                        km_atual: km_abast
                    });
                    break;
                }
                case 'DespesaAlimentacao':
                    await DespesaAlimentacao.create({
                        ...dadosComuns,
                        tipo: 'ALIMENTACAO',
                        tipo_refeicao: fakeMappings.DespesaAlimentacao.tipo_refeicao()
                    });
                    break;
                case 'DespesaManutencao':
                    await DespesaManutencao.create({
                        ...dadosComuns,
                        tipo: 'MANUTENCAO',
                        oficina_nome: fakeMappings.DespesaManutencao.oficina_nome()
                    });
                    break;
                case 'DespesaPedagio':
                    await DespesaPedagio.create({
                        ...dadosComuns,
                        tipo: 'PEDAGIO',
                        praca_nome: fakeMappings.DespesaPedagio.praca_nome()
                    });
                    break;
            }
            count++;
        }
    }

    console.log(`[SEED] ${count} Despesas cadastradas com sucesso!`);
}

export default seedDespesas;
