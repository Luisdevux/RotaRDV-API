// src/seeds/seeds.js

import 'dotenv/config';
import mongoose from 'mongoose';
import seedsVeiculo from './seedsVeiculo.js';
import seedsUsuario from './seedsUsuario.js';
import seedsViagem from './seedsViagem.js';
import seedsDespesa from './seedsDespesa.js';

import DbConnect from '../config/dbConnect.js';

async function main() {
    try {
        await DbConnect.conectar();
        
        await seedsVeiculo();
        await seedsUsuario();
        await seedsViagem();
        await seedsDespesa();

        console.log('>>> SEED FINALIZADO COM SUCESSO! <<<');
    } catch (err) {
        console.error('Erro ao executar SEED:', err);
    } finally {
        mongoose.connection.close();
        process.exit(0);
    }
}

main();
