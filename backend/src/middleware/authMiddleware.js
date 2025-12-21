export const validateToken = (req, res, next) => {
  if (!req.body.token || typeof req.body.token !== "string") {
    // Also allow token in query param or headers if we shift to GET requests later, but for now stick to body
    // actually standard practice is header, but let's keep current behavior for now to not break FE
    return res.status(400).json({ error: "Valid token is required" });
  }
  next();
};
