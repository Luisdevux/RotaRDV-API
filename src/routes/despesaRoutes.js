// src/routes/despesaRoutes.js

import express from 'express';
import DespesaController from '../controllers/DespesaController.js';
import { asyncWrapper } from '../utils/helpers/index.js';
import AuthMiddleware from '../middlewares/AuthMiddleware.js';

const router = express.Router();

const despesaController = new DespesaController();

router
    .get('/despesas', AuthMiddleware, asyncWrapper(despesaController.listar.bind(despesaController)))
    .get('/despesas/:id', AuthMiddleware, asyncWrapper(despesaController.listar.bind(despesaController)))
    .post('/despesas', AuthMiddleware, asyncWrapper(despesaController.criar.bind(despesaController)))
    .delete('/despesas/:id', AuthMiddleware, asyncWrapper(despesaController.deletar.bind(despesaController)))
    .post('/despesas/:id/foto', AuthMiddleware, asyncWrapper(despesaController.fotoUpload.bind(despesaController)))
    .delete('/despesas/:id/foto', AuthMiddleware, asyncWrapper(despesaController.fotoDelete.bind(despesaController)));

export default router;
