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
      loadProjects();
    }
  }, [isAuthenticated]);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api("/projects", {}, "GET");
      const projectArray = Array.isArray(data) ? data : [];
      setProjects(projectArray);

      if (projectArray.length === 0) {
        toast.warning(
          "No projects found. Make sure you have access to GitLab projects."
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

  const handleLogin = async (username, token) => {
    setLoading(true);
    setError(null);
    try {
      const authResponse = await api("/auth/login", { token });

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
    setIsAuthenticated(false);
    setProjects([]);
    setProject(null);
    setView("create");
    setError(null);
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
          onRetry={loadProjects}
        />
      ) : (
        <MainApp
          project={project}
          view={view}
          setView={setView}
          onBack={() => setProject(null)}
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
