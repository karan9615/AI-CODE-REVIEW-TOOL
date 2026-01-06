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

// CORS - CRITICAL for cross-domain authentication
app.use(
  cors({
    origin: envConfig.clientUrl,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true, // REQUIRED for cookies
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Set-Cookie"],
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

app.use(
  cookieSession({
    name: "session",
    keys: [envConfig.sessionSecret],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: isProduction || isCrossDomain, // Secure for production OR cross-domain (Render uses HTTPS)
    httpOnly: true, // Prevents JS access
    sameSite: isCrossDomain ? "none" : "lax", // 'none' required for cross-site cookies (Netlify <-> Render)
  })
);

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
        secure: isProduction || isCrossDomain,
        sameSite: isCrossDomain ? "none" : "lax",
        isCrossDomain,
        isProduction,
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
