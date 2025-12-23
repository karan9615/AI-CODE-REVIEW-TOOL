export const api = async (path, body, method = "POST") => {
  try {
    const options = {
      method,
      headers: { "Content-Type": "application/json" },
    };

    if (method === "POST" && body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch("http://localhost:3001/api" + path, options);

    if (!response.ok) {
       const errorData = await response.json().catch(() => ({}));
       
       let errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
 
       // Handle structural details (common in GitLab/NestJS/Axios responses)
       if (errorData.details) {
          if (typeof errorData.details === 'string') {
             errorMessage = errorData.details;
          } else if (errorData.details.message) {
             errorMessage = Array.isArray(errorData.details.message)
                ? errorData.details.message.join('. ')
                : errorData.details.message;
          } else if (typeof errorData.details === 'object') {
              // Fallback for object-based details e.g. { field: ["error"] }
              const parts = [];
              Object.entries(errorData.details).forEach(([key, val]) => {
                 const valStr = Array.isArray(val) ? val.join(', ') : val;
                 parts.push(`${key}: ${valStr}`);
              });
              if (parts.length > 0) errorMessage = parts.join('. ');
          }
       }
 
       throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};
