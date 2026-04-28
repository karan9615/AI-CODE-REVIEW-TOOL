import { useState, useEffect, useRef } from "react";
import { api } from "../utils/api";
import { useToast } from "../context/ToastContext";

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [aiProvider, setAiProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasCheckedSession = useRef(false);

  // Check session on mount (only once)
  useEffect(() => {
    if (!hasCheckedSession.current) {
      checkSession();
      hasCheckedSession.current = true;
    }
  }, []);

  const checkSession = async () => {
    setLoading(true);
    try {
      const data = await api("/auth/check", {}, "GET");
      if (data.authenticated) {
        setIsAuthenticated(true);
        setAiProvider(data.aiProvider);
      } else {
        setIsAuthenticated(false);
        setAiProvider(null);
      }
    } catch (e) {
      console.warn("Session check failed", e);
      setIsAuthenticated(false);
      setAiProvider(null);
    } finally {
      setLoading(false);
    }
  };

  /* import useToast MUST be added at the top */
  const toast = useToast();

  const login = async (token, apiKey, provider) => {
    setLoading(true);
    setError(null);
    try {
      const authResponse = await api("/auth/login", { token, apiKey, provider });

      if (authResponse.success) {
        setIsAuthenticated(true);
        setUser(authResponse.user);
        setAiProvider(provider);
        toast.success("Successfully logged in!");

        return true;
      }
      const msg = "Login failed. Please check your token.";
      setError(msg);
      toast.error(msg);
      return false;
    } catch (err) {
      const msg = err.message || "Login failed";
      setError(msg);
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api("/auth/logout", {});
    } catch (e) {
      console.error(e);
    }
    setIsAuthenticated(false);
    setUser(null);
    setAiProvider(null);
  };

  return { isAuthenticated, user, aiProvider, loading, error, login, logout, checkSession };
};
