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
      // {
      //   key: "gpt-4",
      //   label: "GPT-4 (gpt-4) - Most Capable",
      //   provider: "openai",
      //   config: {
      //     model: "gpt-4",
      //     temperature: 0.2,
      //     maxTokens: 4000,
      //   },
      //   recommended: false,
      // },
      // {
      //   key: "gpt-4-turbo",
      //   label: "GPT-4 Turbo (gpt-4-turbo-preview) - Faster & Cheaper",
      //   provider: "openai",
      //   config: {
      //     model: "gpt-4-turbo-preview",
      //     temperature: 0.2,
      //     maxTokens: 4000,
      //   },
      //   recommended: false,
      // },
      // {
      //   key: "gpt-3.5-turbo",
      //   label: "GPT-3.5 Turbo (gpt-3.5-turbo) - Fast & Economical",
      //   provider: "openai",
      //   config: {
      //     model: "gpt-3.5-turbo",
      //     temperature: 0.2,
      //     maxTokens: 4000,
      //   },
      //   recommended: false,
      // },
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
        recommended: false,
      },
      {
        key: "gemini-2.5-pro",
        label: "Gemini 2.5 Pro (gemini-2.5-pro) - Adv Free Tier",
        provider: "google",
        config: {
          model: "gemini-2.5-pro",
          temperature: 0.2,
        },
        recommended: false,
      },
      {
        key: "gemini-2.5-flash",
        label: "Gemini 2.5 Flash (gemini-2.5-flash) - Free Tier Fast",
        provider: "google",
        config: {
          model: "gemini-2.5-flash",
          temperature: 0.2,
        },
        recommended: false,
      },
      {
        key: "gemini-2.5-flash-lite",
        label:
          "Gemini 2.5 Flash Lite (gemini-2.5-flash-lite) - Free Tier Lightweight",
        provider: "google",
        config: {
          model: "gemini-2.5-flash-lite",
          temperature: 0.2,
        },
        recommended: false,
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
      {
        key: "gemini-1.5-pro",
        label: "Gemini 1.5 Pro (gemini-1.5-pro) - Powerful",
        provider: "google",
        config: {
          model: "gemini-1.5-pro",
          temperature: 0.2,
        },
        recommended: false,
      },
      {
        key: "gemini-1.5-flash-8b",
        label: "Gemini 1.5 Flash-8B (gemini-1.5-flash-8b) - Lightweight",
        provider: "google",
        config: {
          model: "gemini-1.5-flash-8b",
          temperature: 0.2,
        },
        recommended: false,
      },
      {
        key: "gemini-2.0-flash",
        label: "Gemini 2.0 Flash (gemini-2.0-flash) - Next Gen Fast",
        provider: "google",
        config: {
          model: "gemini-2.0-flash",
          temperature: 0.2,
        },
        recommended: false,
      },
      {
        key: "gemini-2.0-flash-lite",
        label:
          "Gemini 2.0 Flash Lite (gemini-2.0-flash-lite) - Next Gen Efficient",
        provider: "google",
        config: {
          model: "gemini-2.0-flash-lite-preview-02-05",
          temperature: 0.2,
        },
        recommended: false,
      },
      {
        key: "gemini-2.0-pro-exp",
        label: "Gemini 2.0 Pro Exp (gemini-2.0-pro-exp) - Next Gen Powerful",
        provider: "google",
        config: {
          model: "gemini-2.0-pro-exp-02-05",
          temperature: 0.2,
        },
        recommended: false,
      },
      {
        key: "gemini-3.1-flash-lite-preview",
        label: "Gemini 3.1 Flash Lite (gemini-3.1-flash-lite-preview) - Recommended Free Tier",
        provider: "google",
        config: {
          model: "gemini-3.1-flash-lite-preview",
          temperature: 0.2,
        },
        recommended: true,
      },
    ],
  },
  mistral: {
    name: "Mistral",
    enabled: true,
    models: [
      {
        key: "mistral-large",
        label: "Mistral Large (mistral-large-latest) - High Precision",
        provider: "mistral",
        config: {
          model: "mistral-large-latest",
          temperature: 0.2,
        },
        recommended: false,
      },
      {
        key: "mistral-small",
        label: "Mistral Small (mistral-small-latest) - Fast",
        provider: "mistral",
        config: {
          model: "mistral-small-latest",
          temperature: 0.2,
        },
        recommended: false,
      },
      {
        key: "pixtral-large",
        label: "Pixtral Large (pixtral-large-latest) - SOTA",
        provider: "mistral",
        config: {
          model: "pixtral-large-latest",
          temperature: 0.2,
        },
        recommended: false,
      },
    ],
  },
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
  return models.find((m) => m.key === modelKey) || null;
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
  return getAvailableModels().map((m) => m.key);
}

// Backward compatibility: Export models in the old format for API
export const AI_MODELS = getAvailableModels().map((m) => ({
  key: m.key,
  label: m.recommended ? `${m.label} - Recommended` : m.label,
}));
