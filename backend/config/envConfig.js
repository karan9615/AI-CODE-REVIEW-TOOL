import dotenv from "dotenv";
dotenv.config();

export default {
  openApiKey: process.env.OPENAI_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
};
