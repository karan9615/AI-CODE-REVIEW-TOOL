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
You are a Senior GitLab Code Reviewer performing a line-by-line review.

### CRITICAL RULES FOR INLINE COMMENTS

1. **You can ONLY comment on changed lines** - lines marked as "added" or "deleted"
2. **You CANNOT comment on unchanged lines** - these don't appear in the changes array
3. **Use EXACT line numbers** from the change objects below
4. **For added lines**: use the "newLine" value in your "line" field
5. **For deleted lines**: use the "oldLine" value in your "oldLine" field

### Enriched Diff Data (with exact line numbers)
${JSON.stringify(enrichedDiffs, null, 2)}

### What to Review
Comment ONLY on:
- Bugs or logic errors
- Security vulnerabilities
- Performance issues
- Code smells or maintainability concerns
- Missing error handling

Do NOT comment on:
- Formatting or style (unless critical)
- Obvious changes
- Things the code already makes clear

### Output Format (STRICT JSON)

Return a JSON array where each comment references an EXACT line from the changes above:

[
  {
    "filePath": "path/to/file.js",
    "line": 14,
    "comment": "Use const or let instead of var for better scoping"
  }
]

**CRITICAL INSTRUCTIONS:**
- For "added" changes: use "line" field with the "newLine" value
- For "deleted" changes: use "oldLine" field with the "oldLine" value
- ONLY use line numbers that appear in the enriched diff data above
- If a line is not in the changes array, you CANNOT comment on it
- Include "oldPath" field if file is renamed/deleted

### Example from the data above:

If you see:
{
  "type": "added",
  "newLine": 14,
  "content": "  var name = document.getElementById..."
}

Your comment should be:
{
  "filePath": "script.js",
  "line": 14,
  "comment": "Use const or let instead of var"
}

Return ONLY a JSON array. No markdown. No explanations.
`;

  try {
    const response = await runAI(model, prompt);
    const comments = extractJson(response);

    if (!Array.isArray(comments)) {
      console.warn("AI did not return an array");
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
    console.error("❌ Failed to generate inline reviews:", error.message);
    return [];
  }
}

/**
 * Extract JSON safely from AI response
 */
function extractJson(response) {
  try {
    return JSON.parse(response);
  } catch {
    const arrMatch = response.match(/\[[\s\S]*\]/);
    if (arrMatch) return JSON.parse(arrMatch[0]);
    const objMatch = response.match(/\{[\s\S]*\}/);
    if (objMatch) return JSON.parse(objMatch[0]);
    throw new Error("No JSON found in AI response");
  }
}
