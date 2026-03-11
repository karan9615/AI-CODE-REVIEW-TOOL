import React, { useState } from "react";
import { Sparkles, GitBranch } from "lucide-react";
import { Alert } from "../common/Alert";
import { Loader } from "../common/Loader";
import { motion } from "framer-motion";
import { ThemeToggle } from "../common/ThemeToggle";
import { useToast } from "../../context/ToastContext";

export function LoginView({ loading, error, onLogin }) {
  const [user, setUser] = useState("");
  const [token, setToken] = useState("");
  const [apiKey, setApiKey] = useState("");

  const { error: toastError } = useToast();

  React.useEffect(() => {
    if (error) {
      toastError(error);
    }
  }, [error, toastError]);

  const handleSubmit = () => {
    if (token) onLogin(user, token, apiKey);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) handleSubmit();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background transition-colors duration-300">
      {/* Theme Toggle - Absolute Top Right */}
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-accent-cyan/10 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000" />
        <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] bg-accent-pink/10 rounded-full mix-blend-screen filter blur-[80px] animate-blob animation-delay-4000" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md glass-panel rounded-3xl p-8 sm:p-12 relative z-10"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex p-4 bg-primary/10 rounded-2xl mb-6 shadow-glow border border-primary/20"
          >
            <Sparkles className="w-8 h-8 text-primary" />
          </motion.div>
          <h1 className="text-3xl font-bold mb-2 tracking-tight gradient-text">
            GitLab AI Review
          </h1>
          <p className="text-surface-muted font-medium">
            AI-powered code review for your merge requests
          </p>
        </div>

        {/* Error is now handled by ToastContext */}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-surface-muted mb-2 ml-1">
              Username or Email
            </label>
            <input
              className="input-field"
              placeholder="Enter your GitLab username"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-surface-muted mb-2 ml-1">
              Personal Access Token <span className="text-accent-pink">*</span>
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
            <p className="text-xs text-surface-muted/70 mt-2 ml-1">
              Create a token at GitLab → Settings → Access Tokens with 'api'
              scope
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-surface-muted mb-2 ml-1">
              AI API Key (Optional){" "}
              <span className="text-surface-muted/50 text-xs font-normal">
                - For your own billing
              </span>
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="Gemini/OpenAI API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <motion.button
            whileHover={{
              scale: 1.02,
              boxShadow: "0 0 20px rgba(124, 58, 237, 0.4)",
            }}
            whileTap={{ scale: 0.98 }}
            className={`w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-white font-semibold transition-all shadow-lg shadow-primary/20 border border-primary/50 relative overflow-hidden group ${
              loading
                ? "bg-primary/50 cursor-not-allowed"
                : "bg-primary hover:bg-primary-hover"
            }`}
            onClick={handleSubmit}
            disabled={loading}
          >
            {/* Button Shine Effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0 pointer-events-none" />

            <div className="relative z-10 flex items-center gap-2">
              {loading ? (
                <Loader size="sm" text="" />
              ) : (
                <>
                  <GitBranch className="w-5 h-5" />
                  Connect to GitLab
                </>
              )}
            </div>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
