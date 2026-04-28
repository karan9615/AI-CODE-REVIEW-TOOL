import envConfig from "../../../config/envConfig.js";
import OpenAI from "openai";

const apiKey = envConfig.openApiKey;

if (!apiKey) {
  console.warn("⚠️  OPENAI_API_KEY missing. OpenAI provider disabled.");
}

const openai = apiKey ? new OpenAI({ apiKey }) : null;

/**
 * OpenAI Provider
 * Supports: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
 */
export class OpenAIProvider {
  constructor() {
    this.client = openai;
    this.name = "OpenAI";
  }

  /**
   * Check if provider is available
   */
  isAvailable() {
    return this.client !== null;
  }

  /**
   * List available models from OpenAI
   */
  async listModels(apiKey = null) {
    const client = apiKey ? new OpenAI({ apiKey }) : this.client;
    if (!client) return [];

    try {
      const response = await client.models.list();
      return response.data
        .filter((m) => m.id.includes("gpt-"))
        .map((m) => ({
          key: m.id,
          label: `${m.id} (OpenAI)`,
          provider: "openai",
          config: { model: m.id },
        }));
    } catch (error) {
      console.error("OpenAI listModels error:", error.message);
      return [];
    }
  }

  /**
   * Generate completion using OpenAI models
   * @param {string} prompt - The prompt to send
   * @param {Object} config - Model configuration
   * @returns {Promise<string>} The generated response
   */
  async generate(prompt, config = {}) {
    const { apiKey } = config;
    let client = this.client;

    if (apiKey) {
      client = new OpenAI({ apiKey });
    }

    if (!client) {
      throw new Error(
        "OpenAI provider not configured. Please set OPENAI_API_KEY or provide a custom key.",
      );
    }

    const {
      model = "gpt-4",
      temperature = 0.2,
      maxTokens = 4000,
      systemPrompt = "You are a helpful senior software engineer. Follow instructions strictly and return structured output when requested.",
      responseMimeType,
      responseSchema,
    } = config;

    const completionConfig = {
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    };

    // Map application/json to OpenAI's JSON mode or Schema
    if (responseSchema) {
      completionConfig.response_format = {
        type: "json_schema",
        json_schema: {
          name: "response_data",
          strict: true,
          schema: responseSchema,
        },
      };
    } else if (responseMimeType === "application/json") {
      completionConfig.response_format = { type: "json_object" };
    }

    try {
      const response = await client.chat.completions.create(completionConfig);

      return response.choices[0].message.content;
    } catch (error) {
      console.error(`OpenAI API Error (${model}):`, error.message);
      throw new Error(`OpenAI generation failed: ${error.message}`);
    }
  }

  /**
   * Generate embedding for text
   * @param {string} text - The text to embed
   * @param {Object} config - Configuration (model)
   * @returns {Promise<Array<number>>} The embedding vector
   */
  async embed(text, config = {}) {
    const { apiKey, model = "text-embedding-3-small" } = config;
    let client = this.client;

    if (apiKey) {
      client = new OpenAI({ apiKey });
    }

    if (!client) {
      throw new Error("OpenAI provider not configured.");
    }

    try {
      const response = await client.embeddings.create({
        model,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error(`OpenAI Embedding Error (${model}):`, error.message);
      throw new Error(`OpenAI embedding failed: ${error.message}`);
    }
  }
}

// Singleton instance
export const openaiProvider = new OpenAIProvider();
