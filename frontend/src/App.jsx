import React, { useState, useEffect } from "react";
import { LoginView } from "./components/auth/LoginView";
import { ProjectSelector } from "./components/projects/ProjectSelector";
import { MainApp } from "./components/layout/MainApp";
import { api } from "./utils/api";
import { ThemeProvider } from "./context/ThemeContext";
import { ModelsProvider } from "./contexts/ModelsContext";
import { ToastProvider, useToast } from "./context/ToastContext";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { Loader } from "./components/common/Loader";

function AppContent() {
  const toast = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [view, setView] = useState("create");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    setIsCheckingAuth(true);
    try {
      const data = await api("/auth/check", {}, "GET");
      if (data.authenticated) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      console.warn("Session check failed", e);
      setIsAuthenticated(false);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // Load projects when authenticated
  useEffect(() => {
    if (isAuthenticated && projects.length === 0) {
      loadProjects(1, "", true);
    }
  }, [isAuthenticated]);

  const loadProjects = async (pageNum = 1, searchQuery = "", reset = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api(
        "/projects",
        { page: pageNum, per_page: 20, search: searchQuery },
        "GET",
      );

      // Backend now returns { data: [], pagination: {} }
      const newProjects = data.data || [];
      const pagination = data.pagination;

      if (reset) {
        setProjects(newProjects);
      } else {
        setProjects((prev) => [...prev, ...newProjects]);
      }

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
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query) => {
    // Debounce is handled in UI or here? Using simple fetch for now
    loadProjects(1, query, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadProjects(page + 1, search, false);
    }
  };

  const handleLogin = async (username, token, apiKey) => {
    setLoading(true);
    setError(null);
    try {
      // Send apiKey to backend to be stored in Secure HTTP-Only Cookie
      const authResponse = await api("/auth/login", { token, apiKey });

      if (authResponse.success) {
        setIsAuthenticated(true);
        toast.success("Successfully logged in!");
        // Projects will load automatically via useEffect
      } else {
        const msg = "Login failed. Please check your token.";
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api("/auth/logout", {}, "POST");
      toast.info("Logged out successfully");
    } catch (e) {
      console.error(e);
    }
    // Force a hard reload to clear all state and prevent any stale session loops
    window.location.href = "/";
  };

  // Show initial loading screen
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader size="lg" text="Checking authentication..." />
      </div>
    );
  }

  return (
    <ModelsProvider>
      {!isAuthenticated ? (
        <LoginView loading={loading} error={error} onLogin={handleLogin} />
      ) : !project ? (
        <ProjectSelector
          projects={projects}
          loading={loading}
          error={error}
          setProject={setProject}
          logout={handleLogout}
          onRetry={() => loadProjects(1, search, true)}
          onSearch={handleSearch}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
        />
      ) : (
        <MainApp
          project={project}
          view={view}
          setView={setView}
          onBack={() => {
            setProject(null);
            // Reset to full list when going back
            loadProjects(1, "", true);
          }}
          logout={handleLogout}
        />
      )}
    </ModelsProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
