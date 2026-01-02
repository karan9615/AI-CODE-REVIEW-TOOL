/**
 * Parse a diff to build a complete line mapping
 * @param {object} diff - GitLab diff object
 * @returns {object} - Line mappings and metadata
 */
export const parseDiffLines = (diff) => {
  const result = {
    addedLines: new Map(), // new_line -> { content, old_line_equivalent }
    deletedLines: new Map(), // old_line -> { content }
    canComment: new Set(), // All line numbers that can receive comments
  };

  if (!diff || !diff.diff) return result;

  const lines = diff.diff.split("\n");
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    // Parse hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    const hunkMatch = line.match(/^@@ -(\d+),?\d* \+(\d+),?\d* @@/);
    if (hunkMatch) {
      oldLine = parseInt(hunkMatch[1]);
      newLine = parseInt(hunkMatch[2]);
      continue;
    }

    const content = line.substring(1); // Remove prefix (+, -, or space)

    if (line.startsWith("-")) {
      // Deleted line
      result.deletedLines.set(oldLine, { content });
      result.canComment.add(`old-${oldLine}`);
      oldLine++;
    } else if (line.startsWith("+")) {
      // Added line
      result.addedLines.set(newLine, { content, oldLine });
      result.canComment.add(`new-${newLine}`);
      newLine++;
    } else if (line.startsWith(" ")) {
      // Context line (unchanged) - cannot comment
      oldLine++;
      newLine++;
    }
  }

  return result;
};
