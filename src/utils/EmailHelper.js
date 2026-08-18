// src/utils/EmailHelper.js

import hermesClient from '../config/hermesClient.js';
import {
    HermesError,
    HermesValidationError,
    HermesAuthError,
    HermesRateLimitError,
    HermesTimeoutError,
    HermesNetworkError,
    templateHelpers
} from '@ruanlopes1350/hermes-client';
import logger from './logger.js';

class EmailHelper {
    static TEMPLATES = {
        VERIFICACAO_EMAIL: '2abdd387-b4f3-4d20-917a-fd8920df25ae',
        RECUPERACAO_SENHA: '647584d9-76ac-4179-b7e6-bc74180c4776',
        BOAS_VINDAS_MOTORISTA: 'f27fed7e-8e3c-4c12-bd2d-f2ea180b4056'
    };

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
    static async enviarEmailBoasVindasMotorista({ email, nome, nomeEmpresa }) {
        try {
            const saudacao = templateHelpers.greeting(nome);
            const mensagem = `${saudacao}!\n\nVocê foi cadastrado na plataforma RotaRDV pela transportadora ${nomeEmpresa}.\n\nVocê já pode acessar o aplicativo móvel com o seu email (${email}) utilizando o Login com Google ou cadastrando sua senha de acesso.\n\nBom trabalho e boa viagem!`;

            const resposta = await hermesClient.email()
                .to(email)
                .subject(`Bem-vindo ao RotaRDV - ${nomeEmpresa}`)
                .useTemplate(this.TEMPLATES.BOAS_VINDAS_MOTORISTA, {
                    nomeUsuario: nome,
                    nomeEmpresa,
                    email,
                    mensagem
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
