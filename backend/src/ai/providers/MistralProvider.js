import axios from "axios";
import logger from "../../utils/logger.js";

/**
 * Mistral AI Provider Implementation
 */
class MistralProvider {
  constructor() {
    this.name = "Mistral";
    this.apiKey = process.env.MISTRAL_API_KEY;
    this.apiUrl = "https://api.mistral.ai/v1/chat/completions";
  }

  isAvailable() {
    return !!this.apiKey;
  }

  /**
   * List available models from Mistral
   */
  async listModels(apiKey = null) {
    const key = apiKey || this.apiKey;
    if (!key) return [];

    try {
      const response = await axios.get(this.modelsUrl || "https://api.mistral.ai/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });

      return response.data.data
        .filter((m) => m.capabilities.completion || m.id.includes("mistral-"))
        .map((m) => ({
          key: m.id,
          label: `${m.id} (Mistral)`,
          provider: "mistral",
          config: { model: m.id },
        }));
    } catch (error) {
      logger.error("Mistral listModels error:", error.message);
      return [];
    }
  }
  async generate(prompt, config = {}) {
    const apiKey = config.apiKey || this.apiKey;

    if (!apiKey) {
      throw new Error("Mistral API Key is missing");
    }

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: config.model || "mistral-large-latest",
          messages: [{ role: "user", content: prompt }],
          temperature: config.temperature ?? 0.2,
          max_tokens: config.maxTokens ?? 4000,
          response_format: config.responseSchema ? { type: "json_object" } : undefined,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      logger.error(`Mistral API Error (${config.model}):`, error.response?.data || error.message);
      throw new Error(`Mistral generation failed: ${error.message}`);
    }
  }

  /**
   * Mistral Embeddings (Optional)
   */
  async embed(text, config = {}) {
    const apiKey = config.apiKey || this.apiKey;
    try {
      const response = await axios.post(
        "https://api.mistral.ai/v1/embeddings",
        {
          model: config.model || "mistral-embed",
          input: [text],
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );
      return response.data.data[0].embedding;
    } catch (error) {
      logger.error("Mistral Embedding Error:", error.response?.data || error.message);
      throw new Error(`Mistral embedding failed: ${error.message}`);
    }
  }
}

export const mistralProvider = new MistralProvider();
