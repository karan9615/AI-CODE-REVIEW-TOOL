export const validateToken = (req, res, next) => {
  let token = null;
  let tokenSource = null;

  // 1. Check Cookies (Primary - Secure)
  if (req.session?.token) {
    token = req.session.token;
    tokenSource = "cookie-session";
  }

  // 2. Check Headers (Fallback - for cURL/Postman)
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
      tokenSource = "authorization-header";
    }
  }

  // 3. Check Body (Legacy/Fallback)
  if (!token && req.body.token) {
    token = req.body.token;
    tokenSource = "request-body";
  }

  // Log authentication attempt details
  const logDetails = {
    method: req.method,
    path: req.path,
    hasSessionCookie: !!req.session?.token,
    hasAuthHeader: !!req.headers.authorization,
    hasBodyToken: !!req.body.token,
    tokenSource: tokenSource,
    tokenFound: !!token,
    origin: req.headers.origin || "none",
    referer: req.headers.referer || "none",
  };

  if (!token || typeof token !== "string") {
    console.log("❌ Authentication failed:", JSON.stringify(logDetails, null, 2));
    return res
      .status(401)
      .json({
        error: "Unauthorized: Valid GitLab Token required (Login first)",
        debug: {
          tokenSource: tokenSource || "none",
          hint: !req.session?.token
            ? "Session cookie not found. Ensure cookies are enabled and CORS is configured correctly."
            : "Invalid token format",
        },
      });
  }

  console.log("✅ Authentication successful:", JSON.stringify(logDetails, null, 2));

  // Attach token to request object for downstream controllers
  req.token = token;
  next();
};
