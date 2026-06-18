// src/services/EmailService.js

import axios from 'axios';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

class EmailService {
    constructor() {
        this.apiKey = process.env.HERMES_API_KEY;
        this.baseUrl = process.env.HERMES_BASE_URL || 'https://api.hermes.qa.fslab.dev';
        // this.tenantId = process.env.NPAAS_TENANT_ID; // usuarioId exigido pelo NPaaS para rastreamento

        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'X-API-Key': this.apiKey,
                'Content-Type': 'application/json'
            }
        });
    }

    async _enviarNotificacao(payload) {
        try {
            const finalPayload = {
                usuarioId: payload.usuarioId,
                canal: 'email',
                ...payload
            };

            const response = await this.client.post('/api/emails', finalPayload);

            logger.info(`Notificação enviada via Hermes - Serviço de E-mail. Status: ${response.status} - ID: ${response.data?.dados?._id}`);
            return response.data;
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message;
            logger.error(`Erro ao enviar notificação via Hermes - Serviço de E-mail: ${errorMsg}`);
            // Não travamos o fluxo principal por erro de email, apenas logamos
            return null;
        }
    }

    async enviarEmailRecuperacao(email, token, nomeUsuario, usuarioId = null) {
        return this._enviarNotificacao({
            usuarioId,
            recipient_to: email,
            template_id: '1a1fc3af-80b0-443f-92ef-ae3b025eae23',
            variables: {
                nomeUsuario: nomeUsuario,
                token: token
            }
        });
    }

    async enviarEmailVerificacao(email, token, nomeUsuario, usuarioId = null) {
        const linkVerificacao = `${process.env.API_BASE_URL || 'http://localhost:5040'}/verificar-email?token=${token}`;

        return this._enviarNotificacao({
            usuarioId,
            recipient_to: email,
            subject: 'Verificação de Email - RotaRDV',
            template_id: '95f9e573-039c-43fa-862a-376858c02728',
            variables: {
                nomeUsuario: nomeUsuario,
                linkVerificacao: linkVerificacao
            }
        });
    }
}

export default new EmailService();
