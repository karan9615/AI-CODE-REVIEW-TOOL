import React from "react";
import { GitMerge, GitPullRequest, ArrowLeft, LogOut } from "lucide-react";
import { ThemeToggle } from "../common/ThemeToggle";
import { CreateMR } from "../mergeRequests/CreateMR";
import { ReviewMRs } from "../mergeRequests/ReviewMRs";
import { ProjectContextModal } from "../projects/ProjectContextModal";
import { motion, AnimatePresence } from "framer-motion";
import { Book } from "lucide-react";

export function MainApp({ project, view, setView, onBack, logout }) {
  const [isContextModalOpen, setIsContextModalOpen] = React.useState(false);

  const tabs = [
    { id: "create", label: "Create Request", icon: GitMerge },
    { id: "review", label: "Review Requests", icon: GitPullRequest },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-surface transition-colors duration-300">
      {/* Unified App Shell Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border-color min-h-[64px] flex flex-col justify-center shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none transition-colors duration-300">
        <div className="w-full px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Back / Context Navigation */}
            <div
              className="flex items-center gap-1 text-surface-muted hover:text-surface transition-colors cursor-pointer"
              onClick={onBack}
              title="Back to Projects"
            >
              <div className="p-2 rounded-full hover:bg-surface/5">
                <ArrowLeft size={20} />
              </div>
            </div>

            {/* Branding */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-primary text-white flex items-center justify-center font-medium text-sm shadow-sm md:hidden">
                {project.name.charAt(0).toUpperCase()}
              </div>
              <h1 className="text-lg font-medium text-surface tracking-tight truncate max-w-[200px] sm:max-w-md font-sans">
                {project.name}
              </h1>
            </div>

            {/* Separator */}
            <div className="hidden md:block h-6 w-[1px] bg-border-color/20 ml-4 mr-2"></div>

            {/* Desktop Navigation (Material Tabs) */}
            <nav className="hidden md:flex h-16 relative">
              {tabs.map((tab) => {
                const isActive = view === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setView(tab.id)}
                    className={`relative px-5 h-full flex items-center gap-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "text-primary"
                        : "text-surface-muted hover:text-surface hover:bg-surface/5"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-tab-indicator"
                        className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-full"
                        initial={false}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsContextModalOpen(true)}
              className="p-2 text-surface-muted hover:text-primary hover:bg-primary/10 rounded-full transition-colors relative"
              title="Project AI Context"
            >
              <Book size={20} />
              {/* Optional: Add a dot indicator if context exists via localStorage */}
              {localStorage.getItem(`ai_context_${project?.id}`) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
              )}
            </button>
            <div className="h-8 w-[1px] bg-border-color/20 mx-1"></div>
            <ThemeToggle />
            <div className="h-8 w-[1px] bg-border-color/20 mx-1"></div>
            <button
              onClick={logout}
              className="p-2 text-surface-muted hover:text-red-400 hover:bg-red-50 rounded-full transition-colors"
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className="md:hidden border-t border-border-color bg-background">
          <div className="flex">
            {tabs.map((tab) => {
              const isActive = view === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setView(tab.id)}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-surface-muted"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 relative z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {view === "create" ? (
              <div className="max-w-3xl mx-auto">
                <CreateMR project={project} />
              </div>
            ) : (
              <div className="max-w-4xl mx-auto">
                <ReviewMRs project={project} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <ProjectContextModal 
        isOpen={isContextModalOpen} 
        onClose={() => setIsContextModalOpen(false)} 
        project={project} 
      />
    </div>
  );
}
