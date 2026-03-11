import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../utils/api";
import { useToast } from "./ToastContext";

const ModelsContext = createContext();

/**
 * Models Provider - Fetches AI models once per session
 * This prevents unnecessary API calls when switching between tabs
 */
export function ModelsProvider({ children }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { error: toastError } = useToast();

  useEffect(() => {
    loadModels(true);
  }, []); // Only run once on mount

  const loadModels = async (isInitial = false) => {
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
      if (!isInitial) {
        toastError(err.message || "Failed to load models");
      }

      // Fallback to default models if API fails
      setModels([
        {
          label: "Gemini Pro (gemini-2.5-flash) - Balanced",
          value: "gemini-pro",
        },
        {
          label: "Gemini 2.5 Pro (gemini-2.5-pro) - Adv Free Tier",
          value: "gemini-2.5-pro",
        },
        {
          label: "Gemini 2.5 Flash (gemini-2.5-flash) - Free Tier Fast",
          value: "gemini-2.5-flash",
        },
        {
          label:
            "Gemini 2.5 Flash Lite (gemini-2.5-flash-lite) - Free Tier Lightweight",
          value: "gemini-2.5-flash-lite",
        },
        {
          label: "Gemini 1.5 Pro (gemini-1.5-pro) - Powerful",
          value: "gemini-1.5-pro",
        },
        {
          label: "Gemini 2.0 Flash (gemini-2.0-flash) - Next Gen Fast",
          value: "gemini-2.0-flash",
        },
        {
          label: "Gemini 3.1 Flash Lite (gemini-3.1-flash-lite-preview) - Recommended Free Tier",
          value: "gemini-3.1-flash-lite-preview",
        },
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
    <ModelsContext.Provider value={value}>{children}</ModelsContext.Provider>
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
