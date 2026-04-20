// src/routes/veiculoRoutes.js

import express from "express";
import VeiculoController from "../controllers/VeiculoController.js";
import { asyncWrapper } from "../utils/helpers/index.js";
import AuthMiddleware from "../middlewares/AuthMiddleware.js";

const router = express.Router();

const veiculoController = new VeiculoController();

router
    .get("/veiculos", AuthMiddleware, asyncWrapper(veiculoController.listar.bind(veiculoController)))
    .get("/veiculos/:id", AuthMiddleware, asyncWrapper(veiculoController.listar.bind(veiculoController)))
    .post("/veiculos", AuthMiddleware, asyncWrapper(veiculoController.criar.bind(veiculoController)))
    .patch("/veiculos/:id", AuthMiddleware, asyncWrapper(veiculoController.atualizar.bind(veiculoController)))
    .delete("/veiculos/:id", AuthMiddleware, asyncWrapper(veiculoController.deletar.bind(veiculoController)));

export default router;
