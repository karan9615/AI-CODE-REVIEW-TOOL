import { HfInference } from "@huggingface/inference";
import envConfig from "../../../config/envConfig.js";

const apiKey = envConfig.huggingfaceApiKey;

if (!apiKey) {
  console.warn("⚠️ HUGGINGFACE_API_KEY missing. HuggingFace provider disabled.");
}

const hf = apiKey ? new HfInference(apiKey) : null;

/**
 * HuggingFace Provider
 * Used for lightweight, high-performance embeddings
 */
export class HuggingFaceProvider {
  constructor() {
    this.client = hf;
    this.name = "HuggingFace";
  }

  isAvailable() {
    return this.client !== null;
  }

  /**
   * Generate embedding using HuggingFace models
   * @param {string} text - The text to embed
   * @param {Object} config - Configuration (model)
   * @returns {Promise<Array<number>>} The embedding vector
   */
  async embed(text, config = {}) {
    const { model = "sentence-transformers/all-MiniLM-L6-v2" } = config;

    if (!this.client) {
      throw new Error("HuggingFace provider not configured.");
    }

    try {
      const result = await this.client.featureExtraction({
        model,
        inputs: text,
      });

      return result;
    } catch (error) {
      console.error(`HuggingFace Embedding Error (${model}):`, error.message);
      throw new Error(`HuggingFace embedding failed: ${error.message}`);
    }
  }

  /**
   * Dummy generate method as HuggingFace is primarily used for embeddings here
   */
  async generate() {
    throw new Error("Generate method not implemented for HuggingFace provider.");
  }
}

export const huggingFaceProvider = new HuggingFaceProvider();
