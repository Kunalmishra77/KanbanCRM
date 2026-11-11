// Live updates: every open tab keeps one Server-Sent Events connection. Whenever anyone saves
// something, every tab is told "something changed" and refetches what it is showing.
import type { Request, Response, NextFunction } from "express";

const clients = new Set<Response>();
let pending: NodeJS.Timeout | null = null;

/** GET /api/events (signed-in only): the stream itself. */
export function eventsHandler(req: Request, res: Response) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    // no-transform keeps the compression middleware from buffering the stream
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write("retry: 5000\n\n");
  clients.add(res);
  const ping = setInterval(() => res.write(": ping\n\n"), 25_000);
  req.on("close", () => {
    clearInterval(ping);
    clients.delete(res);
  });
}

/** Tell every open tab that data changed (bursts of saves are folded into one message). */
export function broadcastChange() {
  if (pending) return;
  pending = setTimeout(() => {
    pending = null;
    const msg = `event: change\ndata: ${Date.now()}\n\n`;
    clients.forEach((res) => {
      try {
        res.write(msg);
      } catch {
        clients.delete(res);
      }
    });
  }, 300);
}

/** Middleware: any successful write to the API (POST/PATCH/PUT/DELETE) triggers a broadcast. */
export function broadcastOnWrite(req: Request, res: Response, next: NextFunction) {
  if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
    res.on("finish", () => {
      if (res.statusCode < 400) broadcastChange();
    });
  }
  next();
}
