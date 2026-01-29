/**
 * Parse a diff to build a complete line mapping
 * @param {object} diff - GitLab diff object
 * @returns {object} - Line mappings and metadata
 */
export const parseDiffLines = (diff) => {
  const result = {
    addedLines: new Set(),
    deletedLines: new Set(),
    contextLines: new Set(),
    canComment: new Set(),
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

    if (line.startsWith("-")) {
      // Deleted line
      result.deletedLines.add(oldLine);
      result.canComment.add(`old-${oldLine}`);
      oldLine++;
    } else if (line.startsWith("+")) {
      // Added line
      result.addedLines.add(newLine);
      result.canComment.add(`new-${newLine}`);
      newLine++;
    } else if (line.startsWith(" ")) {
      // Context line (unchanged) - IS VALID FOR COMMENTS
      result.contextLines.add(newLine);
      result.canComment.add(`new-${newLine}`);
      oldLine++;
      newLine++;
    }
  }

  return result;
};
