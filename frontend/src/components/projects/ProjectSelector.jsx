import React, { useState } from "react";
import { Header } from "../common/Header";
import { ProjectCard } from "./ProjectCard";
import { Search } from "lucide-react";
import { motion } from "framer-motion";

export function ProjectSelector({ projects, setProject, logout }) {
  const [search, setSearch] = useState("");

  const filtered = projects.filter(
    (p) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.path_with_namespace?.toLowerCase().includes(search.toLowerCase())
  );

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

        <div className="mb-10 relative max-w-xl z-10">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-muted">
            <Search size={20} />
          </div>
          <input
            className="w-full pl-12 pr-4 py-4 bg-background-secondary/50 border border-border-color/10 rounded-2xl shadow-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all outline-none text-surface placeholder:text-surface-muted/50 backdrop-blur-md"
            placeholder="Search projects by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10"
        >
          {filtered.map((p, index) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ProjectCard project={p} onClick={() => setProject(p)} />
            </motion.div>
          ))}
        </motion.div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-surface-muted">
            No projects found matching "{search}"
          </div>
        )}

        {/* Background ambient light */}
        <div className="fixed top-20 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
        <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-accent-cyan/5 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      </main>
    </div>
  );
}
