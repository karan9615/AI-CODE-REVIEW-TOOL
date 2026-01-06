import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import morgan from "morgan";
import cookieSession from "cookie-session";
import routes from "./routes/index.js";
import envConfig from "../config/envConfig.js";

const app = express();

// TODO: Trust Proxy for Render/Heroku (Required for req.secure and rate limits)
app.set("trust proxy", 1);

// Secure Logger: Standard format but remove Authorization header from logs
morgan.token("remote-addr", (req) => {
  return req.headers["x-forwarded-for"] || req.socket.remoteAddress;
});
app.use(
  morgan(
    ":remote-addr - :method :url :status :res[content-length] - :response-time ms",
    {
      skip: (req) => req.url === "/api/health", // Optional: skip health checks
    }
  )
);

// Security Headers with Content Security Policy
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // For local dev
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api", limiter);

// Helper to normalize URLs (remove trailing slash)
const normalizeUrl = (url) => (url ? url.replace(/\/$/, "") : "");

// CORS - CRITICAL for cross-domain authentication
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      // Check if origin is allowed (handling trailing slashes)
      const allowedOrigin = normalizeUrl(envConfig.clientUrl);
      const requestOrigin = normalizeUrl(origin);

      if (requestOrigin === allowedOrigin) {
        callback(null, true);
      } else {
        console.warn(
          `CORS blocked: ${origin} (Expected: ${envConfig.clientUrl})`
        );
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true, // REQUIRED for cookies
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Set-Cookie"],
    maxAge: 86400, // Cache preflight for 24 hours
  })
);

// Body Parser with limits
app.use(express.json({ limit: "10kb" }));

// Cookie Session (HTTP-Only)
// For cross-domain cookies (Netlify -> Render), we need secure + sameSite=none
// NOTE: cookie-session handles cookie parsing internally - DO NOT use cookieParser()
const isProduction = envConfig.nodeEnv === "production";
const isCrossDomain =
  envConfig.clientUrl && !envConfig.clientUrl.includes("localhost");

// Custom middleware to set partitioned cookies for cross-domain
app.use(
  cookieSession({
    name: "session",
    keys: [envConfig.sessionSecret],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: true, // ALWAYS true for production (Render uses HTTPS)
    httpOnly: true, // Prevents JS access
    sameSite: isCrossDomain ? "none" : "lax", // 'none' required for cross-site cookies
    path: "/", // Explicit path
  })
);

// CRITICAL: Add Partitioned attribute for Chrome's third-party cookie restrictions
if (isCrossDomain) {
  app.use((req, res, next) => {
    const originalSetHeader = res.setHeader;
    res.setHeader = function (name, value) {
      if (name.toLowerCase() === "set-cookie") {
        // Add Partitioned attribute to Set-Cookie header (case-insensitive check)
        if (Array.isArray(value)) {
          value = value.map((cookie) => {
            const lowerCookie = cookie.toLowerCase();
            if (
              lowerCookie.includes("samesite=none") &&
              !lowerCookie.includes("partitioned")
            ) {
              return cookie + "; Partitioned";
            }
            return cookie;
          });
        } else if (typeof value === "string") {
          const lowerValue = value.toLowerCase();
          if (
            lowerValue.includes("samesite=none") &&
            !lowerValue.includes("partitioned")
          ) {
            value = value + "; Partitioned";
          }
        }
      }
      return originalSetHeader.call(this, name, value);
    };
    next();
  });
}

// Prevent Parameter Pollution
app.use(hpp());

// Health check endpoint with config info (for debugging)
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    config: {
      nodeEnv: envConfig.nodeEnv,
      clientUrl: envConfig.clientUrl,
      cookieSettings: {
        secure: true,
        sameSite: isCrossDomain ? "none" : "lax",
        isCrossDomain,
        isProduction,
        partitioned: isCrossDomain, // Partitioned attribute added for cross-domain
      },
    },
    debug: {
      hasSession: !!req.session,
      sessionToken: req.session?.token ? "SET" : "NOT_SET",
      requestOrigin: req.headers.origin || "NO_ORIGIN",
      cookieHeader: req.headers.cookie ? "PRESENT" : "MISSING",
    },
  });
});

// Routes
app.use("/api", routes);

// 404 Handler - Must be after all routes
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
    method: req.method,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Error:", {
    message: err.message,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });

  const statusCode = err.statusCode || 500;
  const response = {
    error: err.message || "Something went wrong!",
  };

  // Include stack trace in development
  if (envConfig.nodeEnv === "development" && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
});

export default app;
