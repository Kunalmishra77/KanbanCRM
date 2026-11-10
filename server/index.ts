import 'dotenv/config';
import app, { initApp } from "./app.js";
import { serveStatic } from "./static.js";
import { createServer } from "http";
import { startDeadlineScheduler } from "./emailService.js";
import { startRecurringScheduler } from "./lib/recurring.js";

console.log("Server: index.ts loaded");

// One HTTP server for everything, so Vite's HMR websocket attaches to the server that actually listens
const httpServer = createServer(app);

(async () => {
  try {
    // Initialize routes and auth
    await initApp();

    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      // In Dev, we need to setup Vite
      // This is dynamic to avoid loading Vite in production
      const { setupVite } = await import("./vite.js");
      await setupVite(httpServer, app);
    }

    if (process.env.NODE_ENV !== "test") {
      const port = parseInt(process.env.PORT || "5000", 10);
      httpServer.listen(port, "0.0.0.0", () => {
        console.log(`${new Date().toLocaleTimeString()} [express] serving on port ${port}`);
        startDeadlineScheduler();
        startRecurringScheduler();
      });
    }
  } catch (err) {
    console.error("Server: CRITICAL STARTUP ERROR!", err);
    throw err;
  }
})();

export default app;
