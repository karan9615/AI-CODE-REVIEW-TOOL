import React, { useState } from "react";
import { LoginView } from "./components/auth/LoginView";
import { ProjectSelector } from "./components/projects/ProjectSelector";
import { MainApp } from "./components/layout/MainApp";
import { api } from "./utils/api";
import { ThemeProvider } from "./context/ThemeContext";

export default function App() {
  const [user, setUser] = useState("");
  const [token, setToken] = useState("");
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [view, setView] = useState("create");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    if (!token.trim()) {
      setError("Please enter a GitLab personal access token");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api("/projects", { token });
      if (data.error) throw new Error(data.error);
      setProjects(data);
    } catch (err) {
      setError(
        err.message || "Failed to load projects. Please check your token."
      );
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) load();
  };

  const logout = () => {
    setProjects([]);
    setProject(null);
    setToken("");
    setUser("");
    setView("create");
  };

  return (
    <ThemeProvider>
      {!projects.length ? (
        <LoginView
          user={user}
          setUser={setUser}
          token={token}
          setToken={setToken}
          loading={loading}
          error={error}
          load={load}
          handleKeyPress={handleKeyPress}
        />
      ) : !project ? (
        <ProjectSelector
          projects={projects}
          setProject={setProject}
          logout={logout}
        />
      ) : (
        <MainApp
          token={token}
          project={project}
          view={view}
          setView={setView}
          onBack={() => setProject(null)}
          logout={logout}
        />
      )}
    </ThemeProvider>
  );
}
