import express from "express";
import { getAIModels } from "../controllers/configController.js";

const router = express.Router();

router.get("/models", getAIModels);

export default router;
