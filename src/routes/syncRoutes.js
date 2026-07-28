// src/routes/syncRoutes.js

import express from "express";
import SyncController from "../controllers/SyncController.js";
import { asyncWrapper } from "../utils/helpers/index.js";
import AuthMiddleware from "../middlewares/AuthMiddleware.js";

const router = express.Router();

const syncController = new SyncController();

router
    .post("/sync/push", AuthMiddleware, asyncWrapper(syncController.push.bind(syncController)))
    .get("/sync/pull", AuthMiddleware, asyncWrapper(syncController.pull.bind(syncController)));

export default router;
