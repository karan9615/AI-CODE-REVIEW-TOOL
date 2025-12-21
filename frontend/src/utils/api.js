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
      throw new Error(
        errorData.error || errorData.message || `HTTP ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};
