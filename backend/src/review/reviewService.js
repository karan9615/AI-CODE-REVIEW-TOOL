import fs from "fs";
import path from "path";
import { runAI } from "../ai/aiRouter.js";

const rules = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), "config", "review.rules.json"),
    "utf8"
  )
);

/**
 * Generate MR title + description
 */
export async function generateMRContent(model, diffs) {
  const prompt = `
You are a Senior Software Engineer performing a GitLab Merge Request review.

Your task is to generate a HIGH-QUALITY Merge Request title and description
based ONLY on the provided code diffs.

### Objectives
- Be precise and factual
- Do NOT invent context not visible in diffs
- Prefer clarity over verbosity
- Follow GitLab merge request best practices

### Title Rules
- Max 72 characters
- Start with a verb (Fix, Add, Improve, Refactor, Remove)
- Describe the primary change only
- No punctuation at the end

### Description Structure (Markdown)
1. **Summary**
   - 2–3 bullet points describing WHAT changed and WHY

2. **Key Changes**
   - Bullet list mapped to actual diffs
   - Avoid repeating code verbatim

3. **Risks / Considerations**
   - Mention only REAL risks visible in the diff
   - If none, explicitly say: "No significant risks identified"

4. **Testing Notes**
   - What should be manually verified
   - If not testable here, say so explicitly

### Review Rules (apply strictly)
${JSON.stringify(rules)}

### Code Diffs
${JSON.stringify(diffs)}

### Output Format (STRICT JSON, no markdown, no extra text)
{
  "title": "string",
  "description": "string"
}

Return ONLY valid JSON. No explanations. No markdown.
`;

  try {
    const response = await runAI(model, prompt);
    return extractJson(response);
  } catch {
    return {
      title: "MR content create changes",
      description: "AI review failed to parse.",
    };
  }
}

/**
 * Generate inline review comments
 */
export async function generateInlineReviews(model, diffs) {
  const prompt = `
You are a Senior GitLab Code Reviewer.

Perform a LINE-BY-LINE review of the provided diffs.

### Review Guidelines
- Comment ONLY on:
  - Bugs
  - Potential runtime errors
  - Security issues
  - Performance concerns
  - Readability or maintainability problems
- Do NOT comment on formatting unless it affects readability
- Do NOT repeat what the code already states
- Be concise and actionable
- Assume the author is a competent developer

### Important: File Change Types
The diffs may include:
- NEW FILES (new_file: true) - only use "line" field
- DELETED FILES (deleted_file: true) - only use "oldLine" field
- RENAMED FILES (renamed_file: true, old_path differs from new_path)
- MODIFIED FILES (standard changes)

### Comment Rules
Each comment MUST:
- Refer to a single line
- Explain the issue clearly
- Suggest an improvement when possible
- Include "oldPath" if file was renamed or deleted
- For NEW files: use "line" only
- For DELETED files: use "oldLine" only
- For MODIFIED files: use "line" for new changes, "oldLine" for deletions

### Output Format (STRICT JSON ARRAY)
[
  {
    "filePath": "relative/file/path.js",
    "oldPath": "old/path.js",  // Only if renamed/deleted
    "line": 42,  // For additions/modifications
    "oldLine": 38,  // For deletions only
    "comment": "Clear, actionable feedback"
  }
]

### Code Diffs
${JSON.stringify(diffs)}

Return ONLY valid JSON array. No explanations. No markdown.
`;

  try {
    const response = await runAI(model, prompt);
    const comments = extractJson(response);
    // Ensure it's an array
    return Array.isArray(comments) ? comments : [];
  } catch (error) {
    console.warn("Failed to parse AI inline reviews:", error.message);
    return [];
  }
}

/**
 * Extract JSON or JSON array safely from LLM output
 */
function extractJson(response) {
  // Try to parse the whole response first
  try {
    return JSON.parse(response);
  } catch {
    // Try to extract array or object from text
    const arrMatch = response.match(/\[[\s\S]*\]/);
    if (arrMatch) return JSON.parse(arrMatch[0]);
    const objMatch = response.match(/\{[\s\S]*\}/);
    if (objMatch) return JSON.parse(objMatch[0]);
    throw new Error("No JSON found");
  }
}
