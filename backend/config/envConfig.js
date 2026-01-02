import dotenv from "dotenv";
dotenv.config();

export default {
  openApiKey: process.env.OPENAI_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  sessionSecret: process.env.SESSION_SECRET || "secure-session-key-change-me",
};
