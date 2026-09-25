// src/config/hermesClient.js

import fs from 'fs';
import { HermesClient, GenericKVAdapter } from '@ruanlopes1350/hermes-client';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';
import HermesApiKey from '../models/HermesApiKey.js';

dotenv.config();

const HERMES_KEY_NAME = 'HERMES_API_KEY';

// Cache em memória para o processo atual
let cachedApiKey = process.env.HERMES_API_KEY || null;

/**
 * StorageAdapter genérico para ambientes efêmeros (Kubernetes, Docker, Serverless)
 * que persiste a chave rotacionada na coleção 'hermes_api_keys' do MongoDB (compartilhado por todos os pods/réplicas)
 * e mantém fallback para variáveis de ambiente e cache local em memória
 */
const storageAdapter = new GenericKVAdapter({
    get: async () => {
        try {
            // Se o MongoDB estiver conectado, busca a chave ativa mais recente
            if (mongoose.connection.readyState === 1) {
                const doc = await HermesApiKey.findOne({ active: true }).sort({ createdAt: -1 }).lean();
                if (doc && doc.apiKey) {
                    cachedApiKey = doc.apiKey;
                    process.env.HERMES_API_KEY = doc.apiKey;
                    return doc.apiKey;
                }

                // Se o banco ainda não possui nenhuma chave registrada, inicializa com a do .env/Secret
                if (process.env.HERMES_API_KEY) {
                    await HermesApiKey.create({
                        apiKey: process.env.HERMES_API_KEY,
                        active: true,
                        rotatedAt: new Date()
                    });
                    logger.info('[HermesClient] Chave inicial do Hermes sincronizada no MongoDB com sucesso!');
                    cachedApiKey = process.env.HERMES_API_KEY;
                    return process.env.HERMES_API_KEY;
                }
            }
        } catch (error) {
            logger.warn(`[HermesClient] Falha ao consultar HermesApiKey no MongoDB: ${error.message}. Usando cache.`);
        }

        // Fallback para cache em memória ou variável de ambiente inicial
        return cachedApiKey || process.env.HERMES_API_KEY || null;
    },

    set: async (newKey) => {
        // Atualiza a memória do processo atual imediatamente
        cachedApiKey = newKey;
        process.env.HERMES_API_KEY = newKey;

        // Persiste no MongoDB compartilhado para que todos os pods no Kubernetes tenham acesso
        try {
            if (mongoose.connection.readyState === 1) {
                await HermesApiKey.updateMany({ active: true }, { active: false });
                await HermesApiKey.create({
                    apiKey: newKey,
                    active: true,
                    rotatedAt: new Date()
                });
                logger.info('[HermesClient] Nova HermesApiKey persistida no MongoDB com sucesso!');
            } else {
                logger.warn('[HermesClient] MongoDB desconectado no momento da rotação. Chave mantida em memória.');
            }
        } catch (error) {
            logger.error(`[HermesClient] Erro ao persistir nova HermesApiKey no MongoDB: ${error.message}`);
        }

        // Em desenvolvimento local, atualiza também o arquivo .env se existir
        if (process.env.NODE_ENV === 'development') {
            try {
                if (fs.existsSync('.env')) {
                    let envContent = fs.readFileSync('.env', 'utf-8');
                    const regex = new RegExp(`^${HERMES_KEY_NAME}=.*$`, 'm');
                    if (regex.test(envContent)) {
                        envContent = envContent.replace(regex, `${HERMES_KEY_NAME}=${newKey}`);
                    } else {
                        envContent += `\n${HERMES_KEY_NAME}=${newKey}\n`;
                    }
                    fs.writeFileSync('.env', envContent, 'utf-8');
                    logger.info('[HermesClient] Arquivo .env local atualizado.');
                }
            } catch (err) {
                logger.debug(`[HermesClient] Não foi possível atualizar .env local: ${err.message}`);
            }
        }
    }
});

const hermesClient = new HermesClient({
    baseUrl: process.env.HERMES_BASE_URL || 'https://api.hermes.qa.fslab.dev',
    initialApiKey: process.env.HERMES_API_KEY,
    storageAdapter,
    logLevel: process.env.NODE_ENV === 'development' ? 'info' : 'warn',
    timeoutMs: 30000,
    retry: {
        maxAttempts: 3,
        baseDelayMs: 1000,
        backoffFactor: 2,
        maxDelaysMs: 15000,
        retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    },
});

// Eventos de ciclo de vida do cliente Hermes
hermesClient.on('keyRotated', (newKey, oldKey) => {
    logger.info('[HermesClient] API Key rotacionada automaticamente com sucesso!', {
        de: oldKey ? `${oldKey.substring(0, 6)}...` : 'null',
        para: `${newKey.substring(0, 6)}...`
    });
});

hermesClient.on('retry', (attempt, error, delayMs) => {
    logger.warn(`[HermesClient] Tentativa ${attempt} falhou. Retentando em ${delayMs}ms... Motivo: ${error.message}`);
});

hermesClient.on('error', (err) => {
    logger.error(`[HermesClient] Erro no cliente Hermes: ${err.message}`);
});

export default hermesClient;
