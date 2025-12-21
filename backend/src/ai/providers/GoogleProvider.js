import envConfig from "../../../config/envConfig.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
    if (!this.isAvailable()) {
      throw new Error("Google provider not configured. Please set GEMINI_API_KEY.");
    }

    const {
      model = "gemini-2.5-flash",
      temperature = 0.2,
    } = config;

    try {
      const geminiModel = this.client.getGenerativeModel({
        model,
        generationConfig: {
          temperature,
        },
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
