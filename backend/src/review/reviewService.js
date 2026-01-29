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
  const contextLines = new Set(); // Stores NEW line numbers for context

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
      contextLines.add(ctx.newLine);
    }
  }

  return { addedLines, deletedLines, contextLines };
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

  const { addedLines, deletedLines, contextLines } =
    createLineLookups(enrichedDiff);
  let isValid = false;

  // Ensure line numbers are integers (AI sometimes returns strings)
  if (comment.line) comment.line = parseInt(comment.line, 10);
  if (comment.oldLine) comment.oldLine = parseInt(comment.oldLine, 10);

  // Helper for fuzzy match
  const checkLine = (line, set) => {
    if (set.has(line)) return line;
    // Check +/- 4 lines (generous fuzzy match)
    for (let i = 1; i <= 4; i++) {
      if (set.has(line + i)) return line + i;
      if (set.has(line - i)) return line - i;
    }
    return null;
  };

  // Validate added line comments
  if (comment.line) {
    let matchedLine = checkLine(comment.line, addedLines);
    if (!matchedLine) matchedLine = checkLine(comment.line, contextLines);

    if (matchedLine) {
      isValid = true;
      if (matchedLine !== comment.line) {
        console.log(
          `Auto-corrected line from ${comment.line} to ${matchedLine}`,
        );
        comment.line = matchedLine;
      }
    } else {
      console.warn(`❌ ${comment.filePath}: Line ${comment.line} not found.`);
      // Debug: print near misses?
      const nearest = Array.from(addedLines).find(
        (l) => Math.abs(l - comment.line) < 5,
      );
      if (nearest) console.log(`   (Nearest added line was ${nearest})`);
    }
  }

  // Validate deleted line comments
  if (comment.oldLine) {
    const matchedLine = checkLine(comment.oldLine, deletedLines);
    if (matchedLine) {
      isValid = true;
      if (matchedLine !== comment.oldLine) {
        console.log(
          `Auto-corrected oldLine from ${comment.oldLine} to ${matchedLine}`,
        );
        comment.oldLine = matchedLine;
      }
    } else {
      // Also check context for oldLine cases
      const contextMatch = checkLine(comment.oldLine, contextLines);
      if (contextMatch) {
        isValid = true;
        // Note: contextLines tracks newLines, but often oldLine ~= newLine in context
      } else {
        console.warn(
          `❌ ${comment.filePath}:${comment.oldLine} (oldLine) - not in diff`,
        );
      }
    }
  }

  if (!isValid) {
    return null;
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

  const prompt = `
You are a **Senior Software Engineer** doing a critical code review for a GitLab Merge Request for production deployment.

# MISSION
Review the code changes below and ONLY generate actionable, specific comments that require the developer to update or improve the code. Do NOT add info comments, explanations, or compliments. Only comment if a real, actionable change is needed.

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

Note: Since you only have access to git diffs (not full codebase), you may not always have enough context to provide a complete Fix. In such cases, provide Issue and Risk at minimum.

## Example (IDEAL - all 3 sections):
{
  "filePath": "src/auth/login.js",
  "line": 42,
  "severity": "critical",
  "comment": "**Issue:** SQL injection vulnerability - user input concatenated directly into query string.\n\n**Risk:** Attacker can execute arbitrary SQL commands, dump database, or delete all data.\n\n**Fix:** Use parameterized queries:\n\`\`\`javascript\nconst result = await db.query(\n  'SELECT * FROM users WHERE email = $1',\n  [userEmail]\n);\n\`\`\`"
}

## Example (ACCEPTABLE - Issue + Risk only):
{
  "filePath": "src/utils/helper.js",
  "line": 15,
  "severity": "high",
  "comment": "**Issue:** The \`count\` parameter is not validated before use.\n\n**Risk:** Passing negative or non-numeric values will cause runtime errors or unexpected behavior."
}

## Invalid Example:
❌ Missing Issue section entirely
❌ Generic comments without specifics

# RULES (STRICT ENFORCEMENT)

✅ DO:
- ALWAYS include Issue section (mandatory)
- Include Risk section when the impact is clear
- Include Fix section with copy-pasteable code when you have enough context
- Use double newlines (\n\n) between sections when including multiple
- Comment ONLY on changed lines (added or deleted)
- Reference actual line numbers from the diff
- Focus on correctness, security, and performance
- Include imports/dependencies in fix examples if needed
- If you can't provide a complete Fix due to limited diff context, at least explain what needs to be done

❌ DON'T:
- Submit comments without Issue section
- Make style suggestions (indentation, naming conventions handled by linters)
- Add informational comments ("This looks good", "Consider adding...")
- Suggest improvements without clear problems
- Comment on unchanged context lines
- Give vague advice ("improve error handling" without details)

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

# CODE CHANGES
${JSON.stringify(enrichedDiffs, null, 2)}

# OUTPUT FORMAT (STRICT REQUIREMENTS)

Return a JSON array where EVERY comment object MUST have:
- filePath: string (exact path from diff)
- line: integer (for added lines) OR oldLine: integer (for deleted lines)
- severity: "critical" | "high" | "medium"
- comment: string with REQUIRED Issue section and OPTIONAL Risk/Fix sections:
  * **Issue:** [problem description] - MANDATORY
  * **Risk:** [impact if not fixed] - OPTIONAL (include when clear)
  * **Fix:** [code solution with example] - OPTIONAL (include when you have enough context)

Separate sections with \\n\\n (double newlines).

Example of IDEAL comment (all 3 sections):
"**Issue:** Using alert() for error feedback.\\n\\n**Risk:** alert() blocks script execution and provides poor UX.\\n\\n**Fix:** Use a toast notification:\\n\`\`\`javascript\\nshowToast('Error: Name required', 'error');\\n\`\`\`"

Example of ACCEPTABLE comment (Issue + Risk only):
"**Issue:** The function parameter is not validated.\\n\\n**Risk:** Invalid input will cause runtime errors."

Example of ACCEPTABLE comment (Issue only when context is limited):
"**Issue:** The decrease function no longer prevents the count from going below zero, which was previously handled by an if statement."

Example of INVALID comment (will be rejected):
"This code looks problematic" (missing Issue section)

If zero actionable issues found, return empty array: []
Focus on quality over quantity - one well-explained critical issue > ten vague comments.
`;

  try {
    const comments = await runAI(model, prompt, {
      responseSchema: inlineReviewSchema,
      apiKey,
    });

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
  } catch (error) {
    console.error(
      "❌ Unexpected error in generateInlineReviews:",
      error.message,
    );
    return [];
  }
}
