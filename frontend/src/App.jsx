import React, { useState } from "react";
import { LoginView } from "./components/auth/LoginView";
import { ProjectSelector } from "./components/projects/ProjectSelector";
import { MainApp } from "./components/layout/MainApp";
import { ThemeProvider } from "./context/ThemeContext";
import { ModelsProvider } from "./context/ModelsContext";
import { ToastProvider } from "./context/ToastContext";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { Loader } from "./components/common/Loader";
import { useAuth } from "./hooks/useAuth";
import { useProjects } from "./hooks/useProjects";

function AppContent() {
  const {
    isAuthenticated,
    loading: authLoading,
    error: authError,
    login,
    logout,
  } = useAuth();

  const [project, setProject] = useState(null);
  const [view, setView] = useState("create");

  // Handle Logout Wrapper to clear local state
  // Defined early to pass to useProjects for 401 handling
  const handleLogout = async () => {
    await logout();
    setProject(null);
    setView("create");
    window.location.href = "/";
  };

  const {
    projects,
    loading: projectsLoading,
    error: projectsError,
    hasMore,
    handleSearch,
    handleLoadMore,
    loadProjects,
  } = useProjects(isAuthenticated, handleLogout);

  // If initial auth check is running
  if (authLoading && !isAuthenticated && !authError) {
    // NOTE: useAuth sets loading=true initially.
    // We only want to show loader if we don't have a result yet.
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader size="lg" text="Checking authentication..." />
      </div>
    );
  }

  // Combined error from auth or projects (if critical)
  // For project errors, we might just show them within the selector

  return (
    <>
      {!isAuthenticated ? (
        <LoginView loading={authLoading} error={authError} onLogin={login} />
      ) : !project ? (
        <ProjectSelector
          projects={projects}
          loading={projectsLoading}
          error={projectsError}
          setProject={setProject}
          logout={handleLogout}
          onRetry={() => loadProjects(1, "", true)}
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
            // Optional: refresh projects when returning
            loadProjects(1, "", true);
          }}
          logout={handleLogout}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <ModelsProvider>
            <AppContent />
          </ModelsProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
