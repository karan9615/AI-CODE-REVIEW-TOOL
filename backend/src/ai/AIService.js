import { openaiProvider } from "./providers/OpenAIProvider.js";
import { googleProvider } from "./providers/GoogleProvider.js";
import { huggingFaceProvider } from "./providers/HuggingFaceProvider.js";
import { mistralProvider } from "./providers/MistralProvider.js";
import { getModelConfig } from "../config/aiConfig.js";

/**
 * Provider Registry
 * Maps provider names to their instances
 */
const PROVIDER_REGISTRY = {
  openai: openaiProvider,
  google: googleProvider,
  huggingface: huggingFaceProvider,
  mistral: mistralProvider,
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
        `Invalid model key: "${modelKey}". Please check available models in configuration.`,
      );
    }

    // Get the provider instance
    const provider = PROVIDER_REGISTRY[modelConfig.provider];

    if (!provider) {
      throw new Error(
        `Provider "${modelConfig.provider}" not found in registry. Please add it to PROVIDER_REGISTRY.`,
      );
    }

    // Check if provider is available (API key configured)
    // We allow proceeding if a custom apiKey is provided, even if the system-level key is missing
    if (!provider.isAvailable() && !customConfig.apiKey) {
      throw new Error(
        `Provider "${provider.name}" is not available. Please configure the required API key or provide a custom key.`,
      );
    }

    // Merge model config with custom config (custom config takes precedence)
    const finalConfig = {
      ...modelConfig.config,
      ...customConfig,
    };

    console.log(
      `🤖 Generating with ${provider.name} (${modelConfig.config.model})...`,
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
    if (typeof response !== 'string') return response;

    try {
      // 1. Try direct parse
      return JSON.parse(response);
    } catch (e) {
      // 2. Try to extract JSON block using regex (handles markdown and extra text)
      const jsonRegex = /({[\s\S]*})|(\[[\s\S]*\])/;
      const match = response.match(jsonRegex);
      
      if (match) {
        try {
          const jsonStr = match[0];
          return JSON.parse(jsonStr);
        } catch (innerError) {
          // Fall through to cleaning logic
        }
      }

      // 3. Last ditch cleaning logic
      const clean = response
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      
      try {
        return JSON.parse(clean);
      } catch (error) {
        logger.error("❌ Critical: Failed to parse AI JSON response:", response);
        throw new Error("AI response was not valid JSON and could not be recovered.");
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
   * @param {Object} userAiConfig - Optional user-provided AI configuration from session
   * @returns {Promise<Array>} Array of available model configurations
   */
  static async getAvailableModels(userAiConfig = null) {
    const { getAvailableModels: getStaticModels } = await import("../config/aiConfig.js");
    const staticModels = getStaticModels();
    
    // 1. Get models that are statically enabled in config
    let enabledModels = staticModels.filter((model) => {
      const provider = PROVIDER_REGISTRY[model.provider];
      const isSystemAvailable = provider && provider.isAvailable();
      const isUserAvailable = userAiConfig && userAiConfig.provider === model.provider && userAiConfig.apiKey;
      return isSystemAvailable || isUserAvailable;
    });

    // 2. Dynamically fetch models from the provider's API if a user key is provided
    if (userAiConfig && userAiConfig.apiKey && PROVIDER_REGISTRY[userAiConfig.provider]?.listModels) {
      try {
        const provider = PROVIDER_REGISTRY[userAiConfig.provider];
        const dynamicModels = await provider.listModels(userAiConfig.apiKey);
        
        const existingKeys = new Set(enabledModels.map(m => m.key));
        for (const dm of dynamicModels) {
          if (!existingKeys.has(dm.key)) {
            enabledModels.push(dm);
          }
        }
      } catch (err) {
        console.error(`Failed to fetch dynamic models for ${userAiConfig.provider}:`, err.message);
      }
    }

    // 3. If the user explicitly selected a provider at login, ONLY show models for that provider
    if (userAiConfig && userAiConfig.provider) {
      enabledModels = enabledModels.filter(m => m.provider === userAiConfig.provider);
    }

    return enabledModels;
  }

  /**
   * Generate embedding for text
   * @param {string} text - The text to embed
   * @param {string} providerKey - The provider key (e.g., "openai", "huggingface")
   * @param {Object} customConfig - Optional custom configuration
   * @returns {Promise<Array<number>>} The embedding vector
   */
  static async embed(text, providerKey = "huggingface", customConfig = {}) {
    const provider = PROVIDER_REGISTRY[providerKey];

    if (!provider) {
      throw new Error(`Provider "${providerKey}" not found in registry.`);
    }

    if (!provider.isAvailable() && !customConfig.apiKey) {
      throw new Error(`Provider "${provider.name}" is not available.`);
    }

    return await provider.embed(text, customConfig);
  }
}

// Legacy export removed — use aiRouter.js runAI which correctly passes config (responseSchema, apiKey)
