import supabase from "../config/supabase.js";
import { AIService } from "../ai/AIService.js";
import logger from "../utils/logger.js";

/**
 * Jira Discovery Service
 * Logic for finding the most relevant Jira ticket for a given MR.
 */
export const jiraDiscovery = {
  /**
   * Find the best matching Jira ticket for an MR
   * @param {Object} mrData - MR details (title, source_branch, description)
   * @param {Object} options - Search options (e.g., threshold)
   * @returns {Promise<Object|null>} The matched ticket or null
   */
  async findTicket(mrData, options = {}) {
    const { title, source_branch, description } = mrData;
    const { threshold = 0.5, matchCount = 1 } = options;

    // 1. Try Regex Pattern Matching (Priority)
    const ticketId =
      this.extractId(title) ||
      this.extractId(source_branch) ||
      this.extractId(description);

    if (ticketId) {
      return await this.getTicketById(ticketId);
    }

    // 2. Semantic Search Fallback
    if (!supabase) return null;

    // Use both title and branch for semantic search to maximize hit rate
    const searchQuery = `${title} ${source_branch || ""}`.trim();
    return await this.searchBySimilarity(searchQuery, { threshold, matchCount });
  },

  /**
   * Extract Jira ID (e.g., BEV-42) from text
   */
  extractId(text) {
    if (!text) return null;
    const match = text.match(/[A-Z]+-\d+/);
    return match ? match[0] : null;
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

      return {
        key: data[0].ticket_key,
        content: fullContent,
      };
    } catch (err) {
      return null;
    }
  },

  /**
   * Perform vector search in Supabase
   */
  async searchBySimilarity(query, { threshold, matchCount }) {
    try {
      // 1. Determine Project Key (Prefix) from query if possible
      const extractedKey = this.extractProjectKey(query);
      const projectsToSearch = extractedKey ? [extractedKey] : ["RAPTOR", "CERA", "DEVOPS"];

      // Generate embedding for the search query
      const queryEmbedding = await AIService.embed(query, "huggingface");

      for (const projectKey of projectsToSearch) {
        // 2. Call the Supabase RPC function (match_ticket_embeddings)
        const { data, error } = await supabase.rpc("match_ticket_embeddings", {
          query_embedding: queryEmbedding,
          match_threshold: threshold,
          match_count: matchCount,
          filter_env_id: "Birdseyeview",
          filter_project_key: projectKey,
        });

        if (error) continue;

        if (data && data.length > 0) {
          const bestMatch = data[0];
          return await this.getTicketById(bestMatch.ticket_key);
        }
      }

      // 3. Last resort: Global search without project filter if we haven't found anything
      const { data: globalData, error: globalError } = await supabase.rpc("match_ticket_embeddings", {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: matchCount,
        filter_env_id: "Birdseyeview",
        // No project filter here
      });

      if (!globalError && globalData && globalData.length > 0) {
        const bestMatch = globalData[0];
        return await this.getTicketById(bestMatch.ticket_key);
      }

      return null;
    } catch (err) {
      return null;
    }
  },

  /**
   * Extract project key (e.g. RAPTOR) from text
   */
  extractProjectKey(text) {
    if (!text) return null;
    const match = text.match(/([A-Z]+)-\d+/);
    return match ? match[1] : null;
  },
};
