// src/routes/authRoutes.js

import express from 'express';
import AuthController from '../controllers/AuthController.js';
import { asyncWrapper } from '../utils/helpers/index.js';
import { strictRateLimit } from '../middlewares/RateLimitMiddleware.js';

const router = express.Router();

const authController = new AuthController();

router
    .post('/login', asyncWrapper(authController.login.bind(authController)))
    .post('/logout', asyncWrapper(authController.logout.bind(authController)))
    .post('/refresh', asyncWrapper(authController.refresh.bind(authController)))
    .post('/recover', strictRateLimit, asyncWrapper(authController.recuperaSenha.bind(authController)))
    .patch('/password/reset', strictRateLimit, asyncWrapper(authController.atualizarSenhaToken.bind(authController)))
    .post('/signup', asyncWrapper(authController.signup.bind(authController)));

export default router;
