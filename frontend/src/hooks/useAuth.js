import { useState, useEffect, useRef } from "react";
import { api } from "../utils/api";

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

  const login = async (token) => {
    setLoading(true);
    setError(null);
    try {
      const authResponse = await api("/auth/login", { token });
      if (authResponse.success) {
        setIsAuthenticated(true);
        setUser(authResponse.user);
        return true;
      }
      setError("Login failed");
      return false;
    } catch (err) {
      setError(err.message || "Login failed");
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
