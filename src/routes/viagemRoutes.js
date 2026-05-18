// src/routes/viagemRoutes.js

import express from "express";
import ViagemController from "../controllers/ViagemController.js";
import { asyncWrapper } from "../utils/helpers/index.js";
import AuthMiddleware from "../middlewares/AuthMiddleware.js";

const router = express.Router();

const viagemController = new ViagemController();

router
    .get("/viagens", AuthMiddleware, asyncWrapper(viagemController.listar.bind(viagemController)))
    .get("/viagens/:id", AuthMiddleware, asyncWrapper(viagemController.listar.bind(viagemController)))
    .post("/viagens", AuthMiddleware, asyncWrapper(viagemController.criar.bind(viagemController)))
    .patch("/viagens/:id", AuthMiddleware, asyncWrapper(viagemController.atualizar.bind(viagemController)))
    .delete("/viagens/:id", AuthMiddleware, asyncWrapper(viagemController.deletar.bind(viagemController)));

export default router;
