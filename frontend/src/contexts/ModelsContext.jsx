import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../utils/api";

const ModelsContext = createContext();

/**
 * Models Provider - Fetches AI models once per session
 * This prevents unnecessary API calls when switching between tabs
 */
export function ModelsProvider({ children }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadModels();
  }, []); // Only run once on mount

  const loadModels = async () => {
    try {
      setLoading(true);
      const data = await api("/config/models", null, "GET");

      if (data && Array.isArray(data)) {
        setModels(data.map((m) => ({ label: m.label, value: m.key })));
        console.log(`✅ Loaded ${data.length} AI models`);
      } else {
        throw new Error("Invalid models data received");
      }
    } catch (err) {
      console.error("Failed to load AI models:", err.message);
      setError(err.message);

      // Fallback to default models if API fails
      setModels([
        { label: "GPT-4 (gpt-4) - Most Capable", value: "gpt-4" },
        { label: "Gemini Pro (gemini-2.5-flash) - Balanced", value: "gemini-pro" },
      ]);
      console.warn("Using fallback models");
    } finally {
      setLoading(false);
    }
  };

  const value = {
    models,
    loading,
    error,
    refetch: loadModels, // Allow manual refetch if needed
  };

  return (
    <ModelsContext.Provider value={value}>
      {children}
    </ModelsContext.Provider>
  );
}

/**
 * Hook to access AI models
 * @returns {{ models: Array, loading: boolean, error: string|null, refetch: Function }}
 */
export function useModels() {
  const context = useContext(ModelsContext);

  if (!context) {
    throw new Error("useModels must be used within ModelsProvider");
  }

  return context;
}
