import 'dotenv/config';
import app, { initApp } from "./app";
import { serveStatic } from "./static";

console.log("Server: index.ts loaded");

(async () => {
  try {
    // Initialize routes and auth
    await initApp();

    if (process.env.NODE_ENV === "production") {
      // Static serving only if not on Vercel
      if (!process.env.VERCEL) {
        serveStatic(app);
      }
    } else {
      // In Dev, we need to setup Vite
      // This is dynamic to avoid loading Vite in production
      const { setupVite } = await import("./vite");
      const { createServer } = await import("http");
      const httpServer = createServer(app);
      await setupVite(httpServer, app);
    }

    // Only start server manually if NOT on Vercel
    if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
      const port = parseInt(process.env.PORT || "5000", 10);
      app.listen(port, "0.0.0.0", () => {
        console.log(`${new Date().toLocaleTimeString()} [express] serving on port ${port}`);
      });
    }
  } catch (err) {
    console.error("Server: CRITICAL STARTUP ERROR!", err);
    throw err;
  }
})();

export default app;
