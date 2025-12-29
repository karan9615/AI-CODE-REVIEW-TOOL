import fs from "fs";
import path from "path";
import { runAI } from "../ai/aiRouter.js";

import { mrContentSchema, inlineReviewSchema } from "./reviewSchemas.js";

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
  You are a Senior Software Engineer reviewing a GitLab Merge Request.

  Your job is to generate a PRODUCTION-READY, ACCURATE Merge Request title and description based ONLY on the provided code diffs. Do NOT invent or assume context that is not present in the diffs.

  ## Title (max 72 chars)
  - Start with a strong verb (Fix, Add, Improve, Refactor, Remove)
  - Summarize the main change only, no punctuation at the end

  ## Description (Markdown)
  1. **Summary**
    - 2–3 bullet points: WHAT changed and WHY (based only on diffs)
  2. **Key Changes**
    - Bullet list, each item must map to a real diff
    - Do NOT repeat code, do NOT add generic or info points
  3. **Risks / Considerations**
    - Only mention risks that are clearly visible in the diff
    - If no real risks, say: "No significant risks identified"
  4. **Testing Notes**
    - What should be manually verified (if testable)
    - If not testable, say so

  ## STRICT RULES
  - Do NOT add any invented, generic, or info comments
  - Do NOT add anything not directly supported by the diffs
  - Output must be concise, clear, and factual
  - The output will be strictly validated against a JSON schema

  ## Review Rules
  ${JSON.stringify(rules)}

  ## Code Diffs
  ${JSON.stringify(diffs)}
  `;

  try {
    // AIService now returns the parsed object directly
    return await runAI(model, prompt, {
      responseSchema: mrContentSchema,
    });
  } catch (error) {
    console.error("❌ MR Content Generation Failed:", error.message);
    return {
      title: "MR content create changes",
      description: "AI review failed to generate content.",
    };
  }
}

/**
 * Build enriched diff information with human-readable line data
 * @param {Array} diffs - GitLab diff objects
 * @returns {Array} - Enriched diff data for AI
 */
function buildEnrichedDiffs(diffs) {
  return diffs.map((diff) => {
    const enriched = {
      file: diff.new_path,
      oldFile: diff.old_path,
      isNew: diff.new_file || false,
      isDeleted: diff.deleted_file || false,
      isRenamed: diff.renamed_file || false,
      isBinary: diff.binary || false,
      changes: [],
      contextLines: [], // Store context for better understanding
    };

    if (!diff.diff || diff.binary) {
      return enriched;
    }

    const lines = diff.diff.split("\n");
    let oldLine = 0;
    let newLine = 0;

    for (const line of lines) {
      const hunkMatch = line.match(/^@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (hunkMatch) {
        oldLine = parseInt(hunkMatch[1]);
        newLine = parseInt(hunkMatch[2]);
        continue;
      }

      if (line.startsWith("-")) {
        enriched.changes.push({
          type: "deleted",
          oldLine: oldLine,
          content: line.substring(1),
        });
        oldLine++;
      } else if (line.startsWith("+")) {
        enriched.changes.push({
          type: "added",
          newLine: newLine,
          content: line.substring(1),
        });
        newLine++;
      } else if (line.startsWith(" ")) {
        // Include context lines (unchanged code around changes)
        enriched.contextLines.push({
          oldLine: oldLine,
          newLine: newLine,
          content: line.substring(1),
        });
        oldLine++;
        newLine++;
      }
    }

    return enriched;
  });
}

/**
 * Generate inline review comments
 */
export async function generateInlineReviews(model, diffs) {
  const enrichedDiffs = buildEnrichedDiffs(diffs);

  const prompt = `
You are a **Senior Software Engineer** doing a code review for a GitLab Merge Request.

## YOUR TASK
Review the code changes below and ONLY generate actionable, specific comments that require the developer to update or improve the code. Do NOT add info comments, explanations, or compliments. Only comment if a real, actionable change is needed.

## CONTEXT
- You have changed lines (added/deleted) with line numbers
- You have context lines and file metadata

## WHAT TO COMMENT ON (in order of priority)
1. **Critical**: Security, data loss, breaking changes, memory leaks, performance killers
2. **High**: Logic errors, error handling, type safety, concurrency bugs
3. **Important**: Code smells, maintainability, best practices

## STRICT RULES
- Do NOT add info comments, explanations, or praise
- Do NOT add comments unless the code should be updated or improved
- Each comment must be actionable and map to a real changed line
- Output must be a JSON array matching the schema

## ENRICHED DIFF DATA
${JSON.stringify(enrichedDiffs, null, 2)}

## REVIEW RULES
${JSON.stringify(rules, null, 2)}

## OUTPUT FORMAT
The output will be strictly validated against a JSON schema.
`;

  try {
    const comments = await runAI(model, prompt, {
      responseSchema: inlineReviewSchema,
    });

    if (!Array.isArray(comments)) {
      console.warn("AI returned valid JSON but not an array");
      return [];
    }

    // Validate each comment against the enriched diffs
    const validComments = [];

    for (const comment of comments) {
      const enrichedDiff = enrichedDiffs.find(
        (d) => d.file === comment.filePath
      );

      if (!enrichedDiff) {
        console.warn(`❌ File not found: ${comment.filePath}`);
        continue;
      }

      if (enrichedDiff.isBinary) {
        console.warn(`❌ Cannot comment on binary file: ${comment.filePath}`);
        continue;
      }

      let isValid = false;

      // Check if commenting on an added line
      if (comment.line) {
        const addedChange = enrichedDiff.changes.find(
          (c) => c.type === "added" && c.newLine === comment.line
        );
        if (addedChange) {
          isValid = true;
        } else {
          console.warn(
            `❌ ${comment.filePath}:${comment.line} - not an added line`
          );
          // Try to find the closest added line
          const addedLines = enrichedDiff.changes
            .filter((c) => c.type === "added")
            .map((c) => c.newLine);
          console.warn(`   Available added lines: [${addedLines.join(", ")}]`);
        }
      }

      // Check if commenting on a deleted line
      if (comment.oldLine) {
        const deletedChange = enrichedDiff.changes.find(
          (c) => c.type === "deleted" && c.oldLine === comment.oldLine
        );
        if (deletedChange) {
          isValid = true;
        } else {
          console.warn(
            `❌ ${comment.filePath}:${comment.oldLine} (oldLine) - not a deleted line`
          );
          const deletedLines = enrichedDiff.changes
            .filter((c) => c.type === "deleted")
            .map((c) => c.oldLine);
          console.warn(
            `   Available deleted lines: [${deletedLines.join(", ")}]`
          );
        }
      }

      if (isValid) {
        // Clean up and add file metadata
        if (enrichedDiff.isRenamed || enrichedDiff.isDeleted) {
          comment.oldPath = enrichedDiff.oldFile;
        }
        validComments.push(comment);
      }
    }

    console.log(
      `✅ Validated ${validComments.length}/${comments.length} inline comments`
    );
    return validComments;
  } catch (error) {
    console.error(
      "❌ Unexpected error in generateInlineReviews:",
      error.message
    );
    return [];
  }
}
