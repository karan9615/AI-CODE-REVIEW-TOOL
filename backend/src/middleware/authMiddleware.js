export const validateToken = (req, res, next) => {
  // 1. Check Cookies (Primary - Secure)
  let token = req.session?.token;

  // 2. Check Headers (Fallback - for cURL/Postman)
  if (!token) {
    token = req.headers.authorization?.split(" ")[1];
  }

  // 3. Check Body (Legacy/Fallback)
  if (!token) {
    token = req.body.token;
  }

  // Debug logging
  if (!token) {
    console.log("Auth failed:", {
      path: req.path,
      method: req.method,
      origin: req.headers.origin,
      hasSession: !!req.session,
      sessionKeys: req.session ? Object.keys(req.session) : [],
      sessionToken: req.session?.token ? "PRESENT" : "MISSING",
      cookieHeader: req.headers.cookie || "NONE",
      hasAuthHeader: !!req.headers.authorization,
    });
  }

  if (!token || typeof token !== "string") {
    return res.status(401).json({
      error: "Unauthorized: Valid GitLab Token required (Login first)",
    });
  }

  // Attach token to request object for downstream controllers
  req.token = token;
  next();
};
