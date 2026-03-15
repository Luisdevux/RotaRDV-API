// src/config/dbConnect.js

import dotenv from "dotenv";
import mongoose from "mongoose";
import logger from '../utils/logger.js';

dotenv.config();

class DbConnect {
    /**
     * Estabelece a conexão com o MongoDB.
     */
    static async conectar() {
        try {
            const mongoUri = process.env.DB_URL;

            if (!mongoUri) {
                throw new Error("A variável de ambiente DB_URL não está definida.");
            }

            logger.info('DB_URL está definida.');

            // Configuração de strictQuery baseada no ambiente
            if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
                mongoose.set('strictQuery', false);
            } else {
                mongoose.set('strictQuery', true);
            }

            // Configurações condicional para autoIndex e debug
            if (process.env.NODE_ENV === 'development') {
                mongoose.set('autoIndex', true);
                mongoose.set('debug', true);
                logger.info('Configurações de desenvolvimento ativadas: autoIndex e debug.');
            } else {
                mongoose.set('autoIndex', false);
                mongoose.set('debug', false);
                logger.info('Configurações de produção ativadas: autoIndex e debug desativados.');
            }

            // Adiciona listeners para eventos do Mongoose
            mongoose.connection.on('connected', () => {
                logger.info('Mongoose conectado ao MongoDB.');
            });

            mongoose.connection.on('error', (err) => {
                logger.error(`Mongoose erro: ${err}`);
            });

            mongoose.connection.on('disconnected', () => {
                logger.info('Mongoose desconectado do MongoDB.');
            });

            // Conexão com opções configuráveis
            await mongoose.connect(mongoUri, {
                serverSelectionTimeoutMS: process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS
                    ? parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS)
                    : 7000,
                socketTimeoutMS: process.env.MONGO_SOCKET_TIMEOUT_MS
                    ? parseInt(process.env.MONGO_SOCKET_TIMEOUT_MS)
                    : 45000,
                connectTimeoutMS: process.env.MONGO_CONNECT_TIMEOUT_MS
                    ? parseInt(process.env.MONGO_CONNECT_TIMEOUT_MS)
                    : 10000,
                retryWrites: true,
                maxPoolSize: process.env.MONGO_MAX_POOL_SIZE
                    ? parseInt(process.env.MONGO_MAX_POOL_SIZE)
                    : 10,
            });

            logger.info('Conexão com o banco estabelecida!');
        } catch (error) {
            logger.error(`Erro na conexão com o banco de dados em ${new Date().toISOString()}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Desconecta do MongoDB.
     */
    static async desconectar() {
        try {
            await mongoose.disconnect();
            logger.info('Conexão com o banco encerrada!');
        } catch (error) {
            logger.error(`Erro ao desconectar do banco de dados em ${new Date().toISOString()}: ${error.message}`);
            throw error;
        }
    }
}

export default DbConnect;
