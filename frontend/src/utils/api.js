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

// Request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🚀 ${config.method.toUpperCase()} ${config.url}`, {
      data: config.data,
      params: config.params,
    });
    return config;
  },
  (error) => {
    console.error("Request error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for debugging and global error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(
      `✅ ${response.config.method.toUpperCase()} ${response.config.url}`,
      {
        status: response.status,
        data: response.data,
      }
    );
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(`❌ ${error.response.status} ${error.config.url}`, {
        error: error.response.data,
      });
    }
    return Promise.reject(error);
  }
);

/**
 * Standardized API wrapper
 * Uses HTTP-only cookies for authentication (withCredentials: true)
 */
export const api = async (path, body = {}, method = "POST") => {
  try {
    const response = await apiClient({
      method: method.toLowerCase(),
      url: path,
      data: method !== "GET" ? body : undefined,
      params: method !== "GET" ? body : undefined,
      headers: {},
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
