console.log("Vercel API: Entry point loaded");
import app, { initApp } from "../server/app.js";

// Vercel serverless function handler
export default async (req: any, res: any) => {
  try {
    // Ensure app is initialized (routes registered, etc.)
    await initApp();
    
    // Pass the request to the Express app
    return app(req, res);
  } catch (err) {
    console.error("Vercel API: Error handling request:", err);
    res.status(500).json({ error: "Internal Server Error during initialization" });
  }
};
