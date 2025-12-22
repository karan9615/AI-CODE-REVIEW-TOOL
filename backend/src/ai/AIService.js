import { openaiProvider } from "./providers/OpenAIProvider.js";
import { googleProvider } from "./providers/GoogleProvider.js";
import { getModelConfig } from "../config/aiConfig.js";

/**
 * Provider Registry
 * Maps provider names to their instances
 */
const PROVIDER_REGISTRY = {
  openai: openaiProvider,
  google: googleProvider,
  // Easy to add new providers:
  // anthropic: anthropicProvider,
  // cohere: cohereProvider,
};

/**
 * AI Service - Unified interface for all AI providers
 *
 * This service automatically routes requests to the correct provider
 * based on the model key. Adding new providers is as simple as:
 * 1. Creating a provider class in providers/
 * 2. Adding it to PROVIDER_REGISTRY
 * 3. Configuring it in aiConfig.js
 */
export class AIService {
  /**
   * Generate AI completion for any configured model
   * @param {string} modelKey - The model key (e.g., "gpt-4", "gemini-pro")
   * @param {string} prompt - The prompt to send
   * @param {Object} customConfig - Optional custom configuration to override defaults
   * @returns {Promise<string>} The generated response
   */
  static async generate(modelKey, prompt, customConfig = {}) {
    // Get model configuration
    const modelConfig = getModelConfig(modelKey);

    if (!modelConfig) {
      throw new Error(
        `Invalid model key: "${modelKey}". Please check available models in configuration.`
      );
    }

    // Get the provider instance
    const provider = PROVIDER_REGISTRY[modelConfig.provider];

    if (!provider) {
      throw new Error(
        `Provider "${modelConfig.provider}" not found in registry. Please add it to PROVIDER_REGISTRY.`
      );
    }

    // Check if provider is available (API key configured)
    if (!provider.isAvailable()) {
      throw new Error(
        `Provider "${provider.name}" is not available. Please configure the required API key.`
      );
    }

    // Merge model config with custom config (custom config takes precedence)
    const finalConfig = {
      ...modelConfig.config,
      ...customConfig,
    };

    console.log(
      `🤖 Generating with ${provider.name} (${modelConfig.config.model})...`
    );

    // Generate using the provider
    const rawResponse = await provider.generate(prompt, finalConfig);

    // If schema is provided, we guarantee an object response
    if (
      finalConfig.responseSchema ||
      finalConfig.responseMimeType === "application/json"
    ) {
      return this.parseStructuredOutput(rawResponse);
    }

    return rawResponse;
  }

  /**
   * Safe JSON parser for AI responses.
   * Handles markdown code blocks and common formatting issues.
   * @param {string} response - Raw AI response string
   * @returns {Object|Array} Parsed JSON
   */
  static parseStructuredOutput(response) {
    try {
      // 1. Try direct parse
      return JSON.parse(response);
    } catch (e) {
      // 2. Clean Markdown and retry
      const clean = response
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      try {
        return JSON.parse(clean);
      } catch (error) {
        console.error("❌ Failed to parse AI JSON response:", response);
        throw new Error("AI response was not valid JSON despite strict mode.");
      }
    }
  }

  /**
   * Check if a specific model is available
   * @param {string} modelKey - The model key to check
   * @returns {boolean} True if model is available, false otherwise
   */
  static isModelAvailable(modelKey) {
    const modelConfig = getModelConfig(modelKey);
    if (!modelConfig) return false;

    const provider = PROVIDER_REGISTRY[modelConfig.provider];
    if (!provider) return false;

    return provider.isAvailable();
  }

  /**
   * Get all available models (only those with configured API keys)
   * @returns {Promise<Array>} Array of available model configurations
   */
  static async getAvailableModels() {
    const { getAvailableModels } = await import("../config/aiConfig.js");
    const allModels = getAvailableModels();

    return allModels.filter((model) => {
      const provider = PROVIDER_REGISTRY[model.provider];
      return provider && provider.isAvailable();
    });
  }
}

// Legacy compatibility: Export old function names
export async function runAI(modelKey, prompt) {
  return await AIService.generate(modelKey, prompt);
}
