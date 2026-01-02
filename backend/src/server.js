import envConfig from "../config/envConfig.js";
import app from "./app.js";

/**
 * Validate required environment variables
 * Fail fast if critical config is missing
 */
function validateEnvironment() {
  const errors = [];

  // Check for SESSION_SECRET (required for secure cookies)
  if (!envConfig.sessionSecret) {
    errors.push("SESSION_SECRET is required for session encryption");
  }

  // Check for at least one AI API key
  const hasApiKey = envConfig.openApiKey || envConfig.geminiApiKey;
  if (!hasApiKey) {
    errors.push(
      "At least one AI API key is required (OPENAI_API_KEY or GEMINI_API_KEY)"
    );
  }

  if (errors.length > 0) {
    console.error("\n❌ Environment Configuration Errors:\n");
    errors.forEach((error, index) => {
      console.error(`  ${index + 1}. ${error}`);
    });
    console.error("\nPlease check your backend/.env file\n");
    process.exit(1);
  }

  console.log("✅ Environment variables validated");
}

// Validate environment before starting
validateEnvironment();

// Start server
const PORT = envConfig.port || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📝 API available at http://localhost:${PORT}/api`);
  console.log(
    `🔒 Security: HTTP-only cookies, Rate limiting, Helmet headers\n`
  );
});
