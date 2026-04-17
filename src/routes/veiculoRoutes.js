// src/routes/veiculoRoutes.js

import express from "express";
import VeiculoController from "../controllers/VeiculoController.js";
import { asyncWrapper } from "../utils/helpers/index.js";
import AuthMiddleware from "../middlewares/AuthMiddleware.js";

const router = express.Router();

const veiculoController = new VeiculoController();

router
    .get("/veiculos", AuthMiddleware, asyncWrapper(veiculoController.listar.bind(veiculoController)))

export default router;
