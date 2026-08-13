// src/config/hermesClient.js

import { HermesClient } from '@ruanlopes1350/hermes-client';
import { EnvAdapter } from '@ruanlopes1350/hermes-client/node';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

const hermesClient = new HermesClient({
    baseUrl: process.env.HERMES_BASE_URL || 'https://api.hermes.qa.fslab.dev',
    initialApiKey: process.env.HERMES_API_KEY,
    storageAdapter: new EnvAdapter('.env', 'HERMES_API_KEY'),
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
