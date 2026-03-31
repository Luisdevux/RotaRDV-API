// src/seeds/seeds.js

import 'dotenv/config';
import mongoose from 'mongoose';
import seedUsuarios from './seedsUsuario.js';
import seedVeiculos from './seedsVeiculo.js';

async function main() {
    try {
        await seedVeiculos();
        await seedUsuarios();

        console.log('>>> SEED FINALIZADO COM SUCESSO! <<<');
    } catch (err) {
        console.error('Erro ao executar SEED:', err);
    } finally {
        mongoose.connection.close();
        process.exit(0);
    }
}

main();
