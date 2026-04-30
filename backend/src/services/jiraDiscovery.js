import logger from "../utils/logger.js";
import { AIService } from "../ai/AIService.js";
import supabase from "../config/supabase.js";

/**
 * Service to discover and link Jira tickets to MRs
 */
const jiraDiscovery = {
  /**
   * Find a relevant Jira ticket for the MR
   */
  async findTicket(mrData, options = {}) {
    const { title, source_branch, description } = mrData;
    const { threshold = 0.5, matchCount = 1 } = options;

    logger.info(`🔍 Discovering Jira ticket for MR: "${title}"`);

    // 1. Try Regex Pattern Matching (Highest Priority)
    // Collect all unique potential ticket IDs from title, branch, and description
    const potentialIds = [
      ...new Set([
        ...this.extractIds(title),
        ...this.extractIds(source_branch),
        ...this.extractIds(description),
      ]),
    ].slice(0, 5); // Limit to first 5 unique potential IDs for performance

    for (const ticketId of potentialIds) {
      const ticket = await this.getTicketById(ticketId);
      if (ticket) {
        logger.info(`✅ Verified Jira ticket match: ${ticketId}`);
        return ticket;
      }
    }

    logger.info(`🕵️ No explicit Jira ID found. Attempting semantic search...`);

    // 2. Semantic Search Fallback (Vector Similarity via Supabase)
    if (!supabase) return null;

    // Use both title and branch for semantic search to maximize hit rate
    const searchQuery = `${title} ${source_branch || ""}`.trim();
    const result = await this.searchBySimilarity(searchQuery, { threshold, matchCount });

    // Safety Guard: Only link if similarity is high (>= 75%)
    // This prevents "contamination" where a project might match a similar-sounding ticket from a different project
    if (result && result.similarity < 0.75) {
      logger.info(
        `⚠️ Closest Jira match only has ${Math.round(
          result.similarity * 100
        )}% similarity. Ignoring to avoid contamination.`
      );
      return null;
    }

    return result;
  },

  /**
   * Extract all potential Jira IDs (e.g., BEV-42) from text
   * @returns {Array<string>} Array of unique ticket IDs in uppercase
   */
  extractIds(text) {
    if (!text) return [];
    // Regex: Start with letter, then letters/numbers, followed by - and digits
    const matches = text.match(/[a-zA-Z][a-zA-Z0-9]+-\d+/gi);
    return matches ? matches.map((m) => m.toUpperCase()) : [];
  },

  async getTicketById(key) {
    if (!supabase) return null;

    try {
      // Fetch all chunks for this ticket key to get the full context
      const { data, error } = await supabase
        .from("ticket_embeddings")
        .select("ticket_key, content_chunk")
        .eq("ticket_key", key)
        .order("id", { ascending: true }); // Assume ID order matches logical order

      if (error || !data || data.length === 0) {
        return null;
      }

      // Join all chunks to provide the full description and comments
      const fullContent = data.map((d) => d.content_chunk).join("\n\n---\n\n");

      logger.info(`🔗 Linked Jira Context: ${data[0].ticket_key}`);
      return {
        key: data[0].ticket_key,
        content: fullContent,
      };
    } catch (err) {
      return null;
    }
  },

  /**
   * Perform vector search in Supabase using embeddings.
   * Only searches within the detected project key to ensure isolation.
   */
  async searchBySimilarity(query, { threshold, matchCount }) {
    try {
      // 1. Identify the project prefix (e.g., "CERA")
      const projectKey = this.extractProjectKey(query);
      if (!projectKey) {
        logger.info(
          `ℹ️ No Jira project key detected in MR metadata. Skipping semantic search to prevent contamination.`
        );
        return null;
      }

      // 2. Generate embedding for the search query
      const queryEmbedding = await AIService.embed(query, "huggingface");

      // 3. Search ONLY within the identified project
      const { data, error } = await supabase.rpc("match_ticket_embeddings", {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: matchCount,
        filter_project_key: projectKey, // Strictly filter by project
      });

      if (!error && data && data.length > 0) {
        const bestMatch = data[0];
        const ticket = await this.getTicketById(bestMatch.ticket_key);
        return {
          ...ticket,
          similarity: bestMatch.similarity,
        };
      }

      return null;
    } catch (error) {
      logger.error(`❌ Semantic search failed: ${error.message}`);
      return null;
    }
  },

  /**
   * Extract project key (e.g. RAPTOR) from text
   */
  extractProjectKey(text) {
    if (!text) return null;
    const match = text.match(/([a-zA-Z][a-zA-Z0-9]+)-\d+/i);
    return match ? match[1].toUpperCase() : null;
  },
};

export default jiraDiscovery;
