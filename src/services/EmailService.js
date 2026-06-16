// src/services/EmailService.js

import axios from 'axios';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

class EmailService {
    constructor() {
        this.apiKey = process.env.NPAAS_API_KEY;
        this.baseUrl = process.env.NPAAS_BASE_URL || 'https://npaas.fslab.dev/api/v1';
        this.tenantId = process.env.NPAAS_TENANT_ID; // usuarioId exigido pelo NPaaS para rastreamento
        
        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'x-api-key': this.apiKey,
                'Content-Type': 'application/json'
            }
        });
    }

    async _enviarNotificacao(payload) {
        try {
            const response = await this.client.post('/notificacoes/enviar', {
                usuarioId: this.tenantId, // ID do sistema/inquilino no NPaaS
                canal: 'email',
                ...payload
            });
            
            logger.info(`Notificação enviada via NPaaS. Status: ${response.status} - ID: ${response.data?._id}`);
            return response.data;
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message;
            logger.error(`Erro ao enviar notificação via NPaaS: ${errorMsg}`);
            // Não travamos o fluxo principal por erro de email, apenas logamos
            return null;
        }
    }

    async enviarEmailRecuperacao(email, token, nomeUsuario) {
        const corpoHtml = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <body style="font-family: sans-serif;">
                <h2>Recuperação de Senha - RotaRDV</h2>
                <p>Olá, <strong>${nomeUsuario}</strong>!</p>
                <p>Você solicitou a recuperação de senha. Utilize o código abaixo para redefinir sua senha:</p>
                <div style="padding: 20px; background-color: #f4f4f4; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px;">
                    ${token}
                </div>
                <p>Este código é válido por 1 hora.</p>
                <p>Se você não solicitou isso, por favor ignore este email.</p>
            </body>
            </html>
        `;

        return this._enviarNotificacao({
            destinatario: email,
            titulo: 'Recuperação de Senha - RotaRDV',
            corpo: corpoHtml,
            prioridade: 'alta'
        });
    }

    async enviarEmailVerificacao(email, token, nomeUsuario) {
        const linkVerificacao = `${process.env.API_BASE_URL || 'http://localhost:5040'}/verificar-email?token=${token}`;
        
        const corpoHtml = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <body style="font-family: sans-serif;">
                <h2>Verificação de Email - RotaRDV</h2>
                <p>Olá, <strong>${nomeUsuario}</strong>!</p>
                <p>Para confirmar seu email, clique no link abaixo:</p>
                <a href="${linkVerificacao}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Verificar Email</a>
                <p>Ou copie e cole o link: ${linkVerificacao}</p>
                <p>Este link é válido por 24 horas.</p>
            </body>
            </html>
        `;

        return this._enviarNotificacao({
            destinatario: email,
            titulo: 'Verificação de Email - RotaRDV',
            corpo: corpoHtml,
            prioridade: 'normal'
        });
    }
}

export default new EmailService();
