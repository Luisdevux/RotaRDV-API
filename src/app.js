// src/app.js

import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import os from "os";
import errorHandler from './utils/helpers/errorHandler.js';
import logger from './utils/logger.js';
import DbConnect from './config/dbConnect.js';
import setupGarage from './config/setupGarage.js';
import routes from './routes/index.js';
import CommonResponse from './utils/helpers/CommonResponse.js';
import express from "express";
import expressFileUpload from "express-fileupload";
import { expressWebhookHandler } from "@ruanlopes1350/hermes-client/express";
import hermesClient from "./config/hermesClient.js";
import compression from 'compression';

// Criando a instância do Express
const app = express();

// Configuração para acessar as variáveis de ambiente
dotenv.config({ quiet: true });

// Confia apenas no número configurado de saltos de reverse proxy (evita spoofing de X-Forwarded-For)
const trustProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS || '1', 10);
app.set('trust proxy', Number.isNaN(trustProxyHops) ? 1 : trustProxyHops);

// Conectando ao banco de dados
await DbConnect.conectar();
// Configurando o Garage para armazenamento de arquivos
await setupGarage();

// Middlewares de segurança
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "blob:"],
        }
    }
}));

// Habilitando CORS
app.use(cors());

// Habilitando a compressão de respostas
app.use(compression());

// Rota para expor webhook de rotação automática de chaves do Hermes
if (process.env.HERMES_WEBHOOK_SECRET) {
    app.post(
        '/webhook/hermes',
        express.raw({ type: 'application/json' }),
        expressWebhookHandler(hermesClient, process.env.HERMES_WEBHOOK_SECRET),
    );
}

// Habilitando o uso de json pelo express
app.use(express.json());

// Habilitando o uso de arquivos pelo express usando diretório temporário em disco (evita RAM OOM DoS)
app.use(expressFileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // Trava em 50MB
    useTempFiles: true,
    tempFileDir: os.tmpdir(),
    abortOnLimit: true // Rejeita a requisição e poupa a banda automaticamente se passar
}));

// Habilitando o uso de urlencoded pelo express
app.use(express.urlencoded({ extended: true }));

// Servindo arquivos estáticos da pasta public
app.use('/public', express.static('public'));

// Passando para o arquivo de rotas o app
routes(app);

// Middleware para lidar com rotas não encontradas (404)
app.use((req, res, _next) => {
    return CommonResponse.error(
        res,
        404,
        'resourceNotFound',
        null,
        [{
            message: 'Rota não encontrada.'
        }]
    );
});

// Listener para erros não tratados
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception thrown:', error);
});

// Middleware de Tratamento de Erros (deve ser adicionado após as rotas)
app.use(errorHandler);

// Exportando para o server.js fazer uso
export default app;
