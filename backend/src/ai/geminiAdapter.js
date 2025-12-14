import envConfig from "../../config/envConfig.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = envConfig.geminiApiKey;

if (!apiKey) {
  console.warn("⚠️  GEMINI_API_KEY missing. Gemini adapter disabled.");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function geminiRun(prompt) {
  if (!genAI) {
    throw new Error("Gemini adapter not configured");
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
}
