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

  app.use(
    express.static(distPath, {
      setHeaders: (res, filePath) => {
        const base = path.basename(filePath);
        if (base === "sw.js" || base === "index.html" || base === "manifest.json" || base === "offline.html") {
          // Must always revalidate so new deployments and service workers roll out immediately
          res.setHeader("Cache-Control", "no-cache");
        } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );

  // fall through to index.html for non-API routes (SPA client-side routing)
  // IMPORTANT: Never intercept /api/* routes — those must be handled by Express
  app.use("*", (req: Request, res: Response) => {
    if (req.originalUrl.startsWith("/api/")) {
      return res.status(404).json({ message: `API route not found: ${req.originalUrl}` });
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
