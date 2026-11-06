import session from "express-session";

type Entry = { at: number; data: session.SessionData };

/**
 * Wraps a slow (remote) session store with a small in-memory cache.
 *
 * Every API call reads the session, and express-session also "touches" it before the response ends.
 * With the database ~150ms away that added 300ms+ to every request. Here reads are served from memory
 * for a short while and touches are throttled and sent in the background. Writes and logouts still go to
 * the real store immediately, so sessions stay shared and survive restarts.
 */
export class CachedSessionStore extends session.Store {
  private cache = new Map<string, Entry>();
  private lastTouch = new Map<string, number>();

  constructor(
    private inner: session.Store,
    private readTtlMs = 30_000,
    private touchEveryMs = 10 * 60_000,
    private maxEntries = 2000,
  ) {
    super();
  }

  private remember(sid: string, data: session.SessionData) {
    if (this.cache.size >= this.maxEntries) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) {
        this.cache.delete(oldest);
        this.lastTouch.delete(oldest);
      }
    }
    // Stored as JSON so callers can never mutate the cached copy
    this.cache.set(sid, { at: Date.now(), data: JSON.parse(JSON.stringify(data)) });
  }

  get(sid: string, cb: (err?: any, session?: session.SessionData | null) => void) {
    const hit = this.cache.get(sid);
    if (hit && Date.now() - hit.at < this.readTtlMs) {
      return cb(null, JSON.parse(JSON.stringify(hit.data)));
    }
    this.inner.get(sid, (err, data) => {
      if (!err && data) this.remember(sid, data);
      else this.cache.delete(sid);
      cb(err, data);
    });
  }

  set(sid: string, data: session.SessionData, cb?: (err?: any) => void) {
    this.inner.set(sid, data, (err) => {
      if (!err) {
        this.remember(sid, data);
        this.lastTouch.set(sid, Date.now());
      }
      cb?.(err);
    });
  }

  destroy(sid: string, cb?: (err?: any) => void) {
    this.cache.delete(sid);
    this.lastTouch.delete(sid);
    this.inner.destroy(sid, cb);
  }

  touch(sid: string, data: session.SessionData, cb?: () => void) {
    // Extending the expiry is only needed now and then, and the response must not wait for it
    const last = this.lastTouch.get(sid) ?? 0;
    if (Date.now() - last >= this.touchEveryMs && this.inner.touch) {
      this.lastTouch.set(sid, Date.now());
      this.inner.touch(sid, data, (err?: any) => {
        if (err) console.error("Auth: session touch failed:", err);
      });
    }
    cb?.();
  }
}
