// src/utils/EmailHelper.js

import hermesClient from '../config/hermesClient.js';
import {
    HermesError,
    HermesValidationError,
    HermesAuthError,
    HermesRateLimitError,
    HermesTimeoutError,
    HermesNetworkError
} from '@ruanlopes1350/hermes-client';
import logger from './logger.js';

class EmailHelper {
    static get TEMPLATES() {
        return {
            VERIFICACAO_EMAIL: process.env.HERMES_TEMPLATE_VERIFICACAO_EMAIL || 'a718e877-a25d-49f7-ada6-203a154b2d6b',
            RECUPERACAO_SENHA: process.env.HERMES_TEMPLATE_RECUPERACAO_SENHA || '8755ec5b-6d73-49f6-a6f7-2ecc2d2c5a79',
            BOAS_VINDAS_MOTORISTA: process.env.HERMES_TEMPLATE_BOAS_VINDAS_MOTORISTA || '15081568-c3da-4935-985c-e8670ce5eb8b'
        };
    }

    /**
     * Trata e formata logs de erros específicos do SDK Hermes
     */
    static _handleHermesError(error, context) {
        if (error instanceof HermesValidationError) {
            logger.error(`[EmailHelper] Erro de validação local no builder Hermes (${context}):`, { fields: error.fields });
        } else if (error instanceof HermesRateLimitError) {
            logger.warn(`[EmailHelper] Rate limit atingido no Hermes (${context}). Retry after: ${error.retryAfterMs}ms`);
        } else if (error instanceof HermesAuthError) {
            logger.error(`[EmailHelper] Falha de autenticação/API Key no Hermes (${context}) [HTTP ${error.statusCode}]: ${error.message}`);
        } else if (error instanceof HermesTimeoutError) {
            logger.error(`[EmailHelper] Timeout excedido no envio de email (${context}): ${error.message}`);
        } else if (error instanceof HermesNetworkError) {
            logger.error(`[EmailHelper] Falha de rede ao conectar com a API Hermes (${context}): ${error.message}`, { cause: error.cause });
        } else if (error instanceof HermesError) {
            logger.error(`[EmailHelper] Erro retornado pela API Hermes (${context}) [${error.code} - HTTP ${error.statusCode}]: ${error.message}`, { details: error.details });
        } else {
            logger.error(`[EmailHelper] Erro inesperado no envio de email (${context}): ${error.message}`);
        }
    }

    /**
     * Envia email de verificação com link de confirmação para ativação da conta
     */
    static async enviarEmailVerificacao({ email, nome, token }) {
        try {
            const baseUrl = process.env.API_BASE_URL || 'https://rotardv-api.luisfelipe.dpdns.org';
            const linkVerificacao = `${baseUrl}/verificar-email?token=${token}`;

            const resposta = await hermesClient.email()
                .to(email)
                .subject('Verificação de Email - RotaRDV')
                .useTemplate(this.TEMPLATES.VERIFICACAO_EMAIL, {
                    nomeUsuario: nome,
                    linkVerificacao
                })
                .priority('high')
                .send();

            logger.info(`[EmailHelper] Email de verificação enviado com sucesso para ${email}`);
            return resposta;
        } catch (error) {
            this._handleHermesError(error, `Verificação de Email - ${email}`);
            return null;
        }
    }

    /**
     * Envia email com código / token para redefinição de senha
     */
    static async enviarEmailRecuperacaoSenha({ email, nome, token }) {
        try {
            const resposta = await hermesClient.email()
                .to(email)
                .subject('Recuperação de Senha - RotaRDV')
                .useTemplate(this.TEMPLATES.RECUPERACAO_SENHA, {
                    nomeUsuario: nome,
                    token
                })
                .priority('high')
                .send();

            logger.info(`[EmailHelper] Email de recuperação de senha enviado com sucesso para ${email}`);
            return resposta;
        } catch (error) {
            this._handleHermesError(error, `Recuperação de Senha - ${email}`);
            return null;
        }
    }

    /**
     * Envia email de boas-vindas com instruções de login quando a empresa cadastra um motorista
     */
    static async enviarEmailBoasVindasMotorista({ email, nome, nomeEmpresa, linkApp }) {
        try {
            const link = linkApp || process.env.APP_SCHEME_URL || 'rotardv://auth/login';

            const resposta = await hermesClient.email()
                .to(email)
                .subject(`Bem-vindo ao RotaRDV - ${nomeEmpresa}`)
                .useTemplate(this.TEMPLATES.BOAS_VINDAS_MOTORISTA, {
                    nomeUsuario: nome,
                    nomeEmpresa,
                    email,
                    linkApp: link
                })
                .priority('high')
                .send();

            logger.info(`[EmailHelper] Email de boas-vindas enviado ao motorista: ${email}`);
            return resposta;
        } catch (error) {
            this._handleHermesError(error, `Boas-vindas Motorista - ${email}`);
            return null;
        }
    }
}

export default EmailHelper;
