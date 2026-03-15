import * as Minio from 'minio';
import 'dotenv/config';

const requiredGarageVars = [
    'GARAGE_ENDPOINT',
    'GARAGE_PORT',
    'GARAGE_PUBLIC_URL',
    'GARAGE_ACCESS_KEY',
    'GARAGE_SECRET_KEY',
    'GARAGE_BUCKET_FOTOS'
];

for (const varName of requiredGarageVars) {
    if (!process.env[varName]) {
        console.error(`GARAGE: Variável de ambiente '${varName}' não está definida. Verifique seu arquivo .env ou docker-compose.`);
        process.exit(1);
    }
};

const garageClient = new Minio.Client({
    endPoint: process.env.GARAGE_ENDPOINT,
    port: parseInt(process.env.GARAGE_PORT, 10),
    useSSL: process.env.GARAGE_USE_SSL === 'true',
    accessKey: process.env.GARAGE_ACCESS_KEY,
    secretKey: process.env.GARAGE_SECRET_KEY,
    region: 'garage',
    pathStyle: true
});

export default garageClient;
