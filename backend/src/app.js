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
app.use(
  cors({
    origin: envConfig.clientUrl,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Body Parser with limits
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// Cookie Session (HTTP-Only)
app.use(
  cookieSession({
    name: "session",
    keys: [envConfig.sessionSecret],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: envConfig.nodeEnv === "production", // Only secure in production (HTTPS)
    httpOnly: true, // Prevents JS access
    sameSite: envConfig.nodeEnv === "production" ? "none" : "lax", // Needed for cross-site cookie if FE/BE are different domains
  })
);

// Prevent Parameter Pollution
app.use(hpp());

// Routes
app.use("/api", routes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

export default app;
