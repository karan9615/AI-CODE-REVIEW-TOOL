import React, { useState, useEffect } from "react";
import { Header } from "../common/Header";
import { ProjectCard } from "./ProjectCard";
import { Search, RefreshCw, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Loader } from "../common/Loader";
import { Alert } from "../common/Alert";
import { Button } from "../ui/Button";
import { useToast } from "../../context/ToastContext";

export function ProjectSelector({
  projects,
  loading,
  error,
  setProject,
  logout,
  onRetry,
  onSearch,
  onLoadMore,
  hasMore,
}) {
  const [searchValue, setSearchValue] = useState("");
  const observerTarget = React.useRef(null);

  const { error: toastError } = useToast();

  useEffect(() => {
    if (error) {
      toastError(error);
    }
  }, [error, toastError]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearch) onSearch(searchValue);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchValue]); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          if (onLoadMore) onLoadMore();
        }
      },
      { threshold: 1.0 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loading, onLoadMore]);

  return (
    <div className="min-h-screen bg-background pb-12 transition-colors duration-300">
      <Header title="GitLab AI Review" onLogout={logout} showThemeToggle />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12 text-center sm:text-left relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-surface mb-2 tracking-tight"
          >
            Select Project
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-surface-muted text-lg"
          >
            Choose a project to create or review merge requests
          </motion.p>
        </div>

        {/* Persistent inline error — toast auto-dismisses but errors should stay visible */}
        {error && (
          <div className="mb-8 max-w-xl">
            <Alert type="error">
              <div className="flex flex-col gap-1">
                <span className="font-semibold">Failed to load projects</span>
                <span className="text-sm opacity-90">{error}</span>
              </div>
            </Alert>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-10 relative max-w-xl z-10">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-muted">
            <Search size={20} />
          </div>
          <input
            className="w-full pl-12 pr-4 py-4 bg-background-secondary/50 border border-border-color/10 rounded-2xl shadow-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all outline-none text-surface placeholder:text-surface-muted/50 backdrop-blur-md"
            placeholder="Search projects by name..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>

        {/* Projects Grid */}
        {projects.length === 0 && !loading ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24 px-4 rounded-3xl border border-dashed border-border-color/30 bg-background-secondary/30 backdrop-blur-sm max-w-2xl mx-auto mt-10"
          >
            <div className="w-24 h-24 mb-6 bg-gradient-to-tr from-background-tertiary to-background-secondary rounded-full flex items-center justify-center shadow-lg shadow-black/5 ring-1 ring-white/10 group">
              <Search
                size={40}
                className="text-surface-muted/50 group-hover:text-primary/50 transition-colors duration-500"
              />
            </div>
            <h3 className="text-2xl font-bold text-surface mb-3 tracking-tight">
              No Projects Found
            </h3>
            <p className="text-surface-muted mb-8 text-center max-w-sm leading-relaxed">
              {searchValue ? (
                <span>
                  We couldn't find any projects matching{" "}
                  <strong className="text-surface">"{searchValue}"</strong>. Try
                  a different term.
                </span>
              ) : (
                "You don't have access to any GitLab projects with sufficient permissions."
              )}
            </p>
            <Button
              onClick={onRetry}
              disabled={loading}
              icon={RefreshCw}
              size="lg"
              className="shadow-xl shadow-primary/20"
            >
              Refresh Projects
            </Button>
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10"
            >
              {projects.map((p, index) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                >
                  <ProjectCard project={p} onClick={() => setProject(p)} />
                </motion.div>
              ))}
            </motion.div>

            {/* Loading / Sentinel */}
            <div
              ref={observerTarget}
              className="h-20 flex items-center justify-center w-full mt-8"
            >
              {loading && (
                <Loader
                  size="md"
                  text={
                    projects.length === 0
                      ? "Loading projects..."
                      : "Loading more projects..."
                  }
                />
              )}
              {!hasMore && projects.length > 0 && (
                <p className="text-surface-muted/50 text-sm">
                  No more projects
                </p>
              )}
            </div>
          </>
        )}

        {/* Background ambient light */}
        <div className="fixed top-20 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
        <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-accent-cyan/5 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      </main>
    </div>
  );
}
