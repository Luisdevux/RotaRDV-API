// src/routes/empresaRoutes.js

import express from 'express';
import EmpresaController from '../controllers/EmpresaController.js';
import { asyncWrapper } from '../utils/helpers/index.js';
import AuthMiddleware from '../middlewares/AuthMiddleware.js';

const router = express.Router();

const empresaController = new EmpresaController();

router
    .get('/empresas', AuthMiddleware, asyncWrapper(empresaController.listar.bind(empresaController)))
    .get('/empresas/:id', AuthMiddleware, asyncWrapper(empresaController.listar.bind(empresaController)))
    .post('/empresas', AuthMiddleware, asyncWrapper(empresaController.criar.bind(empresaController)))
    .patch('/empresas/:id', AuthMiddleware, asyncWrapper(empresaController.atualizar.bind(empresaController)))
    .patch('/empresas/:id/status', AuthMiddleware, asyncWrapper(empresaController.atualizarStatus.bind(empresaController)))
    .delete('/empresas/:id', AuthMiddleware, asyncWrapper(empresaController.deletar.bind(empresaController)))

    // Essas rotas aqui vão ser separadas para um possível futuro painel web de gestão, e também para que me ajude a visualizar melhor
    .get('/empresas/:id/motoristas', AuthMiddleware, asyncWrapper(empresaController.listarMotoristas.bind(empresaController)))
    .get('/empresas/:id/veiculos', AuthMiddleware, asyncWrapper(empresaController.listarVeiculos.bind(empresaController)))
    .get('/empresas/:id/viagens', AuthMiddleware, asyncWrapper(empresaController.listarViagens.bind(empresaController)))
    .get('/empresas/:id/dashboard', AuthMiddleware, asyncWrapper(empresaController.obterDashboard.bind(empresaController)))
    .post('/empresas/:id/motoristas', AuthMiddleware, asyncWrapper(empresaController.cadastrarMotorista.bind(empresaController)))
    .post('/empresas/:id/motoristas/vincular', AuthMiddleware, asyncWrapper(empresaController.vincularMotorista.bind(empresaController)))
    .delete('/empresas/:id/motoristas/:motoristaId', AuthMiddleware, asyncWrapper(empresaController.desvincularMotorista.bind(empresaController)))
    .post('/empresas/:id/foto', AuthMiddleware, asyncWrapper(empresaController.fotoLogoUpload.bind(empresaController)))
    .delete('/empresas/:id/foto', AuthMiddleware, asyncWrapper(empresaController.fotoLogoDelete.bind(empresaController)));

export default router;
