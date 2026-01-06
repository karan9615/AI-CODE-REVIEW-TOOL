import dotenv from "dotenv";
dotenv.config();

const config = {
  openApiKey: process.env.OPENAI_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  sessionSecret: process.env.SESSION_SECRET || "secure-session-key-change-me",
};

// Validate and log CLIENT_URL configuration
console.log("=== Environment Configuration ===");
console.log(`NODE_ENV: ${config.nodeEnv}`);
console.log(`PORT: ${config.port}`);
console.log(`CLIENT_URL: ${config.clientUrl}`);

if (!process.env.CLIENT_URL && config.nodeEnv === "production") {
  console.warn(
    "⚠️  WARNING: CLIENT_URL not set in production environment. Using default:",
    config.clientUrl
  );
}

if (config.clientUrl.includes("localhost") && config.nodeEnv === "production") {
  console.warn(
    "⚠️  WARNING: CLIENT_URL contains 'localhost' in production environment. This may cause CORS issues."
  );
}

if (config.sessionSecret === "secure-session-key-change-me" && config.nodeEnv === "production") {
  console.error(
    "❌ ERROR: Default SESSION_SECRET is being used in production. Please set a secure SESSION_SECRET environment variable."
  );
}

console.log("=================================");

export default config;
