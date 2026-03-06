import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

console.log("Server: index.ts initialization started");
console.log("Server Environment Check:", {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL: !!process.env.VERCEL,
  PORT: process.env.PORT,
  DATABASE_URL: !!process.env.DATABASE_URL ? "PRESENT" : "MISSING",
  SESSION_SECRET: !!process.env.SESSION_SECRET ? "PRESENT" : "MISSING",
  GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID ? "PRESENT" : "MISSING",
  GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET ? "PRESENT" : "MISSING"
});

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: '50mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '50mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// Add a simple health check endpoint to debug environment variables safely
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Server is running",
    environment: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      SESSION_SECRET: !!process.env.SESSION_SECRET,
      VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      VERCEL: !!process.env.VERCEL,
      NODE_ENV: process.env.NODE_ENV
    }
  });
});

(async () => {
  try {
    console.log("Server: Registering routes...");
    await registerRoutes(httpServer, app);
    console.log("Server: Routes registered successfully.");

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // CRITICAL: Log full error to Vercel Logs
      console.error("VERCEL GLOBAL ERROR HANDLER:", {
        message: err.message,
        stack: err.stack,
        status,
        timestamp: new Date().toISOString()
      });

      res.status(status).json({ message });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (process.env.NODE_ENV === "production") {
      // Only serve static files manually if NOT on Vercel
      // Vercel handles static assets automatically from the dist/public folder
      if (!process.env.VERCEL) {
        serveStatic(app);
      }
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    // ONLY listen if not running in a serverless environment like Vercel
    if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
      const port = parseInt(process.env.PORT || "5000", 10);
      httpServer.listen(
        {
          port,
          host: "0.0.0.0",
        },
        () => {
          log(`serving on port ${port}`);
        },
      );
    }
  } catch (err) {
    console.error("Server: CRITICAL STARTUP ERROR (inner):", err);
    throw err;
  }
})().catch(err => {
  console.error("Server: CRITICAL STARTUP ERROR (outer):", err);
});

export default app;
