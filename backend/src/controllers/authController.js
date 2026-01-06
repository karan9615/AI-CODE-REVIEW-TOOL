import { client } from "../gitlab/gitlabClient.js";

/**
 * Login: Validates token with GitLab and sets a secure HTTP-only cookie.
 */
export const login = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  try {
    // 1. Validate token by fetching user profile
    const user = await client(token).get("/user");

    // 2. Set token in HTTP-Only Session Cookie
    req.session.token = token;

    // Log for debugging
    console.log("Login successful:", {
      userId: user.data.id,
      username: user.data.username,
      sessionToken: req.session.token.substring(0, 20) + "...",
      sessionIsNew: req.session.isNew,
    });

    // 3. Return user info (BUT NOT THE TOKEN)
    res.json({
      success: true,
      user: {
        id: user.data.id,
        username: user.data.username,
        name: user.data.name,
        avatar_url: user.data.avatar_url,
      },
      message: "Login successful. Session secure.",
    });
  } catch (error) {
    console.error("Login failed:", error.message);
    res.status(401).json({ error: "Invalid GitLab Token" });
  }
};

/**
 * Logout: Destroys the session cookie.
 */
export const logout = (req, res) => {
  req.session = null;
  res.json({ success: true, message: "Logged out successfully" });
};

/**
 * Check Auth: Verifies if a valid session exists.
 */
export const checkAuth = (req, res) => {
  if (req.session?.token) {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
};
