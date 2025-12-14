import React, { useEffect, useState } from "react";
import { api } from "./api";
import "./App.css";

export default function App() {
  const [user, setUser] = useState("");
  const [token, setToken] = useState("");
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
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
      if (data.error) {
        throw new Error(data.error);
      }
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
    if (e.key === "Enter" && !loading) {
      load();
    }
  };

  if (!projects.length) {
    return (
      <div className="app-container">
        <div className="app-header">
          <div className="app-logo">
            🦊 GitLab MR AI Review
            <span className="app-subtitle">by AI</span>
          </div>
        </div>
        <div className="card fade-in">
          <div className="card-header">
            <h2 className="card-title">Connect to GitLab</h2>
            <p className="card-description">
              Enter your GitLab personal access token to get started
            </p>
          </div>

          {error && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠️</span>
              <div className="alert-content">
                <div className="alert-message">{error}</div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Username or Email</label>
            <input
              className="form-input"
              placeholder="Enter your GitLab username or email"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Personal Access Token <span className="required">*</span>
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
            <p className="help-text">
              Create a token at GitLab → Settings → Access Tokens with 'api'
              scope
            </p>
          </div>

          <button
            className="button button-primary button-full"
            onClick={load}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loader"></span>
                Loading Projects...
              </>
            ) : (
              "Load Projects"
            )}
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="app-container">
        <div className="app-header">
          <div className="app-logo">🦊 GitLab MR AI Review</div>
        </div>
        <div className="card fade-in">
          <div className="card-header">
            <h2 className="card-title">
              Select Project
              <span className="badge badge-info">
                {projects.length} available
              </span>
            </h2>
            <p className="card-description">
              Choose a project to create an AI-reviewed merge request
            </p>
          </div>

          <div className="project-list">
            {projects.map((p) => (
              <div
                key={p.id}
                className="project-item"
                onClick={() => setProject(p)}
              >
                <div className="project-icon">
                  {p.name ? p.name[0].toUpperCase() : "P"}
                </div>
                <div className="project-info">
                  <div className="project-name">{p.name}</div>
                  <div className="project-namespace">
                    {p.path_with_namespace}
                  </div>
                </div>
                <span>→</span>
              </div>
            ))}
          </div>

          <div className="divider"></div>

          <button
            className="button button-secondary button-full"
            onClick={() => {
              setProjects([]);
              setToken("");
              setUser("");
            }}
          >
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  return <MR token={token} project={project} onBack={() => setProject(null)} />;
}

function MR({ token, project, onBack }) {
  const [branches, setBranches] = useState([]);
  const [src, setSrc] = useState("");
  const [tgt, setTgt] = useState("");
  const [model, setModel] = useState("chatgpt");
  const [loading, setLoading] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [progress, setProgress] = useState([]);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    setLoadingBranches(true);
    try {
      const data = await api("/branches", { token, projectId: project.id });
      if (data.error) {
        throw new Error(data.error);
      }
      setBranches(data);
    } catch (err) {
      setError("Failed to load branches: " + err.message);
    } finally {
      setLoadingBranches(false);
    }
  };

  const create = async () => {
    if (!src || !tgt) {
      setError("Please select both source and target branches");
      return;
    }

    if (src === tgt) {
      setError("Source and target branches must be different");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setProgress([
      { id: 1, text: "Analyzing changes...", status: "active" },
      { id: 2, text: "Generating MR content...", status: "pending" },
      { id: 3, text: "Creating merge request...", status: "pending" },
      { id: 4, text: "Posting AI review comments...", status: "pending" },
    ]);

    try {
      // Simulate progress updates
      await new Promise((resolve) => setTimeout(resolve, 800));
      setProgress((p) =>
        p.map((s, i) =>
          i === 0
            ? { ...s, status: "complete" }
            : i === 1
            ? { ...s, status: "active" }
            : s
        )
      );

      await new Promise((resolve) => setTimeout(resolve, 1500));
      setProgress((p) =>
        p.map((s, i) =>
          i <= 1
            ? { ...s, status: "complete" }
            : i === 2
            ? { ...s, status: "active" }
            : s
        )
      );

      const result = await api("/mr", {
        token,
        projectId: project.id,
        model,
        mr: {
          source_branch: src,
          target_branch: tgt,
        },
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setProgress((p) =>
        p.map((s, i) =>
          i <= 2
            ? { ...s, status: "complete" }
            : i === 3
            ? { ...s, status: "active" }
            : s
        )
      );

      await new Promise((resolve) => setTimeout(resolve, 1000));

      setProgress((p) => p.map((s) => ({ ...s, status: "complete" })));

      setSuccess({
        message: "Merge request created and reviewed successfully!",
        iid: result.iid,
        url: result.web_url,
        comments: result.comments,
      });
    } catch (err) {
      setError(err.message || "Failed to create merge request");
      setProgress([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <div className="app-logo">🦊 GitLab MR AI Review</div>
      </div>

      <div className="card fade-in">
        <button
          className="button button-secondary back-button"
          onClick={onBack}
          disabled={loading}
        >
          ← Back to Projects
        </button>

        <div className="card-header">
          <h2 className="card-title">{project.name}</h2>
          <p className="card-description">{project.path_with_namespace}</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">❌</span>
            <div className="alert-content">
              <div className="alert-title">Error</div>
              <div className="alert-message">{error}</div>
            </div>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <span className="alert-icon">✅</span>
            <div className="alert-content">
              <div className="alert-title">{success.message}</div>
              <div className="alert-message">
                Merge Request #{success.iid} created
                {success.url && (
                  <>
                    {" · "}
                    <a
                      href={success.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="alert-link"
                    >
                      Open in GitLab →
                    </a>
                  </>
                )}
                {success.comments && (
                  <div style={{ marginTop: "8px", fontSize: "13px" }}>
                    📝 {success.comments.posted} of {success.comments.total} AI
                    comments posted
                    {success.comments.failed > 0 &&
                      ` (${success.comments.failed} failed)`}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {loading && progress.length > 0 && (
          <div className="progress-steps">
            {progress.map((step) => (
              <div key={step.id} className="progress-step">
                <div
                  className={`progress-step-icon progress-step-${step.status}`}
                >
                  {step.status === "complete" ? (
                    "✓"
                  ) : step.status === "active" ? (
                    <span className="loader loader-dark"></span>
                  ) : (
                    step.id
                  )}
                </div>
                <div className="progress-step-text">{step.text}</div>
              </div>
            ))}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">
            Source Branch <span className="required">*</span>
          </label>
          <select
            className="form-select"
            onChange={(e) => setSrc(e.target.value)}
            disabled={loading || loadingBranches}
            value={src}
          >
            <option value="">Select source branch</option>
            {branches.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
          <p className="help-text">The branch containing your changes</p>
        </div>

        <div className="form-group">
          <label className="form-label">
            Target Branch <span className="required">*</span>
          </label>
          <select
            className="form-select"
            onChange={(e) => setTgt(e.target.value)}
            disabled={loading || loadingBranches}
            value={tgt}
          >
            <option value="">Select target branch</option>
            {branches.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
          <p className="help-text">The branch to merge your changes into</p>
        </div>

        {src && tgt && src !== tgt && (
          <div className="branch-info">
            <span className="branch-icon">🔀</span>
            <strong>{src}</strong>
            <span className="branch-arrow">→</span>
            <strong>{tgt}</strong>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">AI Model</label>
          <select
            className="form-select"
            onChange={(e) => setModel(e.target.value)}
            disabled={loading}
            value={model}
          >
            <option value="chatgpt">ChatGPT (GPT-4)</option>
            <option value="gemini">Google Gemini</option>
          </select>
          <p className="help-text">Choose the AI model for code review</p>
        </div>

        <button
          className="button button-success button-full"
          onClick={create}
          disabled={loading || loadingBranches || !src || !tgt}
        >
          {loading ? (
            <>
              <span className="loader"></span>
              Creating Merge Request...
            </>
          ) : (
            <>🚀 Create & Review Merge Request</>
          )}
        </button>
      </div>
    </div>
  );
}
