import * as gl from "../gitlab/gitlabService.js";
import logger from "../utils/logger.js";
import { applySmartBudget, applyBudget, BUDGETS } from "../utils/tokenBudget.js";

// ─── In-Memory Cache ────────────────────────────────────────────────────────
// Keyed by `projectId:headRef`. Avoids re-fetching the same repo context
// on rapid re-reviews of the same MR (e.g. two clicks within 10 minutes).
const repoContextCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCachedContext(projectId, ref) {
  const key = `${projectId}:${ref}`;
  const cached = repoContextCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    logger.info(`💾 Repo Discovery: Cache HIT for project ${projectId} @ ${String(ref).substring(0, 8)}`);
    return cached.data;
  }
  return null;
}

function setCachedContext(projectId, ref, data) {
  const key = `${projectId}:${ref}`;
  repoContextCache.set(key, { data, timestamp: Date.now() });
}

// ─── Language Detection ──────────────────────────────────────────────────────
// Detects the primary language from the changed file extensions.
// Used to fetch ONLY the relevant config files instead of everything.
const LANG_EXTENSIONS = {
  javascript: ["js", "ts", "jsx", "tsx", "vue", "mjs", "cjs"],
  java: ["java", "kt", "groovy"],
  python: ["py"],
  go: ["go"],
  ruby: ["rb"],
  php: ["php"],
};

function detectLanguage(filePaths = []) {
  const extCount = {};
  filePaths.forEach((p) => {
    const ext = (p || "").split(".").pop()?.toLowerCase();
    if (ext && ext.length < 6) extCount[ext] = (extCount[ext] || 0) + 1;
  });

  for (const [lang, exts] of Object.entries(LANG_EXTENSIONS)) {
    if (exts.some((e) => extCount[e] > 0)) return lang;
  }
  return "generic";
}

// Config files to fetch per language. Only configs relevant to the project
// language are fetched, saving unnecessary GitLab API calls + tokens.
const CONFIGS_BY_LANGUAGE = {
  javascript: ["package.json", "tsconfig.json", ".eslintrc", ".eslintrc.js", ".eslintrc.json"],
  java: ["pom.xml", "build.gradle"],
  python: ["requirements.txt", "pyproject.toml", "setup.py"],
  go: ["go.mod"],
  ruby: ["Gemfile"],
  php: ["composer.json"],
  generic: ["package.json", "requirements.txt", "pom.xml"],
};

// Always include DevOps configs regardless of language
const ALWAYS_FETCH_CONFIGS = ["Dockerfile", ".gitlab-ci.yml"];

// ─── Config Truncation ───────────────────────────────────────────────────────
// Smart per-file truncation. For package.json we strip individual dependency
// versions (100+ lines of noise) and keep only the structural shape.
function truncateConfig(filename, content) {
  if (!content) return content;

  if (filename === "package.json") {
    try {
      const pkg = JSON.parse(content);
      const compacted = {
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        type: pkg.type,
        scripts: pkg.scripts,
        ...(pkg.dependencies
          ? { dependencies: `[${Object.keys(pkg.dependencies).length} packages — names omitted]` }
          : {}),
        ...(pkg.devDependencies
          ? { devDependencies: `[${Object.keys(pkg.devDependencies).length} dev packages — names omitted]` }
          : {}),
        engines: pkg.engines,
      };
      // Remove undefined/null keys
      Object.keys(compacted).forEach(
        (k) => (compacted[k] === undefined || compacted[k] === null) && delete compacted[k]
      );
      return JSON.stringify(compacted, null, 2);
    } catch (_) {
      // Fall through to generic truncation
    }
  }

  // Generic: apply token budget (smart: head + tail)
  return applySmartBudget(content, BUDGETS.PER_CONFIG_FILE, filename);
}

/**
 * Repository Discovery Service
 * Responsible for gathering global context (configs, docs, connected files)
 * from the repository, with built-in token optimizations.
 */
export const repoDiscovery = {
  /**
   * Gather global context for a project.
   * Results are cached by projectId + ref for 10 minutes to avoid
   * redundant fetches on rapid re-reviews of the same MR.
   *
   * @param {string} token - GitLab token
   * @param {string|number} projectId - GitLab project ID
   * @param {string} ref - Branch/Commit reference (head_sha)
   * @param {Array} changedPaths - Paths of modified files
   * @param {Array} diffs - Raw diff objects
   * @returns {Promise<Object>} Object containing configs, docs, connected
   */
  async getRepoContext(token, projectId, ref = "main", changedPaths = [], diffs = []) {
    try {
      // 1. Check cache first
      const cached = getCachedContext(projectId, ref);
      if (cached) return cached;

      // 2. List all files to identify project structure
      const files = await gl.listRepositoryFiles(token, projectId, { ref, recursive: true });

      if (!files || files.length === 0) {
        logger.warn(`⚠️ Repo Discovery: No files found for ref ${ref}.`);
        return { configs: {}, docs: [], connected: {} };
      }
      logger.info(`📁 Repo Discovery: Scanned ${files.length} files in the repository.`);

      // 3. Detect primary language for targeted fetching
      const detectedLang = detectLanguage(changedPaths);
      logger.info(`🔎 Repo Discovery: Detected primary language → ${detectedLang}`);

      // 4. Identify and fetch Project Configs (Language-Aware)
      const configs = await this.findProjectConfigs(token, projectId, ref, files, detectedLang);
      logger.info(`🔍 Repo Discovery: Found ${Object.keys(configs).length} configuration files.`);

      // 5. Identify and fetch Documentation (.md files)
      const docs = await this.findRelevantDocs(token, projectId, ref, files, changedPaths);
      const fullDocsCount = docs.filter((d) => d.path !== "GLOBAL_DOC_INDEX").length;
      logger.info(`📚 Repo Discovery: Indexed documentation. Fetched ${fullDocsCount} full docs.`);

      // 6. Identify and fetch Connected Files (Tracer)
      const connected = await this.findConnectedFiles(token, projectId, ref, diffs, files);
      logger.info(`🔗 Repo Discovery: Traced dependencies. Found ${Object.keys(connected).length} connected files.`);

      const result = { configs, docs, connected };

      // 7. Store in cache
      setCachedContext(projectId, ref, result);

      return result;
    } catch (error) {
      logger.error(`Error in repoDiscovery: ${error.message}`);
      return { configs: {}, docs: [], connected: {} };
    }
  },

  /**
   * Find and fetch language-specific configuration files.
   * Only fetches configs relevant to the detected primary language
   * plus universal DevOps configs (Dockerfile, .gitlab-ci.yml).
   */
  async findProjectConfigs(token, projectId, ref, files, detectedLang = "generic") {
    const langConfigs = CONFIGS_BY_LANGUAGE[detectedLang] || CONFIGS_BY_LANGUAGE.generic;
    const targetConfigs = new Set([...langConfigs, ...ALWAYS_FETCH_CONFIGS]);

    const foundConfigs = {};
    const configPromises = [];

    files.forEach((file) => {
      if (file.type === "blob" && targetConfigs.has(file.name)) {
        configPromises.push(
          gl.getRepositoryFile(token, projectId, file.path, ref).then((content) => {
            if (content) {
              // Apply smart truncation to keep token cost predictable
              foundConfigs[file.name] = truncateConfig(file.name, content);
            }
          })
        );
      }
    });

    await Promise.all(configPromises);
    return foundConfigs;
  },

  /**
   * Find and fetch documentation (.md) files.
   * Optimized: max 3 full files (down from 10), capped at 4,000 chars each.
   * Provides a Global Doc Index for the remainder so the AI knows they exist.
   */
  async findRelevantDocs(token, projectId, ref, files, changedPaths = []) {
    const mdFiles = files.filter(
      (f) => f.name.toLowerCase().endsWith(".md") && f.type === "blob"
    );

    if (mdFiles.length === 0) return [];

    const docs = [];
    const docPromises = [];
    const fetchedPaths = new Set();

    // Priority 1: Root-level MD files (README, ARCHITECTURE, CONTRIBUTING)
    const rootMDs = mdFiles.filter((f) => !f.path.includes("/"));

    // Priority 2: MD files in the same directories as changed files
    const changedDirs = new Set(
      changedPaths.map((p) => p.split("/").slice(0, -1).join("/"))
    );
    const localMDs = mdFiles.filter((f) => {
      const dir = f.path.split("/").slice(0, -1).join("/");
      return changedDirs.has(dir);
    });

    // Priority 3: Files with "context" or "architecture" in the name
    const contextMDs = mdFiles.filter(
      (f) =>
        f.name.toLowerCase().includes("context") ||
        f.name.toLowerCase().includes("architecture")
    );

    // Combine, deduplicate, and limit to 3 full files (was 10)
    const priorityFiles = [...new Set([...rootMDs, ...localMDs, ...contextMDs])].slice(0, 3);

    priorityFiles.forEach((file) => {
      fetchedPaths.add(file.path);
      docPromises.push(
        gl.getRepositoryFile(token, projectId, file.path, ref).then((content) => {
          if (content) {
            docs.push({
              path: file.path,
              name: file.name,
              // Cap at 4,000 chars (was 10,000) — still preserves full README/ARCHITECTURE
              content: applyBudget(content, BUDGETS.PER_DOC_FILE, file.name),
            });
          }
        })
      );
    });

    await Promise.all(docPromises);

    // Global Doc Index: For all other MD files, just list paths
    const otherMDs = mdFiles.filter((f) => !fetchedPaths.has(f.path));
    if (otherMDs.length > 0) {
      const indexStr = otherMDs.map((f) => `- ${f.path}`).join("\n");
      docs.push({
        path: "GLOBAL_DOC_INDEX",
        name: "Repo-wide Documentation Map",
        content: `The following documentation files exist but their full content was omitted to optimize tokens:\n${indexStr}\n\n(Assume standard practices unless specified in fetched root/local docs.)`,
      });
    }

    return docs;
  },

  /**
   * Find and fetch "connected" files (imported by the modified files).
   * Provides the AI with critical context like constants, enums, and utility definitions.
   * Content is capped per file using smart budget (head + tail) to preserve
   * imports/exports while cutting middle boilerplate.
   *
   * @param {string} token - GitLab Token
   * @param {number} projectId - GitLab Project ID
   * @param {string} ref - Branch/Commit reference
   * @param {Array} diffs - List of changed files
   * @param {Array} allFiles - Full repository file tree for path resolution
   */
  async findConnectedFiles(token, projectId, ref, diffs, allFiles = []) {
    const connectedFiles = {};
    const importPaths = new Set();

    // 1. Fetch full content of modified files to parse ALL imports
    const fullFilePromises = diffs.map(async (diff) => {
      if (!diff.new_path) return null;
      const content = await gl.getRepositoryFile(token, projectId, diff.new_path, ref);
      return { path: diff.new_path, content };
    });

    const modifiedFiles = (await Promise.all(fullFilePromises)).filter(
      (f) => f && f.content
    );

    // 2. Parse imports using language-specific regex patterns
    modifiedFiles.forEach((file) => {
      const ext = file.path.split(".").pop().toLowerCase();
      let importRegex;

      if (["js", "ts", "jsx", "tsx", "vue"].includes(ext)) {
        importRegex = /(?:import|from|require)\s*\(?\s*['"]([^'"]+)['"]\s*\)?/g;
      } else if (ext === "py") {
        importRegex = /(?:from|import)\s+([a-zA-Z0-9_.]+)/g;
      } else if (ext === "java") {
        importRegex = /import\s+([a-zA-Z0-9_.]+);/g;
      }

      if (!importRegex) return;

      const dir = file.path.split("/").slice(0, -1).join("/");
      let match;

      while ((match = importRegex.exec(file.content)) !== null) {
        let importPath = match[1];
        const resolvedPath = this.resolveSmartPath(dir, importPath, allFiles, ext);
        if (resolvedPath && resolvedPath !== file.path) {
          importPaths.add(resolvedPath);
        }
      }
    });

    // 3. Prioritize top 10 imports (Constants/Enums first for logic resolution)
    const sortedImports = Array.from(importPaths).sort((a, b) => {
      const keywords = ["constants", "enums", "map", "config", "utils", "types", "dto", "model"];
      const aScore = keywords.some((k) => a.toLowerCase().includes(k)) ? 1 : 0;
      const bScore = keywords.some((k) => b.toLowerCase().includes(k)) ? 1 : 0;
      return bScore - aScore;
    });

    const topImports = sortedImports.slice(0, 10);

    const fetchPromises = topImports.map((filePath) => {
      return gl.getRepositoryFile(token, projectId, filePath, ref).then((content) => {
        if (content) {
          // Smart budget: keep file header (imports/class def) + footer (exports)
          // This preserves the critical parts the AI needs for type/constant resolution
          connectedFiles[filePath] = applySmartBudget(
            content,
            BUDGETS.PER_CONNECTED_FILE,
            filePath
          );
        }
      });
    });

    await Promise.all(fetchPromises);
    return connectedFiles;
  },

  /**
   * Resolve an import path to a full repository path.
   * Handles relative paths, aliases (@/, ~/), and fuzzy file tree matching.
   *
   * @param {string} currentDir - Directory of the file containing the import
   * @param {string} importPath - The raw import string
   * @param {Array} allFiles - The repository's full file tree
   * @param {string} ext - File extension of the source file
   */
  resolveSmartPath(currentDir, importPath, allFiles, ext) {
    // 1. Handle Relative Paths
    if (importPath.startsWith(".")) {
      const absolute = this.resolvePath(currentDir, importPath);
      const match = allFiles.find(
        (f) =>
          f.path === absolute ||
          f.path === absolute + "." + ext ||
          f.path === absolute + "/index." + ext
      );
      return match ? match.path : null;
    }

    // 2. Handle Aliased or Package-based Paths (Fuzzy Matching)
    const cleanPath = importPath.replace(/^(@\/|~\/)/, "").replace(/\./g, "/");
    const fuzzyMatch = allFiles.find((f) => {
      if (f.type !== "blob") return false;
      const pathWithoutExt = f.path.replace(/\.[^/.]+$/, "");
      return pathWithoutExt.endsWith(cleanPath);
    });

    return fuzzyMatch ? fuzzyMatch.path : null;
  },

  /**
   * Resolve a relative path from a base directory.
   */
  resolvePath(currentDir, relativePath) {
    const parts = currentDir.split("/").filter((p) => p);
    const relParts = relativePath.split("/");

    for (const part of relParts) {
      if (part === ".") continue;
      if (part === "..") {
        parts.pop();
      } else {
        parts.push(part);
      }
    }
    return parts.join("/");
  },
};
