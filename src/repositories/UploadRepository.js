// src/repositories/UploadRepository.js

import garageClient from '../config/garageConnect.js';
import 'dotenv/config';

class UploadRepository {
    constructor() {
        this.bucket = process.env.GARAGE_BUCKET_FOTOS;
    }

    /**
     * Faz upload de um arquivo para o Garage (S3).
     * @param {Buffer} buffer - Buffer do arquivo.
     * @param {string} fileName - Nome do arquivo a ser salvo.
     * @param {string} contentType - Tipo MIME do arquivo (ex: image/jpeg).
     * @returns {Promise<string>} - URL pública do arquivo.
     */
    async uploadFile(buffer, fileName, contentType) {
        try {
            // Define metadados para garantir que o arquivo seja exibido corretamente no navegador
            const metaData = {
                'Content-Type': contentType,
            };

            await garageClient.putObject(this.bucket, fileName, buffer, buffer.length, metaData);

            // Gera a URL pública
            // Prioriza a variável GARAGE_PUBLIC_URL se definida, senão constrói a URL padrão do endpoint
            let publicUrl;
            if (process.env.GARAGE_PUBLIC_URL) {
                // Remove trailing slash se houver e monta a URL
                const baseUrl = process.env.GARAGE_PUBLIC_URL.replace(/\/$/, "");
                publicUrl = `${baseUrl}/${fileName}`;
            } else {
                const protocol = process.env.GARAGE_USE_SSL === 'true' ? 'https' : 'http';
                publicUrl = `${protocol}://${process.env.GARAGE_ENDPOINT}:${process.env.GARAGE_PORT}/${this.bucket}/${fileName}`;
            }
            return publicUrl;
        } catch (error) {
            console.error('Erro no upload para Garage:', error);
            throw new Error('Falha ao fazer upload do arquivo. Tente novamente mais tarde.', { cause: error });
        }
    }

    /**
     * Faz download de um arquivo do Garage (retorna o Buffer).
     * Utilizar apenas se precisar processar o arquivo no backend.
     * Para exibir no front-end, usar a URL pública (uploadFile retorna a URL).
     * @param {string} fileName - Nome do arquivo.
     * @returns {Promise<Buffer>}
     */
    async getFile(fileName) {
        try {
            const stream = await garageClient.getObject(this.bucket, fileName);
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            return Buffer.concat(chunks);
        } catch (error) {
            console.error('Erro no download do Garage:', error);
            throw new Error('Arquivo não encontrado ou falha ao baixar.', { cause: error });
        }
    }

    /**
     * Deleta um arquivo do Garage.
     * @param {string} fileNameOrUrl - Nome do arquivo ou URL completa.
     * @returns {Promise<void>}
     */
    async deleteFile(fileNameOrUrl) {
        try {
            let fileName = fileNameOrUrl;

            // Se for uma URL completa, extrai o nome do arquivo
            if(fileNameOrUrl.includes('/')) {
              const parts = fileNameOrUrl.split('/');
              fileName = parts[parts.length -1];
            }

            await garageClient.removeObject(this.bucket, fileName);
        } catch (error) {
            console.error(`Erro ao deletar arquivo ${fileNameOrUrl} do Garage:`, error.message);
            // IMPORTANTE: Lançar erro para que a lógica de retry em background do UploadService saiba que falhou
            throw new Error('Falha ao deletar o arquivo do storage.', { cause: error });
        }
    }
}

export default UploadRepository;
