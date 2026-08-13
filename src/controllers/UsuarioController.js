// src/controllers/UsuarioController.js

import UsuarioService from '../services/UsuarioService.js';
import {
  UsuarioSchema,
  UsuarioUpdateSchema,
  UsuarioStatusUpdateSchema
} from '../utils/validators/schemas/zod/UsuarioSchema.js';
import {
  UsuarioQuerySchema,
  UsuarioIdSchema,
} from '../utils/validators/schemas/zod/querys/UsuarioQuerySchema.js';
import {
  CommonResponse,
  CustomError,
  HttpStatusCodes,
} from '../utils/helpers/index.js';

class UsuarioController {
  constructor() {
    this.service = new UsuarioService();
  }

  async listar(req, res) {
    const { id } = req.params;
    if (id) {
      UsuarioIdSchema.parse(id);
    }

    const query = req?.query;
    if (Object.keys(query).length !== 0) {
      await UsuarioQuerySchema.parseAsync(query);
    }

    const data = await this.service.listar(req);

    // Mensagem contextualizada para listagem
    if (id) {
      return CommonResponse.success(
        res,
        data,
        HttpStatusCodes.OK.code,
        'Usuário encontrado com sucesso.',
      );
    }

    // Resultado paginado - verificar se há resultados
    const totalDocs = data?.totalDocs ?? data?.docs?.length ?? 0;
    if (totalDocs === 0) {
      const temFiltros =
        query && (query.nome || query.categoria || query.status);
      const mensagem = temFiltros
        ? 'Nenhum usuário encontrado com os filtros informados.'
        : 'Nenhum usuário cadastrado.';
      return CommonResponse.success(
        res,
        data,
        HttpStatusCodes.OK.code,
        mensagem,
      );
    }

    return CommonResponse.success(
      res,
      data,
      HttpStatusCodes.OK.code,
      `${totalDocs} usuário(s) encontrado(s).`,
    );
  }

  async criar(req, res) {
    // Validar se o body não está vazio
    if (!req.body || Object.keys(req.body).length === 0) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: 'validationError',
        field: 'body',
        details: [
          {
            path: 'body',
            message: 'O corpo da requisição não pode ser vazio.',
          },
        ],
        customMessage:
          'O corpo da requisição é obrigatório para criar um usuário.',
      });
    }

    const parsedData = UsuarioSchema.parse(req.body);
    const data = await this.service.criar(parsedData, req);

    const usuarioLimpo = data.toObject();
    delete usuarioLimpo.senha;

    return CommonResponse.created(res, usuarioLimpo);
  }

  async atualizar(req, res) {
    const { id } = req.params;
    UsuarioIdSchema.parse(id);

    // Validar se o body não está vazio
    if (!req.body || Object.keys(req.body).length === 0) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: 'validationError',
        field: 'body',
        details: [
          {
            path: 'body',
            message: 'O corpo da requisição não pode ser vazio.',
          },
        ],
        customMessage: 'Informe pelo menos um campo para atualizar o usuário.',
      });
    }

    const parsedData = UsuarioUpdateSchema.parse(req.body);
    const data = await this.service.atualizar(id, parsedData, req);

    const usuarioLimpo = data.toObject();
    delete usuarioLimpo.senha;

    return CommonResponse.success(
      res,
      usuarioLimpo,
      HttpStatusCodes.OK.code,
      'Usuário atualizado com sucesso.',
    );
  }

  async atualizarStatus(req, res) {
    const { id } = req.params;
    UsuarioIdSchema.parse(id);

    const parsedData = UsuarioStatusUpdateSchema.parse(req.body || {});
    const data = await this.service.atualizarStatus(id, parsedData, req);

    return CommonResponse.success(
      res,
      data,
      HttpStatusCodes.OK.code,
      'Status do usuário atualizado com sucesso.',
    );
  }

  async deletar(req, res) {
    const { id } = req.params;
    UsuarioIdSchema.parse(id);

    if (!id) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: 'validationError',
        field: 'id',
        details: [
          {
            path: 'id',
            message: 'O ID do usuário é obrigatório.',
          },
        ],
        customMessage: 'ID do usuário é obrigatório para deletar.',
      });
    }

    const data = await this.service.deletar(id, req);
    return CommonResponse.success(
      res,
      data,
      HttpStatusCodes.OK.code,
      'Usuário excluído com sucesso.',
    );
  }

  async fotoUpload(req, res) {
    const { id } = req.params;
    UsuarioIdSchema.parse(id);

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
      message: 'Foto processada e usuário atualizado com sucesso.',
      dados: { foto_perfil: url },
      metadados: metadata,
    });
  }

  async fotoDelete(req, res) {
    const { id } = req.params;
    UsuarioIdSchema.parse(id);

    await this.service.fotoDelete(id, req);

    return CommonResponse.success(
      res,
      null,
      HttpStatusCodes.OK.code,
      'Foto excluída com sucesso.',
    );
  }
}

export default UsuarioController;
