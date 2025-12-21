import { AIService } from "./AIService.js";

/**
 * Run AI generation with specified model
 * @param {string} modelKey - The model key (e.g., "gpt-4", "gemini-pro")
 * @param {string} prompt - The prompt to send
 * @returns {Promise<string>} The generated response
 */
export async function runAI(modelKey, prompt) {
  if (!prompt || typeof prompt !== "string") {
    throw new Error("Invalid AI prompt");
  }

  return await AIService.generate(modelKey, prompt);
}
