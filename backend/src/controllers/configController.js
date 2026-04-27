import { AIService } from "../ai/AIService.js";

export const getAIModels = async (req, res) => {
  const models = await AIService.getAvailableModels(req.session?.aiConfig);
  res.json(models.map(m => ({
    key: m.key,
    label: m.recommended ? `${m.label} - Recommended` : m.label,
  })));
};
