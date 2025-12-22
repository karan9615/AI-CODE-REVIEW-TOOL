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

### Output Format
The output will be strictly validated against a JSON schema.
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
You are a **Senior Software Engineer** performing an **in-depth Code Review**.

### YOUR MISSION
Perform a **thorough, critical analysis** of the code changes below. Look beyond surface-level issues.

### CONTEXT PROVIDED
For each file, you have:
- **Changed lines** (added/deleted) with exact line numbers
- **Context lines** (unchanged code surrounding the changes) to understand the broader logic
- **File metadata** (new/deleted/renamed status)

### WHAT TO ANALYZE (in order of priority)

#### 🔴 CRITICAL (Must comment if found)
- **Security vulnerabilities**: SQL injection, XSS, hardcoded secrets, insecure authentication
- **Data integrity risks**: Potential data loss, race conditions, incorrect state management
- **Breaking changes**: API changes, removed functionality, incompatible updates
- **Memory leaks**: Unclosed resources, event listener leaks, circular references
- **Performance killers**: N+1 queries, unnecessary loops, blocking operations

#### 🟡 HIGH PRIORITY
- **Logic errors**: Incorrect conditions, off-by-one errors, missing edge cases
- **Error handling gaps**: Unhandled promises, missing try-catch, silent failures
- **Type safety issues**: Missing null checks, incorrect type assumptions
- **Concurrency bugs**: Race conditions, missing async/await, promise chain errors

#### 🟢 IMPORTANT
- **Code smells**: Duplicated logic, overly complex functions, poor naming
- **Maintainability**: Unclear logic, missing documentation for complex code
- **Best practices**: Violation of SOLID principles, improper separation of concerns

### ENRICHED DIFF DATA
${JSON.stringify(enrichedDiffs, null, 2)}

### REVIEW RULES
${JSON.stringify(rules, null, 2)}

### OUTPUT FORMAT
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
