import { useState, useEffect, useRef } from "react";
import { api } from "../utils/api";
import { useToast } from "../context/ToastContext";

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
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
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      console.warn("Session check failed", e);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  /* import useToast MUST be added at the top */
  const toast = useToast();

  const login = async (username, token, apiKey) => {
    setLoading(true);
    setError(null);
    try {
      const authResponse = await api("/auth/login", { token, apiKey });

      if (authResponse.success) {
        setIsAuthenticated(true);
        setUser(authResponse.user);
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
  };

  return { isAuthenticated, user, loading, error, login, logout, checkSession };
};
