import { chatgptRun } from "./chatgptAdapter.js";
import { geminiRun } from "./geminiAdapter.js";

export async function runAI(model, prompt) {
  if (!prompt || typeof prompt !== "string") {
    throw new Error("Invalid AI prompt");
  }

  switch (model) {
    case "chatgpt":
      return await chatgptRun(prompt);

    case "gemini":
      return await geminiRun(prompt);

    default:
      throw new Error(`Unsupported AI model: ${model}`);
  }
}
