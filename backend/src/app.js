import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import morgan from "morgan";
import cookieSession from "cookie-session";
import cookieParser from "cookie-parser";
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

// CORS
const corsOptions = {
  origin: envConfig.clientUrl,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

console.log("=== CORS Configuration ===");
console.log(`Allowed Origin: ${corsOptions.origin}`);
console.log(`Credentials: ${corsOptions.credentials}`);
console.log("==========================");

app.use(cors(corsOptions));

// Body Parser with limits
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// Cookie Session (HTTP-Only)
// For cross-domain cookies (Netlify -> Render), we need secure + sameSite=none
const isProduction = envConfig.nodeEnv === "production";
const isCrossDomain = envConfig.clientUrl && !envConfig.clientUrl.includes("localhost");

const cookieSessionConfig = {
  name: "session",
  keys: [envConfig.sessionSecret],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  secure: isProduction || isCrossDomain, // Secure for production OR cross-domain (Render uses HTTPS)
  httpOnly: true, // Prevents JS access
  sameSite: isCrossDomain ? "none" : "lax", // 'none' required for cross-site cookies (Netlify <-> Render)
};

console.log("=== Cookie Session Configuration ===");
console.log(`Environment: ${envConfig.nodeEnv}`);
console.log(`Is Production: ${isProduction}`);
console.log(`Is Cross-Domain: ${isCrossDomain}`);
console.log(`Cookie Secure: ${cookieSessionConfig.secure}`);
console.log(`Cookie SameSite: ${cookieSessionConfig.sameSite}`);
console.log(`Cookie HttpOnly: ${cookieSessionConfig.httpOnly}`);
console.log(`Cookie MaxAge: ${cookieSessionConfig.maxAge / 1000 / 60 / 60} hours`);
console.log("====================================");

app.use(cookieSession(cookieSessionConfig));

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
  });
});

// Routes
app.use("/api", routes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

export default app;
