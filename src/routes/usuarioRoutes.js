// src/routes/usuarioRoutes.js

import express from 'express';
import UsuarioController from '../controllers/UsuarioController.js';
import { asyncWrapper } from '../utils/helpers/index.js';
import AuthMiddleware from '../middlewares/AuthMiddleware.js';

const router = express.Router();

const usuarioController = new UsuarioController();

router
    .get('/usuarios', AuthMiddleware, asyncWrapper(usuarioController.listar.bind(usuarioController)))
    .get('/usuarios/:id', AuthMiddleware, asyncWrapper(usuarioController.listar.bind(usuarioController)))
    .post('/usuarios', AuthMiddleware, asyncWrapper(usuarioController.criar.bind(usuarioController)))
    .patch('/usuarios/:id', AuthMiddleware, asyncWrapper(usuarioController.atualizar.bind(usuarioController)))
    .patch('/usuarios/:id/status', AuthMiddleware, asyncWrapper(usuarioController.atualizarStatus.bind(usuarioController)))
    .delete('/usuarios/:id', AuthMiddleware, asyncWrapper(usuarioController.deletar.bind(usuarioController)))
    .post('/usuarios/:id/foto', AuthMiddleware, asyncWrapper(usuarioController.fotoUpload.bind(usuarioController)))
    .delete('/usuarios/:id/foto', AuthMiddleware, asyncWrapper(usuarioController.fotoDelete.bind(usuarioController)));

export default router;
