import { HermesClient, EnvAdapter } from '@ruanlopes1350/hermes-client';
import dotenv from 'dotenv';

dotenv.config();

const hermesClient = new HermesClient({
    baseUrl: process.env.HERMES_BASE_URL || 'https://api.hermes.qa.fslab.dev',
    storageAdapter: new EnvAdapter('.env', 'HERMES_API_KEY')
});

export default hermesClient;
