/**
 * AI Provider Configuration
 * 
 * This file defines all available AI providers and their models.
 * To add a new provider or model:
 * 1. Add the provider configuration here
 * 2. Create an adapter in src/ai/providers/
 * 3. The system will automatically pick it up
 */

export const AI_PROVIDERS = {
  openai: {
    name: "OpenAI",
    enabled: true,
    models: [
      {
        key: "gpt-4",
        label: "GPT-4 (gpt-4) - Most Capable",
        provider: "openai",
        config: {
          model: "gpt-4",
          temperature: 0.2,
          maxTokens: 4000,
        },
        recommended: false,
      },
      {
        key: "gpt-4-turbo",
        label: "GPT-4 Turbo (gpt-4-turbo-preview) - Faster & Cheaper",
        provider: "openai",
        config: {
          model: "gpt-4-turbo-preview",
          temperature: 0.2,
          maxTokens: 4000,
        },
        recommended: false,
      },
      {
        key: "gpt-3.5-turbo",
        label: "GPT-3.5 Turbo (gpt-3.5-turbo) - Fast & Economical",
        provider: "openai",
        config: {
          model: "gpt-3.5-turbo",
          temperature: 0.2,
          maxTokens: 4000,
        },
        recommended: false,
      },
    ],
  },
  google: {
    name: "Google",
    enabled: true,
    models: [
      {
        key: "gemini-pro",
        label: "Gemini Pro (gemini-2.5-flash) - Balanced",
        provider: "google",
        config: {
          model: "gemini-2.5-flash",
          temperature: 0.2,
        },
        recommended: true,
      },
      {
        key: "gemini-flash",
        label: "Gemini Flash (gemini-1.5-flash) - Ultra Fast",
        provider: "google",
        config: {
          model: "gemini-1.5-flash",
          temperature: 0.2,
        },
        recommended: false,
      },
    ],
  },
  // Easy to add new providers:
  // anthropic: {
  //   name: "Anthropic",
  //   enabled: false,
  //   models: [
  //     {
  //       key: "claude-3-opus",
  //       label: "Claude 3 Opus - Most Intelligent",
  //       provider: "anthropic",
  //       config: {
  //         model: "claude-3-opus-20240229",
  //         temperature: 0.2,
  //         maxTokens: 4000,
  //       },
  //       recommended: true,
  //     },
  //   ],
  // },
};

/**
 * Get all available models across all enabled providers
 * @returns {Array} Array of model configurations
 */
export function getAvailableModels() {
  const models = [];
  
  for (const [providerId, provider] of Object.entries(AI_PROVIDERS)) {
    if (provider.enabled) {
      for (const model of provider.models) {
        models.push({
          key: model.key,
          label: model.label,
          provider: model.provider,
          recommended: model.recommended || false,
          config: model.config,
        });
      }
    }
  }
  
  return models;
}

/**
 * Get model configuration by key
 * @param {string} modelKey - The model key (e.g., "gpt-4", "gemini-pro")
 * @returns {Object|null} Model configuration or null if not found
 */
export function getModelConfig(modelKey) {
  const models = getAvailableModels();
  return models.find(m => m.key === modelKey) || null;
}

/**
 * Validate if a model key is valid
 * @param {string} modelKey - The model key to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidModel(modelKey) {
  return getModelConfig(modelKey) !== null;
}

/**
 * Get all valid model keys
 * @returns {Array<string>} Array of valid model keys
 */
export function getValidModelKeys() {
  return getAvailableModels().map(m => m.key);
}

// Backward compatibility: Export models in the old format for API
export const AI_MODELS = getAvailableModels().map(m => ({
  key: m.key,
  label: m.recommended ? `${m.label} - Recommended` : m.label,
}));
