import fs from "fs";
import path from "path";
import { runAI } from "../ai/aiRouter.js";
import { mrContentSchema, inlineReviewSchema } from "./reviewSchemas.js";

// Cache rules to avoid repeated file reads
let cachedRules = null;

/**
 * Load review rules with caching
 */
function loadRules() {
  if (!cachedRules) {
    const rulesPath = path.join(process.cwd(), "config", "review.rules.json");
    cachedRules = JSON.parse(fs.readFileSync(rulesPath, "utf8"));
  }
  return cachedRules;
}

/**
 * Generate MR title + description
 */
export async function generateMRContent(model, diffs, apiKey = null) {
  const rules = loadRules();

  const prompt = `You are a Senior Software Engineer reviewing a GitLab Merge Request.

Your job is to generate a PRODUCTION-READY, ACCURATE Merge Request title and description based ONLY on the provided code diffs. Do NOT invent or assume context that is not present in the diffs.

## Title (max 72 chars)
- Start with a strong verb (Fix, Add, Improve, Refactor, Remove, Update)
- Summarize the main change only, no punctuation at the end

## Description (Markdown)
1. **Summary**
  - 2–3 bullet points: WHAT changed and WHY (based only on diffs)
2. **Key Changes**
  - Bullet list, each item must map to a real diff
  - Do NOT repeat code, do NOT add generic or informational points
3. **Risks / Considerations**
  - Only mention risks that are clearly visible in the diff
  - If no real risks, say: "No significant risks identified"
4. **Testing Notes**
  - What should be manually verified (if testable)
  - If not testable, say so

## STRICT RULES
- Do NOT add any invented, generic, or informational comments
- Do NOT add anything not directly supported by the diffs
- Output must be concise, clear, and factual
- The output will be strictly validated against a JSON schema

 ## Review Rules
${JSON.stringify(rules, null, 2)}

## Code Diffs
${JSON.stringify(diffs, null, 2)}
`;

  try {
    return await runAI(model, prompt, {
      responseSchema: mrContentSchema,
      apiKey,
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
 * Parse hunk header for line numbers
 */
function parseHunkHeader(line) {
  const match = line.match(/^@@ -(\d+),?\d* \+(\d+),?\d* @@/);
  return match
    ? {
        oldLine: parseInt(match[1], 10),
        newLine: parseInt(match[2], 10),
      }
    : null;
}

/**
 * Process a single diff line
 */
function processDiffLine(line, lineNumbers, enriched) {
  const firstChar = line[0];
  const content = line.substring(1);

  if (firstChar === "-") {
    enriched.changes.push({
      type: "deleted",
      oldLine: lineNumbers.oldLine,
      content,
    });
    lineNumbers.oldLine++;
  } else if (firstChar === "+") {
    enriched.changes.push({
      type: "added",
      newLine: lineNumbers.newLine,
      content,
    });
    lineNumbers.newLine++;
  } else if (firstChar === " ") {
    enriched.contextLines.push({
      oldLine: lineNumbers.oldLine,
      newLine: lineNumbers.newLine,
      content,
    });
    lineNumbers.oldLine++;
    lineNumbers.newLine++;
  }
}

/**
 * Build enriched diff information with human-readable line data
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
      contextLines: [],
    };

    // Skip binary files or files without diffs
    if (!diff.diff || diff.binary) {
      return enriched;
    }

    const lines = diff.diff.split("\n");
    const lineNumbers = { oldLine: 0, newLine: 0 };

    for (const line of lines) {
      const hunkHeader = parseHunkHeader(line);
      if (hunkHeader) {
        lineNumbers.oldLine = hunkHeader.oldLine;
        lineNumbers.newLine = hunkHeader.newLine;
        continue;
      }

      processDiffLine(line, lineNumbers, enriched);
    }

    return enriched;
  });
}

/**
 * Create line lookup maps for fast validation
 */
function createLineLookups(enrichedDiff) {
  const addedLines = new Set();
  const deletedLines = new Set();
  const contextNewLines = new Set();
  const contextOldLines = new Set();

  if (enrichedDiff.changes) {
    for (const change of enrichedDiff.changes) {
      if (change.type === "added") {
        addedLines.add(change.newLine);
      } else if (change.type === "deleted") {
        deletedLines.add(change.oldLine);
      }
    }
  }

  if (enrichedDiff.contextLines) {
    for (const ctx of enrichedDiff.contextLines) {
      contextNewLines.add(ctx.newLine);
      contextOldLines.add(ctx.oldLine);
    }
  }

  return { addedLines, deletedLines, contextNewLines, contextOldLines };
}

/**
 * Validate that a comment has at least the Issue section
 * Risk and Fix are encouraged but optional (since we only see diffs, not full context)
 */
function validateCommentStructure(comment) {
  const text = comment.comment || "";

  const hasIssue = text.includes("**Issue:**");
  const hasRisk = text.includes("**Risk:**");
  const hasFix = text.includes("**Fix:**");

  if (!hasIssue) {
    console.warn(
      `❌ Comment missing required Issue section on ${comment.filePath}:${
        comment.line || comment.oldLine
      }`,
    );
    console.warn(`   Comment preview: ${text.substring(0, 100)}...`);
    return false;
  }

  // Log warnings for missing optional sections
  if (!hasRisk || !hasFix) {
    console.warn(
      `⚠️  Comment has Issue but missing optional sections on ${
        comment.filePath
      }:${comment.line || comment.oldLine}`,
    );
    console.warn(
      `   Missing: ${!hasRisk ? "Risk " : ""}${!hasFix ? "Fix" : ""}`,
    );
  }

  return true;
}

/**
 * Validate a single comment against enriched diff data
 */
/**
 * Validate a single comment against enriched diff data
 */
function validateComment(comment, enrichedDiffs) {
  const enrichedDiff = enrichedDiffs.find((d) => d.file === comment.filePath);

  if (!enrichedDiff) {
    console.warn(`❌ File not found: ${comment.filePath}`);
    return null;
  }

  if (enrichedDiff.isBinary) {
    console.warn(`❌ Cannot comment on binary file: ${comment.filePath}`);
    return null;
  }

  const { addedLines, deletedLines, contextNewLines, contextOldLines } =
    createLineLookups(enrichedDiff);

  let isValid = false;

  // Ensure line numbers are integers
  if (comment.line !== undefined && comment.line !== null)
    comment.line = parseInt(comment.line, 10);
  if (comment.oldLine !== undefined && comment.oldLine !== null)
    comment.oldLine = parseInt(comment.oldLine, 10);

  // Helper: Find closest valid line
  const findClosestLine = (target, validSet) => {
    let closest = null;
    let minDiff = Infinity;
    for (const validLine of validSet) {
      const diff = Math.abs(validLine - target);
      if (diff < minDiff) {
        minDiff = diff;
        closest = validLine;
      }
    }
    // Snap if within reasonable distance (e.g., 50 lines - broad catch)
    return minDiff <= 50 ? closest : null;
  };

  // 0. HANDLE MISSING LINE NUMBERS (Force Snap to First Change)
  if (!comment.line && !comment.oldLine) {
    console.warn(
      `⚠️ No line number provided for ${comment.filePath}. Attempting to snap to first available change.`,
    );

    // Prefer Added Line -> New Context Line -> Old Deleted Line
    const firstAdded = addedLines.values().next().value;
    const firstContext = contextNewLines.values().next().value;

    if (firstAdded) {
      comment.line = firstAdded;
      comment.comment = `**(General File Feedback)** ${comment.comment}`;
      console.log(`📍 Output snapped to first added line: ${firstAdded}`);
    } else if (firstContext) {
      comment.line = firstContext;
      comment.comment = `**(General File Feedback)** ${comment.comment}`;
      console.log(`📍 Output snapped to first context line: ${firstContext}`);
    } else {
      // Try old lines
      const firstDeleted = deletedLines.values().next().value;
      const firstOldContext = contextOldLines.values().next().value;

      if (firstDeleted) {
        comment.oldLine = firstDeleted;
        comment.comment = `**(General File Feedback)** ${comment.comment}`;
        console.log(`📍 Output snapped to first deleted line: ${firstDeleted}`);
      } else if (firstOldContext) {
        comment.oldLine = firstOldContext;
        comment.comment = `**(General File Feedback)** ${comment.comment}`;
        console.log(
          `📍 Output snapped to first (old) context line: ${firstOldContext}`,
        );
      } else {
        console.error(
          `❌ No valid lines found in ${comment.filePath} to attach comment.`,
        );
        return comment; // Fallback to general
      }
    }
  }

  // 1. Validating "New" Line References (Added lines or Context lines via new_line)
  if (comment.line) {
    // Combine added and context lines into one valid set for "new_line"
    const validNewLines = new Set([...addedLines, ...contextNewLines]);

    if (validNewLines.has(comment.line)) {
      isValid = true;
    } else {
      // Not found? Snap to nearest
      const snapped = findClosestLine(comment.line, validNewLines);
      if (snapped) {
        console.log(
          `📍 Snapping comment on ${comment.filePath}: Line ${comment.line} -> ${snapped}`,
        );
        comment.comment = `**(Ref: Line ${comment.line})** ${comment.comment}`;
        comment.line = snapped;
        isValid = true;
      } else {
        console.warn(
          `❌ ${comment.filePath}: Line ${comment.line} is too far from any valid diff line.`,
        );
      }
    }
  }

  // 2. Validating "Old" Line References (Deleted lines or Context lines via old_line)
  if (comment.oldLine && !isValid) {
    // Combine deleted and context lines (using old index) into one valid set
    const validOldLines = new Set([...deletedLines, ...contextOldLines]);

    if (validOldLines.has(comment.oldLine)) {
      isValid = true;
    } else {
      // Not found? Snap to nearest
      const snapped = findClosestLine(comment.oldLine, validOldLines);
      if (snapped) {
        console.log(
          `📍 Snapping comment on ${comment.filePath}: OldLine ${comment.oldLine} -> ${snapped}`,
        );
        comment.comment = `**(Ref: OldLine ${comment.oldLine})** ${comment.comment}`;
        comment.oldLine = snapped;
        isValid = true;
      } else {
        console.warn(
          `❌ ${comment.filePath}: OldLine ${comment.oldLine} is too far from any valid diff line.`,
        );
      }
    }
  }

  if (!isValid) {
    console.warn(
      `⚠️ Line validation failed for ${comment.filePath}:${comment.line || comment.oldLine}. Preserving as fallback comment.`,
    );
    return comment;
  }

  // Add file metadata for renamed/deleted files
  if (enrichedDiff.isRenamed || enrichedDiff.isDeleted) {
    comment.oldPath = enrichedDiff.oldFile;
  }

  return comment;
}

/**
 * Generate inline review comments
 */
export async function generateInlineReviews(
  model,
  diffs,
  existingComments = [],
  apiKey = null,
) {
  const enrichedDiffs = buildEnrichedDiffs(diffs);
  const rules = loadRules();

  // 1. Generate Global Context
  const globalFileContext = enrichedDiffs
    .map(
      (d) =>
        `- ${d.file} (${d.isNew ? "New" : d.isDeleted ? "Deleted" : "Modified"})`,
    )
    .join("\n");

  const prompt = `
You are a **Senior Software Engineer** doing a critical code review for a GitLab Merge Request for production deployment.

# MISSION
Review the code changes below and ONLY generate actionable, specific comments that require the developer to update or improve the code. Do NOT add info comments, explanations, or compliments. Only comment if a real, actionable change is needed.

# GLOBAL CONTEXT (Full MR Overview)
The following files are part of this Merge Request. Use this context to understand relationships between files, even if they are in different chunks:
${globalFileContext}

# REVIEW PRIORITIES (in order)

## 🔴 SEVERITY: "critical"
**Security Vulnerabilities**
- SQL Injection: Unsanitized user input in queries → Use parameterized queries or ORM
- XSS: Unescaped user content in HTML → Use proper escaping/sanitization libraries
- Authentication/Authorization: Missing auth checks, weak tokens, exposed endpoints → Add middleware guards
- Secrets Exposure: Hardcoded passwords, API keys, tokens → Move to environment variables
- CSRF: State-changing operations without tokens → Implement CSRF protection
- Insecure Deserialization: Unsafe JSON.parse, eval(), or pickle → Use safe parsers with validation

**Data Loss Risks**
- Race Conditions: Concurrent writes without locking → Add transaction isolation or locks
- Missing Transactions: Multi-step DB operations not atomic → Wrap in BEGIN/COMMIT transaction
- Cascading Deletes: Unprotected foreign key deletions → Add soft deletes or confirmation checks
- Null Pointer Dereference: Accessing properties on potentially null objects → Add null checks before access

**Production Killers**
- Unhandled Exceptions: Async operations without try-catch → Wrap in try-catch with proper error logging
- Resource Leaks: Unclosed DB connections, file handles, event listeners → Add finally blocks or cleanup hooks
- Infinite Loops: Loops without exit conditions or limits → Add max iteration guard or timeout
- Memory Leaks: Accumulating event listeners, cache without expiration → Implement cleanup and TTL

## 🟠 SEVERITY: "high"
**Logic Errors**
- Off-by-One: Array bounds or loop conditions incorrect → Fix index calculation (e.g., < length not <= length)
- Type Coercion Bugs: == instead of ===, implicit conversions → Use strict equality (===)
- Edge Cases: Missing null/undefined/empty array checks → Add guard clauses at function start
- Integer Overflow: Mathematical operations on large numbers → Use BigInt or validation

**Error Handling Gaps**
- Silent Failures: Caught exceptions not logged → Add logger.error() with context
- Generic Error Messages: "Error occurred" without details → Include error type, user action, trace ID
- Missing Fallbacks: External API calls without retry or default → Add exponential backoff retry logic
- Swallowed Promises: .catch() without action → Log error and return user-friendly response

**Performance Issues**
- N+1 Queries: Database calls inside loops → Use batch queries with WHERE IN or JOIN
- Missing Indexes: Queries on unindexed columns → Add database index on frequently queried fields
- Synchronous I/O: Blocking file/network operations → Convert to async with await
- Memory Inefficiency: Creating large objects in loops → Move allocation outside loop or use streaming

## 🟡 SEVERITY: "medium"
**Code Quality**
- Code Duplication: Same logic in 3+ places → Extract to shared utility function
- Long Functions: >50 lines doing multiple things → Split into smaller, single-purpose functions
- Magic Numbers: Hardcoded values without explanation → Define as named constants with comments
- Deep Nesting: >3 levels of if/for/while → Use early returns or extract to functions

**Maintainability**
- Missing Error Context: throw new Error('Failed') → Include operation, input, and state in error message
- Tight Coupling: Direct dependencies on concrete classes → Use dependency injection or interfaces
- Unclear Naming: Variable names like 'data', 'temp', 'x' → Use descriptive names (userData, tempCache, userId)
- No Validation: User input used directly → Add input validation with specific error messages

# COMMENT STRUCTURE (BEST PRACTICES)

## Required Section:
**Issue:** [One sentence: what is wrong] - MANDATORY

## Recommended Sections (include when possible):
**Risk:** [One sentence: what breaks/fails/leaks if not fixed] - OPTIONAL

**Fix:** [Concrete code example showing the solution] - OPTIONAL

**Similar issues found in:** [List of other file paths where this EXACT same issue occurs. Do NOT create separate comments for those files.] - OPTIONAL

Note: Since you only have access to git diffs (not full codebase), you may not always have enough context to provide a complete Fix. In such cases, provide Issue and Risk at minimum.

## Example (IDEAL - all 3 sections):
{
  "filePath": "src/auth/login.js",
  "line": 42,
  "severity": "critical",
  "comment": "**Issue:** SQL injection vulnerability - user input concatenated directly into query string.\\n\\n**Risk:** Attacker can execute arbitrary SQL commands, dump database, or delete all data.\\n\\n**Fix:** Use parameterized queries:\\n\`\`\`javascript\\nconst result = await db.query(\\n  'SELECT * FROM users WHERE email = $1',\\n  [userEmail]\\n);\\n\`\`\`"
}

## Example (ACCEPTABLE - Issue + Risk only):
{
  "filePath": "src/utils/helper.js",
  "line": 15,
  "severity": "high",
  "comment": "**Issue:** The \`count\` parameter is not validated before use.\\n\\n**Risk:** Passing negative or non-numeric values will cause runtime errors or unexpected behavior."
}

## Invalid Example:
❌ Missing Issue section entirely
❌ Generic comments without specifics

# RULES (STRICT ENFORCEMENT)

✅ DO:
- ALWAYS include Issue section (mandatory)
- Include Risk section when the impact is clear
- Include Fix section with copy-pasteable code when you have enough context
- Use double newlines (\\n\\n) between sections when including multiple
- Comment ONLY on changed lines (added or deleted)
- Reference actual line numbers from the diff
- Focus on correctness, security, and performance
- Include imports/dependencies in fix examples if needed
- If you can't provide a complete Fix due to limited diff context, at least explain what needs to be done
- **DEDUPLICATE CROSS-FILE ISSUES:** If the exact same issue (e.g., missing error handling, same typo) occurs in multiple files, make ONE comment on the first occurrence. Add a "**Similar issues found in:**" section listing the other file paths it applies to. Do not post separate comments for the duplicates.

❌ DON'T:
- Submit comments without Issue section
- Make style suggestions (indentation, naming conventions handled by linters)
- Add informational comments ("This looks good", "Consider adding...")
- Suggest improvements without clear problems
- Comment on unchanged context lines
- Give vague advice ("improve error handling" without details)
- Create duplicate comments for the exact same issue across different files. Use the 'Similar issues found in' pattern instead.

# LANGUAGE-SPECIFIC CHECKS

**JavaScript/TypeScript:**
- Await missing on Promises → Add await or .then()
- Promise.all for parallel operations → Replace sequential awaits
- Optional chaining for nested objects → Use obj?.prop?.subprop
- Type assertions in TS → Validate types at runtime too

**Python:**
- SQL without parameterization → Use cursor.execute with %s placeholders
- Open files without context manager → Use 'with open() as f:'
- Mutable default arguments → Use None and initialize in function body
- except: without specific error → Catch specific exceptions (ValueError, etc.)

**Java:**
- Resources not in try-with-resources → Use try (Resource r = ...) {}
- String concatenation in loops → Use StringBuilder
- == for String comparison → Use .equals()
- Unchecked exceptions not documented → Add @throws JavaDoc

**Go:**
- Ignored errors (err := func(); do stuff) → Check if err != nil
- Defer in loops → Move to separate function to avoid resource buildup
- Goroutines without WaitGroup → Add sync.WaitGroup to track completion
- Race conditions on shared variables → Use channels or sync.Mutex

# CONTEXT

You have access to:
- **changes**: Array of added/deleted lines with line numbers and content
- **contextLines**: Surrounding unchanged code for context
- **file metadata**: Whether file is new, deleted, renamed, or binary
- **existingComments**: List of comments already posted on this MR

Constraints:
- Can only comment on lines in the "changes" array
- For added lines: use "line" property (new file line number)
- For deleted lines: use "oldLine" property (old file line number)
- Cannot comment on binary files
- Comments must match the JSON schema exactly
- **DO NOT REPEAT** feedback found in "EXISTING COMMENTS" list (unless the issue is critical and strictly worse now).
  - If a similar comment exists on the same line, SKIP it.
  - If the same issue is pointed out by a human or AI previously, SKIP it.

# REVIEW RULES
${JSON.stringify(rules, null, 2)}

# EXISTING COMMENTS (Check these to avoid duplicates)
${JSON.stringify(existingComments || [], null, 2)}

# OUTPUT FORMAT (STRICT REQUIREMENTS)

Return a JSON array where EVERY comment object MUST have:
- filePath: string (exact path from diff)
- line: integer (for added lines) OR oldLine: integer (for deleted lines)
- severity: "critical" | "high" | "medium"
- comment: string with REQUIRED Issue section and OPTIONAL Risk/Fix/Similar Issues sections:
  * **Issue:** [problem description] - MANDATORY
  * **Risk:** [impact if not fixed] - OPTIONAL (include when clear)
  * **Fix:** [code solution with example] - OPTIONAL (include when you have enough context)
  * **Similar issues found in:** [comma-separated list of paths] - OPTIONAL (ONLY USE if the identical issue is found in other files)

Separate sections with \\n\\n (double newlines).

Example of IDEAL comment (all sections):
"**Issue:** Using alert() for error feedback.\\n\\n**Risk:** alert() blocks script execution and provides poor UX.\\n\\n**Fix:** Use a toast notification:\\n\`\`\`javascript\\nshowToast('Error: Name required', 'error');\\n\`\`\`\\n\\n**Similar issues found in:** src/utils/format.js, src/components/Button.jsx"

Example of ACCEPTABLE comment (Issue + Risk only):
"**Issue:** The function parameter is not validated.\\n\\n**Risk:** Invalid input will cause runtime errors."

Example of ACCEPTABLE comment (Issue only when context is limited):
"**Issue:** The decrease function no longer prevents the count from going below zero, which was previously handled by an if statement."

Example of INVALID comment (will be rejected):
"This code looks problematic" (missing Issue section)

If zero actionable issues found, return empty array: []
Focus on quality over quantity - one well-explained critical issue > ten vague comments.
`;

  // Chunking logic to handle large MRs
  const MAX_CHARS_PER_CHUNK = 25000; // Smaller chunks = Deeper attention
  const allComments = [];

  // Helper to calculate size
  const getDiffSize = (d) => JSON.stringify(d).length;

  let currentChunk = [];
  let currentSize = 0;
  const chunks = [];

  for (const diff of enrichedDiffs) {
    // Corrected from EnrichedDiffs
    const diffSize = getDiffSize(diff);
    // Keep files together in chunks
    if (
      currentSize + diffSize > MAX_CHARS_PER_CHUNK &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentSize = 0;
    }
    currentChunk.push(diff);
    currentSize += diffSize;
  }
  if (currentChunk.length > 0) chunks.push(currentChunk);

  console.log(
    `Phase: Reviewing ${enrichedDiffs.length} files in ${chunks.length} chunks...`,
  );

  // Sequential Processing to respect API Rate Limits (Critical for Free Tier users)
  const DELAY_BETWEEN_CHUNKS = 2000; // 2 seconds delay between chunks

  for (const [index, chunk] of chunks.entries()) {
    console.log(`Phase: Processing chunk ${index + 1}/${chunks.length}...`);

    let dynamicCommentsContext = "";
    if (index > 0 && allComments.length > 0) {
      // Map to smaller objects to save context tokens, keeping enough info for deduplication
      const condensedComments = allComments.map((c) => ({
        file: c.filePath,
        issue_preview: c.comment.substring(0, 200) + "...",
      }));
      
      dynamicCommentsContext = `
# COMMENTS ALREADY GENERATED IN PREVIOUS CHUNKS
You have already generated the following comments for other files in this Merge Request:
${JSON.stringify(condensedComments, null, 2)}

**CRITICAL INSTRUCTION FOR DEDUPLICATION**: 
DO NOT report these exact same issues again for files in this current chunk. Assume the developer will fix identical logical errors or missing patterns globally based on your first comment.
`;
    }

    const chunkPrompt = `
    ${prompt}
    ${dynamicCommentsContext}
    
# CODE CHANGES (PART ${index + 1} of ${chunks.length})
${JSON.stringify(chunk, null, 2)}
`;

    let attempts = 0;
    let success = false;

    while (attempts < 3 && !success) {
      try {
        attempts++;
        const chunkComments = await runAI(model, chunkPrompt, {
          responseSchema: inlineReviewSchema,
          apiKey,
        });

        if (Array.isArray(chunkComments)) {
          allComments.push(...chunkComments);
          success = true;
        } else {
          throw new Error("AI returned valid JSON but not an array");
        }
      } catch (e) {
        console.error(
          `❌ Error in chunk ${index + 1} (Attempt ${attempts}/3):`,
          e.message,
        );

        // Smart handling for Rate Limits (429)
        const isRateLimit =
          e.message.includes("429") || e.message.includes("quota");
        const baseBackoff = isRateLimit ? 5000 : 2000; // Wait longer for rate limits

        if (attempts < 3) {
          const backoff = baseBackoff * Math.pow(2, attempts - 1);
          console.log(`⏳ Waiting ${backoff}ms before retry...`);
          await new Promise((r) => setTimeout(r, backoff));
        }
      }
    }

    if (!success) {
      console.error(
        `🚨 Fatal: Failed to process chunk ${index + 1} after 3 attempts. Review incomplete for this section.`,
      );
    }

    // Add delay between successful chunks to avoid hitting throughput limits
    if (index < chunks.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_CHUNKS));
    }
  }

  const comments = allComments;

  if (!Array.isArray(comments)) {
    console.warn("AI returned valid JSON but not an array");
    return [];
  }

  // Validate and filter comments
  const validComments = comments
    .filter((comment) => validateCommentStructure(comment))
    .map((comment) => validateComment(comment, enrichedDiffs))
    .filter(Boolean);

  console.log(
    `✅ Validated ${validComments.length}/${comments.length} inline comments (structure + line numbers)`,
  );
  return validComments;
}
