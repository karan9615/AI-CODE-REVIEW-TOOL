import React from "react";
import { GitMerge, GitPullRequest } from "lucide-react";
import { Header } from "../common/Header";
import { CreateMR } from "../mergeRequests/CreateMR";
import { ReviewMRs } from "../mergeRequests/ReviewMRs";
import { motion, AnimatePresence } from "framer-motion";

export function MainApp({ token, project, view, setView, onBack, logout }) {
  const tabs = [
    { id: "create", label: "Create MR", icon: GitMerge },
    { id: "review", label: "Review MRs", icon: GitPullRequest },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-surface transition-colors duration-300">
      <Header
        title={project.name}
        onBack={onBack}
        onLogout={logout}
        showBackButton
        showThemeToggle
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <div className="flex gap-8 mb-10 border-b border-border-color dark:border-white/10 relative">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = view === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={`relative flex items-center gap-2 pb-4 text-sm font-medium transition-colors outline-none ${isActive ? "text-primary" : "text-surface-muted hover:text-surface"
                  }`}
              >
                <Icon size={18} />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary via-accent-pink to-primary shadow-[0_0_15px_rgba(124,58,237,0.5)] z-10"
                  />
                )}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {view === "create" ? (
              <CreateMR token={token} project={project} />
            ) : (
              <ReviewMRs token={token} project={project} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
