import axios from "axios";

/**
 * Creates an Axios instance with base configuration
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001/api",
  withCredentials: true, // IMPORTANT: Allows sending secure cookies
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Standardized API wrapper
 * Automatically handles token extraction and error parsing
 */
export const api = async (path, body = {}, method = "POST") => {
  try {
    // Security: Move token to Authorization header if explicitly passed (e.g. login)
    const headers = {};
    let data = body;

    if (data && data.token) {
      // Use token passed in body (mostly for Login or manual overrides)
      headers["Authorization"] = `Bearer ${data.token}`;
    }

    const response = await apiClient({
      method: method.toLowerCase(),
      url: path,
      data: method !== "GET" ? data : undefined,
      params: method === "GET" ? data : undefined,
      headers,
    });

    return response.data;
  } catch (error) {
    console.error("API Error:", error);

    // Standardize error message extraction
    let errorMessage = "An unknown error occurred";

    if (error.response) {
      // The request was made and the server responded with a status code outside of 2xx
      const errorData = error.response.data || {};
      errorMessage =
        errorData.error || errorData.message || `HTTP ${error.response.status}`;

      // Handle structural details (common in GitLab/NestJS/Axios responses)
      if (errorData.details) {
        if (typeof errorData.details === "string") {
          errorMessage = errorData.details;
        } else if (errorData.details.message) {
          errorMessage = Array.isArray(errorData.details.message)
            ? errorData.details.message.join(". ")
            : errorData.details.message;
        } else if (typeof errorData.details === "object") {
          const parts = [];
          Object.entries(errorData.details).forEach(([key, val]) => {
            const valStr = Array.isArray(val) ? val.join(", ") : val;
            parts.push(`${key}: ${valStr}`);
          });
          if (parts.length > 0) errorMessage = parts.join(". ");
        }
      }
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = "No response from server. Please check your connection.";
    } else {
      // Something happened in setting up the request
      errorMessage = error.message;
    }

    throw new Error(errorMessage);
  }
};
