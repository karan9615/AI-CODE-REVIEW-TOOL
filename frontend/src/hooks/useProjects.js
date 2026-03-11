import { useState, useEffect, useCallback } from "react";
import { api } from "../utils/api";
import { useToast } from "../context/ToastContext";

export const useProjects = (isAuthenticated, onAuthError) => {
  const toast = useToast();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination & Search
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");

  const loadProjects = useCallback(
    async (pageNum = 1, searchQuery = "", reset = false) => {
      // Prevent loading if not authenticated or already loading (debouncing done in UI)
      if (!isAuthenticated) return;

      setLoading(true);
      setError(null);
      try {
        const data = await api(
          "/projects",
          { page: pageNum, per_page: 20, search: searchQuery },
          "GET",
        );

        const newProjects = data.data || [];
        const pagination = data.pagination || {};

        setProjects((prev) =>
          reset ? newProjects : [...prev, ...newProjects],
        );
        setHasMore(!!pagination.nextPage);
        setPage(pageNum);
        setSearch(searchQuery);

        if (newProjects.length === 0 && pageNum === 1 && !searchQuery) {
          toast.warning(
            "No projects found. Make sure you have access to GitLab projects.",
          );
        }
      } catch (e) {
        console.error("Failed to load projects:", e);
        const errorMsg = e.message || "Failed to load projects";
        setError(errorMsg);
        toast.error(errorMsg);

        if (e.message?.includes("Unauthorized")) {
          if (onAuthError) onAuthError();
        }
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, toast, onAuthError],
  );

  // Initial load effect
  useEffect(() => {
    if (isAuthenticated && projects.length === 0) {
      loadProjects(1, "", true).catch(() => {});
    }
  }, [isAuthenticated, loadProjects, projects.length]);

  const handleSearch = useCallback(
    (query) => {
      loadProjects(1, query, true);
    },
    [loadProjects],
  );

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadProjects(page + 1, search, false);
    }
  }, [loading, hasMore, page, search, loadProjects]);

  // Reset state when auth changes (logout)
  useEffect(() => {
    if (!isAuthenticated) {
      setProjects([]);
      setPage(1);
      setSearch("");
      setHasMore(true);
    }
  }, [isAuthenticated]);

  return {
    projects,
    loading,
    error,
    hasMore,
    loadProjects,
    handleSearch,
    handleLoadMore,
  };
};
