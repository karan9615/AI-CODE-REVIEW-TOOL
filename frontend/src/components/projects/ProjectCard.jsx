import React from "react";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export function ProjectCard({ project, onClick }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="glass-panel p-5 rounded-2xl cursor-pointer hover:border-primary/30 hover:shadow-[0_0_20px_rgba(124,58,237,0.1)] transition-all duration-300 group relative overflow-hidden"
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex justify-between items-center mb-4">
          <div className="w-12 h-12 bg-background-tertiary rounded-xl flex items-center justify-center text-xl font-bold text-primary group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300 border border-white/5 group-hover:border-primary/30">
            {project.name ? project.name[0].toUpperCase() : "P"}
          </div>
          <div className="p-2 rounded-full text-surface-muted group-hover:text-surface group-hover:bg-background-secondary transition-colors">
            <ChevronRight size={20} />
          </div>
        </div>
        <h3 className="text-lg font-bold text-surface mb-1 group-hover:text-primary-light transition-colors">{project.name}</h3>
        <p className="text-sm text-surface-muted truncate group-hover:text-surface/80 transition-colors">{project.path_with_namespace}</p>
      </div>

      {/* Decorative gradient blob on hover */}
      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-primary/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </motion.div>
  );
}
