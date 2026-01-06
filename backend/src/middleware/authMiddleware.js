export const validateToken = (req, res, next) => {
  // 1. Check HTTP-Only Cookies (Primary - Secure for production)
  let token = req.session?.token;

  // 2. Check Headers (Fallback - for API testing/cURL)
  if (!token) {
    token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  }

  // 3. Check Body (Fallback - for initial login)
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
