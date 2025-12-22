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
   * Generate completion using OpenAI models
   * @param {string} prompt - The prompt to send
   * @param {Object} config - Model configuration
   * @returns {Promise<string>} The generated response
   */
  async generate(prompt, config = {}) {
    if (!this.isAvailable()) {
      throw new Error(
        "OpenAI provider not configured. Please set OPENAI_API_KEY."
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
      const response = await this.client.chat.completions.create(
        completionConfig
      );

      return response.choices[0].message.content;
    } catch (error) {
      console.error(`OpenAI API Error (${model}):`, error.message);
      throw new Error(`OpenAI generation failed: ${error.message}`);
    }
  }
}

// Singleton instance
export const openaiProvider = new OpenAIProvider();
