import { AI_MODELS } from "../config/models.js";

export const getAIModels = (req, res) => {
  res.json(AI_MODELS);
};
