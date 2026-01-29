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
      throw new Error(`Gemini generation failed: ${error.message}`);
    }
  }
}

// Singleton instance
export const googleProvider = new GoogleProvider();
