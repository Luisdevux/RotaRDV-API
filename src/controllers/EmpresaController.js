// src/controllers/EmpresaController.js

import EmpresaService from '../services/EmpresaService.js';
import {
    EmpresaSchema,
    EmpresaUpdateSchema,
    EmpresaStatusUpdateSchema,
    CadastrarMotoristaEmpresaSchema,
    VincularMotoristaSchema
} from '../utils/validators/schemas/zod/EmpresaSchema.js';
import {
    EmpresaQuerySchema,
    EmpresaIdSchema
} from '../utils/validators/schemas/zod/querys/EmpresaQuerySchema.js';
import { UsuarioIdSchema } from '../utils/validators/schemas/zod/querys/UsuarioQuerySchema.js';
import {
    CommonResponse,
    CustomError,
    HttpStatusCodes,
} from '../utils/helpers/index.js';

class EmpresaController {
    constructor() {
        this.service = new EmpresaService();
    }

    async listar(req, res) {
        const { id } = req.params;
        if (id) {
            EmpresaIdSchema.parse(id);
        }

        const query = req?.query;
        if (query && Object.keys(query).length !== 0) {
            await EmpresaQuerySchema.parseAsync(query);
        }

        const data = await this.service.listar(req);

        if (id) {
            return CommonResponse.success(
                res,
                data,
                HttpStatusCodes.OK.code,
                'Empresa encontrada com sucesso.'
            );
        }

        const totalDocs = data?.totalDocs ?? data?.docs?.length ?? 0;
        if (totalDocs === 0) {
            return CommonResponse.success(
                res,
                data,
                HttpStatusCodes.OK.code,
                'Nenhuma empresa cadastrada ou encontrada com os filtros informados.'
            );
        }

        return CommonResponse.success(
            res,
            data,
            HttpStatusCodes.OK.code,
            `${totalDocs} empresa(s) encontrada(s).`
        );
    }

    async criar(req, res) {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validationError',
                field: 'body',
                customMessage: 'O corpo da requisição é obrigatório para cadastrar uma empresa.',
            });
        }

        const parsedData = await EmpresaSchema.parseAsync(req.body);
        const data = await this.service.criar(parsedData, req);

        return CommonResponse.created(res, data, 'Empresa cadastrada com sucesso.');
    }

    async atualizar(req, res) {
        const { id } = req.params;
        EmpresaIdSchema.parse(id);

        if (!req.body || Object.keys(req.body).length === 0) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validationError',
                field: 'body',
                customMessage: 'O corpo da requisição é obrigatório para atualizar a empresa.',
            });
        }

        const parsedData = await EmpresaUpdateSchema.parseAsync(req.body);
        const data = await this.service.atualizar(id, parsedData, req);

        return CommonResponse.success(
            res,
            data,
            HttpStatusCodes.OK.code,
            'Empresa atualizada com sucesso.'
        );
    }

    async atualizarStatus(req, res) {
        const { id } = req.params;
        EmpresaIdSchema.parse(id);

        const parsedData = await EmpresaStatusUpdateSchema.parseAsync(req.body);
        const data = await this.service.atualizarStatus(id, parsedData, req);

        return CommonResponse.success(
            res,
            data,
            HttpStatusCodes.OK.code,
            `Status da empresa alterado para "${parsedData.status}" com sucesso.`
        );
    }

    async deletar(req, res) {
        const { id } = req.params;
        EmpresaIdSchema.parse(id);

        await this.service.deletar(id, req);

        return CommonResponse.success(
            res,
            null,
            HttpStatusCodes.OK.code,
            'Empresa excluída com sucesso.'
        );
    }

    // Métodos de gerenciamento da empresa, como motoristas, veiculos e viagens
    async cadastrarMotorista(req, res) {
        const { id } = req.params;
        EmpresaIdSchema.parse(id);

        const parsedData = await CadastrarMotoristaEmpresaSchema.parseAsync(req.body);
        const data = await this.service.cadastrarMotorista(id, parsedData, req);

        return CommonResponse.created(
            res,
            data,
            'Motorista cadastrado e vinculado à empresa com sucesso.'
        );
    }

    async vincularMotorista(req, res) {
        const { id } = req.params;
        EmpresaIdSchema.parse(id);

        const parsedData = await VincularMotoristaSchema.parseAsync(req.body);
        const data = await this.service.vincularMotorista(id, parsedData, req);

        return CommonResponse.success(
            res,
            data,
            HttpStatusCodes.OK.code,
            'Motorista vinculado à empresa com sucesso.'
        );
    }

    async desvincularMotorista(req, res) {
        const { id, motoristaId } = req.params;
        EmpresaIdSchema.parse(id);
        UsuarioIdSchema.parse(motoristaId);

        const data = await this.service.desvincularMotorista(id, motoristaId, req);

        return CommonResponse.success(
            res,
            data,
            HttpStatusCodes.OK.code,
            'Motorista desvinculado da empresa com sucesso.'
        );
    }

    async listarMotoristas(req, res) {
        const { id } = req.params;
        EmpresaIdSchema.parse(id);

        const data = await this.service.listarMotoristas(id, req);

        const totalDocs = data?.totalDocs ?? data?.docs?.length ?? 0;
        return CommonResponse.success(
            res,
            data,
            HttpStatusCodes.OK.code,
            totalDocs === 0
                ? 'Nenhum motorista vinculado a esta empresa.'
                : `${totalDocs} motorista(s) vinculado(s) à empresa.`
        );
    }

    async listarVeiculos(req, res) {
        const { id } = req.params;
        EmpresaIdSchema.parse(id);

        const data = await this.service.listarVeiculos(id, req);

        const totalDocs = data?.totalDocs ?? data?.docs?.length ?? 0;
        return CommonResponse.success(
            res,
            data,
            HttpStatusCodes.OK.code,
            totalDocs === 0
                ? 'Nenhum veículo vinculado a esta empresa.'
                : `${totalDocs} veículo(s) vinculado(s) à empresa.`
        );
    }

    async listarViagens(req, res) {
        const { id } = req.params;
        EmpresaIdSchema.parse(id);

        const data = await this.service.listarViagens(id, req);

        const totalDocs = data?.totalDocs ?? data?.docs?.length ?? 0;
        return CommonResponse.success(
            res,
            data,
            HttpStatusCodes.OK.code,
            totalDocs === 0
                ? 'Nenhuma viagem encontrada para esta empresa.'
                : `${totalDocs} viagem(ns) encontrada(s) para esta empresa.`
        );
    }

    /**
     * Rota feita com o objetivo de obter o resumo de métricas para um Painel Web da Empresa
     */
    async obterDashboard(req, res) {
        const { id } = req.params;
        EmpresaIdSchema.parse(id);

        const data = await this.service.obterDashboard(id, req);

        return CommonResponse.success(
            res,
            data,
            HttpStatusCodes.OK.code,
            'Dashboard da empresa obtido com sucesso.'
        );
    }

    async fotoUpload(req, res) {
        const { id } = req.params;
        EmpresaIdSchema.parse(id);

        const file = req.files?.file || req.files?.imagem;
        if (!file) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validationError',
                field: 'file',
                details: [{ path: 'file', message: 'Nenhum arquivo enviado.' }],
                customMessage: 'A imagem é obrigatória para o upload.',
            });
        }

        const { url, metadata } = await this.service.fotoUpload(id, file, req);

        return CommonResponse.success(res, {
            message: 'Foto processada e empresa atualizada com sucesso.',
            dados: { foto_logo: url },
            metadados: metadata,
        });
    }

    async fotoDelete(req, res) {
        const { id } = req.params;
        EmpresaIdSchema.parse(id);

        await this.service.fotoDelete(id, req);

        return CommonResponse.success(
            res,
            null,
            HttpStatusCodes.OK.code,
            'Foto excluída com sucesso.',
        );
    }
}

export default EmpresaController;
