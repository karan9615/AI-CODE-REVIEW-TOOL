import { createClient } from "@supabase/supabase-js";
import envConfig from "../../config/envConfig.js";
import logger from "../utils/logger.js";

const { supabaseUrl, supabaseKey } = envConfig;

let supabase = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    logger.info("✅ Supabase client initialized successfully.");
  } catch (err) {
    logger.error("❌ Failed to initialize Supabase client:", err.message);
  }
} else {
  logger.warn(
    "⚠️ Supabase credentials not found in environment. Jira context features will be disabled.",
  );
}

export default supabase;
