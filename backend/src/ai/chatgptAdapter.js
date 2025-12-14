import envConfig from "../../config/envConfig.js";
import OpenAI from "openai";

const apiKey = envConfig.openApiKey;

if (!apiKey) {
  console.warn("⚠️  OPENAI_API_KEY missing. ChatGPT adapter disabled.");
}

const openai = apiKey ? new OpenAI({ apiKey }) : null;

/**
 * Generic ChatGPT runner
 * - No task assumptions
 * - No GitLab / reviewer bias
 */
export async function chatgptRun(prompt) {
  if (!openai) {
    throw new Error("ChatGPT adapter not configured");
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are a helpful senior software engineer. Follow instructions strictly and return structured output when requested.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return response.choices[0].message.content;
}
