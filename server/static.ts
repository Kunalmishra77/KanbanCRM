import express, { type Express, type Request, type Response } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html for non-API routes (SPA client-side routing)
  // IMPORTANT: Never intercept /api/* routes — those must be handled by Express
  app.use("*", (req: Request, res: Response) => {
    if (req.originalUrl.startsWith("/api/")) {
      return res.status(404).json({ message: `API route not found: ${req.originalUrl}` });
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
