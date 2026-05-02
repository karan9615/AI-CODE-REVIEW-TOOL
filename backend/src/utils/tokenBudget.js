/**
 * Token Budget Governor
 *
 * Provides utilities to estimate token usage and enforce hard ceilings
 * per context section before sending data to the AI.
 *
 * Rule of thumb used: 1 token ≈ 4 characters (English/code text).
 * This is a conservative estimate — actual savings may be higher.
 */

/**
 * Estimate the token count for a given string.
 * @param {string} text
 * @returns {number}
 */
export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(String(text).length / 4);
}

/**
 * Enforce a max token budget on a string, trimming from the end.
 * Appends a notice so the AI knows content was intentionally cut.
 *
 * @param {string} text - Input text
 * @param {number} maxTokens - Maximum allowed tokens
 * @param {string} [label] - Label for the truncation notice
 * @returns {string}
 */
export function applyBudget(text, maxTokens, label = "content") {
  if (!text) return text;
  const str = String(text);
  const maxChars = maxTokens * 4;
  if (str.length <= maxChars) return str;
  return str.substring(0, maxChars) + `\n\n[...${label} truncated to fit token budget]`;
}

/**
 * Smart truncation: keeps the first 75% and last 25% of the allowed budget.
 * Useful for source files where both the header (imports, class defs)
 * AND the footer (exports) contain critical context.
 *
 * @param {string} text - Input text
 * @param {number} maxTokens - Maximum allowed tokens
 * @param {string} [label] - Label for the truncation notice
 * @returns {string}
 */
export function applySmartBudget(text, maxTokens, label = "content") {
  if (!text) return text;
  const str = String(text);
  const maxChars = maxTokens * 4;
  if (str.length <= maxChars) return str;

  const headChars = Math.floor(maxChars * 0.75);
  const tailChars = maxChars - headChars;

  return (
    str.substring(0, headChars) +
    `\n\n[...${label} middle section omitted for token efficiency...]\n\n` +
    str.substring(str.length - tailChars)
  );
}

/**
 * Per-section token budgets.
 * These are conservative limits that preserve review quality while
 * preventing any single context section from dominating the prompt.
 */
export const BUDGETS = {
  PER_CONFIG_FILE: 600,      // Single config file (e.g. package.json shape)
  PER_DOC_FILE: 1000,        // Single markdown doc
  PER_CONNECTED_FILE: 500,   // Single imported dependency file (header + exports)
  JIRA_CONTEXT: 800,         // Jira ticket content
  EXISTING_COMMENTS: 400,    // Prior inline review comments (dedup list)
};
