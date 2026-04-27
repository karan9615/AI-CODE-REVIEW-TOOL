import dotenv from "dotenv";
dotenv.config();

const sessionSecret = process.env.SESSION_SECRET;
const nodeEnv = process.env.NODE_ENV || "development";

if (!sessionSecret && nodeEnv === "production") {
  throw new Error(
    "FATAL: SESSION_SECRET environment variable must be set in production. App startup aborted.",
  );
}

export default {
  openApiKey: process.env.OPENAI_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY,
  port: process.env.PORT || 3001,
  nodeEnv,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  sessionSecret: sessionSecret || "secure-session-key-change-me-in-production",
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY,
};
