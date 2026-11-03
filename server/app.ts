import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { createServer } from "http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

console.log("App: Initializing Express app...");

const app = express();
const httpServer = createServer(app);

// Security headers. The strict CSP is production-only because the Vite dev server needs inline/eval scripts.
const isProduction = process.env.NODE_ENV === "production";
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: isProduction
      ? {
          useDefaults: false,
          directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
            "img-src": ["'self'", "data:", "blob:", "https:"],
            "connect-src": ["'self'"],
            "worker-src": ["'self'"],
            "manifest-src": ["'self'"],
            "object-src": ["'none'"],
            "base-uri": ["'self'"],
            "form-action": ["'self'", "https://accounts.google.com"],
            "frame-ancestors": ["'none'"],
          },
        }
      : false,
  }),
);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);
app.use(["/api/login", "/api/auth/google"], authLimiter);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      console.log(`${new Date().toLocaleTimeString()} [express] ${logLine}`);
    }
  });

  next();
});

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Initialization wrapper to ensure routes are registered only once
let initialized = false;
export async function initApp() {
  if (initialized) return app;
  
  console.log("App: Starting initialization (initApp)...");
  try {
    await registerRoutes(httpServer, app);
    console.log("App: Routes and Auth registered.");

    // Global Error Handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      // Never leak internal error details for server errors
      const message = status >= 500 ? "Internal Server Error" : (err.message || "Request failed");

      console.error("Global error handler:", {
        message: err.message,
        stack: err.stack,
        status,
        timestamp: new Date().toISOString()
      });

      res.status(status).json({ message });
    });

    initialized = true;
    return app;
  } catch (err) {
    console.error("App: Initialization failed!", err);
    throw err;
  }
}

export default app;
