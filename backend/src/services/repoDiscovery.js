import * as gl from "../gitlab/gitlabService.js";
import logger from "../utils/logger.js";

/**
 * Repository Discovery Service
 * Responsible for gathering global context (configs, docs) from the repository.
 */
export const repoDiscovery = {
  /**
   * Gather global context for a project
   * @param {string} token - GitLab token
   * @param {string|number} projectId - GitLab project ID
   * @param {string} ref - Branch/Commit reference
   * @param {Array} changedPaths - Paths of modified files for local doc prioritization
   * @returns {Promise<Object>} Object containing configs and docs
   */
  async getRepoContext(token, projectId, ref = "main", changedPaths = [], diffs = []) {
    try {
      // 1. List all files to identify project structure
      const files = await gl.listRepositoryFiles(token, projectId, { ref, recursive: true });
      
      if (!files || files.length === 0) {
        logger.warn(`⚠️ Repo Discovery: No files found for ref ${ref}.`);
        return { configs: {}, docs: [], connected: {} };
      }
      logger.info(`📁 Repo Discovery: Scanned ${files.length} files in the repository.`);

      // 2. Identify and fetch Project Configs (Language Specific)
      const configs = await this.findProjectConfigs(token, projectId, ref, files);
      logger.info(`🔍 Repo Discovery: Found ${Object.keys(configs).length} configuration files.`);

      // 3. Identify and fetch Documentation (.md files)
      const docs = await this.findRelevantDocs(token, projectId, ref, files, changedPaths);
      const fullDocsCount = docs.filter(d => d.path !== "GLOBAL_DOC_INDEX").length;
      logger.info(`📚 Repo Discovery: Indexed documentation. Fetched ${fullDocsCount} full docs, plus Global Index.`);

      // 4. Identify and fetch Connected Files (Tracer)
      const connected = await this.findConnectedFiles(token, projectId, ref, diffs, files);
      logger.info(`🔗 Repo Discovery: Traced dependencies. Found ${Object.keys(connected).length} connected files.`);

      return { configs, docs, connected };
    } catch (error) {
      logger.error(`Error in repoDiscovery: ${error.message}`);
      return { configs: {}, docs: [], connected: {} };
    }
  },

  /**
   * Find and fetch language-specific configuration files
   */
  async findProjectConfigs(token, projectId, ref, files) {
    const configMap = {
      // JavaScript / Node
      "package.json": null,
      "tsconfig.json": null,
      ".eslintrc": null,
      ".eslintrc.js": null,
      ".eslintrc.json": null,
      // Java
      "pom.xml": null,
      "build.gradle": null,
      // Python
      "requirements.txt": null,
      "pyproject.toml": null,
      "setup.py": null,
      // Docker / DevOps
      "Dockerfile": null,
      ".gitlab-ci.yml": null
    };

    const foundConfigs = {};
    const configPromises = [];

    files.forEach(file => {
      if (file.type === "blob" && configMap.hasOwnProperty(file.name)) {
        configPromises.push(
          gl.getRepositoryFile(token, projectId, file.path, ref).then(content => {
            if (content) {
              foundConfigs[file.name] = content;
            }
          })
        );
      }
    });

    await Promise.all(configPromises);
    return foundConfigs;
  },

  /**
   * Find and fetch documentation (.md) files
   * Optimized: Fetches root MDs and local MDs, provides an index for everything else.
   */
  async findRelevantDocs(token, projectId, ref, files, changedPaths = []) {
    const mdFiles = files.filter(f => f.name.toLowerCase().endsWith(".md") && f.type === "blob");
    
    if (mdFiles.length === 0) return [];

    const docs = [];
    const docPromises = [];
    const fetchedPaths = new Set();

    // 1. Prioritize Root Files (README, ARCHITECTURE, etc.)
    const rootMDs = mdFiles.filter(f => !f.path.includes("/"));
    
    // 2. Prioritize "Local" Files (MDs in the same directories as changed files)
    const changedDirs = new Set(changedPaths.map(p => p.split("/").slice(0, -1).join("/")));
    const localMDs = mdFiles.filter(f => {
      const dir = f.path.split("/").slice(0, -1).join("/");
      return changedDirs.has(dir);
    });

    // Combine and limit to avoid token overload (max 10 full files)
    const priorityFiles = [...new Set([...rootMDs, ...localMDs])].slice(0, 10);

    priorityFiles.forEach(file => {
      fetchedPaths.add(file.path);
      docPromises.push(
        gl.getRepositoryFile(token, projectId, file.path, ref).then(content => {
          if (content) {
            docs.push({
              path: file.path,
              name: file.name,
              content: content.substring(0, 10000) // Safety truncation per file
            });
          }
        })
      );
    });

    await Promise.all(docPromises);

    // 3. Global Documentation Index (Token Optimization)
    // For all other MD files, just provide the path to let AI know they exist
    const otherMDs = mdFiles.filter(f => !fetchedPaths.has(f.path));
    if (otherMDs.length > 0) {
      const indexStr = otherMDs.map(f => `- ${f.path}`).join("\n");
      docs.push({
        path: "GLOBAL_DOC_INDEX",
        name: "Repo-wide Documentation Map",
        content: `The following other documentation files exist in this repository but their full content was omitted to optimize tokens:\n${indexStr}\n\n(Assume standard practices unless specified in fetched root/local docs.)`
      });
    }

    return docs;
  },

  /**
   * Find and fetch "connected" files (imported by the modified files)
   * Supports JS/TS imports and requires
   */
  /**
   * Find and fetch "connected" files (imported by the modified files).
   * This provides the AI with critical context like constants, enums, and utility definitions.
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

    // 1. Fetch full content of modified files to parse ALL imports (not just those in the diff)
    const fullFilePromises = diffs.map(async (diff) => {
      if (!diff.new_path) return null;
      const content = await gl.getRepositoryFile(token, projectId, diff.new_path, ref);
      return { path: diff.new_path, content };
    });

    const modifiedFiles = (await Promise.all(fullFilePromises)).filter(f => f && f.content);

    // 2. Parse imports using language-specific regex patterns
    modifiedFiles.forEach(file => {
      const ext = file.path.split(".").pop().toLowerCase();
      let importRegex;
      
      // Technology-agnostic detection (JS/TS, Python, Java)
      if (["js", "ts", "jsx", "tsx", "vue"].includes(ext)) {
        importRegex = /(?:import|from|require)\s*\(?\s*['"]([^'"]+)['"]\s*\)?/g;
      } else if (ext === "py") {
        importRegex = /(?:from|import)\s+([a-zA-Z0-9_\.]+)/g;
      } else if (ext === "java") {
        importRegex = /import\s+([a-zA-Z0-9_\.]+);/g;
      }

      if (!importRegex) return;

      const dir = file.path.split("/").slice(0, -1).join("/");
      let match;
      
      while ((match = importRegex.exec(file.content)) !== null) {
        let importPath = match[1];
        // Resolve the import to an absolute repository path using the file tree
        const resolvedPath = this.resolveSmartPath(dir, importPath, allFiles, ext);
        if (resolvedPath && resolvedPath !== file.path) {
          importPaths.add(resolvedPath);
        }
      }
    });

    // 3. Prioritize and fetch top 10 imports (Constants/Enums first for logic resolution)
    const sortedImports = Array.from(importPaths).sort((a, b) => {
      const keywords = ["constants", "enums", "map", "config", "utils", "types", "dto", "model"];
      const aScore = keywords.some(k => a.toLowerCase().includes(k)) ? 1 : 0;
      const bScore = keywords.some(k => b.toLowerCase().includes(k)) ? 1 : 0;
      return bScore - aScore;
    });

    const topImports = sortedImports.slice(0, 10);
    const fetchPromises = topImports.map(path => {
      return gl.getRepositoryFile(token, projectId, path, ref).then(content => {
        if (content) {
          connectedFiles[path] = content;
        }
      });
    });

    await Promise.all(fetchPromises);
    return connectedFiles;
  },

  /**
   * Resolve an import path to a full repository path.
   * Handles:
   * - Relative paths (./, ../)
   * - Aliases (@/, ~/)
   * - Technology-specific structures (Java dots, Python dots)
   * - Fuzzy matching against the repository file tree
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
      // Verify it exists in tree (check for direct match, with extension, or as an index file)
      const match = allFiles.find(f => 
        f.path === absolute || 
        f.path === absolute + "." + ext ||
        f.path === absolute + "/index." + ext
      );
      return match ? match.path : null;
    }

    // 2. Handle Aliased or Package-based Paths (Fuzzy Matching)
    // Clean the import (remove aliases like @/ or transform java dots to slashes)
    const cleanPath = importPath.replace(/^(@\/|~\/)/, "").replace(/\./g, "/");
    
    // Look for a file in the tree that ends with this clean path
    // This allows resolving @/components/Table to src/components/Table.vue
    const fuzzyMatch = allFiles.find(f => {
      if (f.type !== "blob") return false;
      const pathWithoutExt = f.path.replace(/\.[^/.]+$/, "");
      return pathWithoutExt.endsWith(cleanPath);
    });

    return fuzzyMatch ? fuzzyMatch.path : null;
  },

  /**
   * Resolve relative path
   */
  resolvePath(currentDir, relativePath) {
    const parts = currentDir.split("/").filter(p => p);
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
  }
};
