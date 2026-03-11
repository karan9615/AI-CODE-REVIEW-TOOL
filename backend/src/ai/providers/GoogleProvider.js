import envConfig from "../../../config/envConfig.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { toGeminiSchema } from "../utils/schemaConverter.js";

const apiKey = envConfig.geminiApiKey;

if (!apiKey) {
  console.warn("⚠️  GEMINI_API_KEY missing. Google provider disabled.");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Google Gemini Provider
 * Supports: Gemini Pro, Gemini Flash
 */
export class GoogleProvider {
  constructor() {
    this.client = genAI;
    this.name = "Google";
  }

  /**
   * Check if provider is available
   */
  isAvailable() {
    return this.client !== null;
  }

  /**
   * Generate completion using Google Gemini models
   * @param {string} prompt - The prompt to send
   * @param {Object} config - Model configuration
   * @returns {Promise<string>} The generated response
   */
  async generate(prompt, config = {}) {
    const { apiKey } = config;
    let client = this.client;

    // improved: Use custom API key if provided
    if (apiKey) {
      client = new GoogleGenerativeAI(apiKey);
    }

    if (!client) {
      throw new Error(
        "Google provider not configured. Please set GEMINI_API_KEY or provide a custom key.",
      );
    }

    const {
      model = "gemini-1.5-flash",
      temperature = 0.2,
      responseMimeType,
      responseSchema,
    } = config;

    try {
      const generationConfig = {
        temperature,
      };

      if (responseMimeType) {
        generationConfig.responseMimeType = responseMimeType;
      }

      if (responseSchema) {
        generationConfig.responseSchema = toGeminiSchema(responseSchema);
        generationConfig.responseMimeType = "application/json";
      }

      const geminiModel = client.getGenerativeModel({
        model,
        generationConfig,
      });

      const result = await geminiModel.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error(`Google Gemini API Error (${model}):`, error.message);

      // Specifically catch free tier quota lockouts which commonly hit Premium models early
      if (
        error.status === 429 ||
        error.message?.includes("429") ||
        error.message?.includes("quota")
      ) {
        if (
          error.message?.includes("free_tier") ||
          error.message?.includes("FreeTier")
        ) {
          throw new Error(
            `The selected model (${model}) requires a paid API billing tier or its free quota is exhausted. Please switch to a 'Free Tier' optimized model (e.g. Gemini 2.5 Flash) or upgrade your Gemini API account.`,
          );
        }
        throw new Error(
          `Gemini API Quota Exceeded (429 Rate Limit) for model ${model}. Please try again later or upgrade your API tier.`,
        );
      }

      throw new Error(`Gemini generation failed: ${error.message}`);
    }
  }
}

// Singleton instance
export const googleProvider = new GoogleProvider();
