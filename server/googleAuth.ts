import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import pg from "pg";
import { dbSsl } from "../db/index.js";
import { randomBytes } from "crypto";
import { storage } from "./storage.js";
import { CachedSessionStore } from "./lib/cachedSessionStore.js";

const isProd = process.env.NODE_ENV === "production";

// Bootstrap list of emails that may sign in as founders before they exist in the database.
// After first sign-in the role stored on the user row is authoritative (changeable in Settings).
// Override with FOUNDER_EMAILS="a@x.com,b@y.com".
const FOUNDER_EMAILS = (
  process.env.FOUNDER_EMAILS || process.env.CO_FOUNDER_EMAILS ||
  'vitalsaigorrela@gmail.com,anantsanadhya@gmail.com,myai@ai-agentix.com,anant@ai-agentix.com,tiwarivimlendra@gmail.com'
)
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isFounderEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return FOUNDER_EMAILS.includes(email.toLowerCase());
}

/**
 * Returns the stable callback URL based on the environment.
 */
function getCallbackURL() {
  const appUrl = process.env.APP_URL || process.env.PUBLIC_URL;
  if (appUrl) {
    return `${appUrl.replace(/\/+$/, "")}/api/auth/google/callback`;
  }

  return `http://localhost:${process.env.PORT || 5000}/api/auth/google/callback`;
}


type GoogleProfileLike = {
  id: string;
  displayName?: string;
  name?: { givenName?: string; familyName?: string };
  emails?: { value: string; verified?: boolean }[];
  photos?: { value: string }[];
};

/** Everything that happens after Google says who someone is. Shared by the real login and the test login. */
export async function signInFromGoogleProfile(profile: GoogleProfileLike) {
  const emailObj = profile.emails?.[0];
  const email = emailObj?.value || null;

  if (!email || (emailObj as any)?.verified === false) {
    return { user: null, error: "unverified_email" };
  }

  // Only pre-registered users (created by an admin/HR) or founders may sign in.
  const existing = await storage.getUserByEmail(email);
  if (!existing && !isFounderEmail(email)) {
    console.warn("Auth Callback: rejected sign-in from unregistered account");
    return { user: null, error: "not_registered" };
  }

  const firstName = profile.name?.givenName || profile.displayName?.split(" ")[0] || null;
  const lastName = profile.name?.familyName || null;
  const profileImageUrl = profile.photos?.[0]?.value || null;

  const isFounder = isFounderEmail(email);
  const user = await storage.upsertUserFromGoogle({
    id: profile.id,
    email,
    firstName,
    lastName,
    profileImageUrl,
    userType: isFounder ? 'founder' : 'employee',
    role: isFounder ? 'admin' : 'editor',
  });
  return { user, error: null };
}

// Test-only sign-in for automated tests. Cannot be switched on unless the database is on this machine,
// so it can never be enabled against Supabase or any remote database.
function testLoginAllowed() {
  try {
    const host = new URL(process.env.DATABASE_URL || "").hostname;
    return process.env.E2E_TEST_LOGIN === "1" && (host === "localhost" || host === "127.0.0.1");
  } catch {
    return false;
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const secret = process.env.SESSION_SECRET;
  
  if (!secret && isProd) {
    throw new Error("SESSION_SECRET must be set in production");
  }
  if (!secret) {
    console.warn("Auth: SESSION_SECRET missing - using a random per-process secret (sessions reset on restart).");
  }

  const sessionOptions: session.SessionOptions = {
    secret: secret || randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    name: 'kanban.sid',
    cookie: {
      httpOnly: true,
      secure: isProd,
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  };

  if (process.env.DATABASE_URL) {
    try {
      const pgStore = connectPg(session);
      // Same verified TLS settings as the main database connection
      const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: dbSsl(process.env.DATABASE_URL),
        max: 3,
        idleTimeoutMillis: 30_000,
      });
      // Keep one session-store connection in use (a new one costs ~1s to this far-away DB)
      setInterval(() => { pool.query('select 1').catch(() => {}); }, 15_000).unref();
      const store = new pgStore({
        pool,
        createTableIfMissing: false, 
        ttl: sessionTtl / 1000,
        tableName: "sessions",
      });

      store.on('error', (err) => {
        console.error("Auth: Session store error event:", err);
      });

      sessionOptions.store = new CachedSessionStore(store);
    } catch (storeErr) {
      console.error("Auth: CRITICAL ERROR initializing PostgreSQL session store:", storeErr);
      if (isProd) throw storeErr;
      console.warn("Auth: Falling back to MemoryStore (development only).");
    }
  } else if (isProd) {
    throw new Error("DATABASE_URL must be set in production for the session store");
  } else {
    console.warn("Auth: DATABASE_URL missing - using in-memory sessions (development only).");
  }

  return session(sessionOptions);
}

export async function setupGoogleAuth(app: Express) {
  console.log("Auth: Starting setupGoogleAuth...");
  
  // Validate critical env vars
  const requiredEnv = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'DATABASE_URL', 'SESSION_SECRET'];
  requiredEnv.forEach(env => {
    if (!process.env[env]) {
      console.error(`Auth Diagnostic: Missing ${env} environment variable!`);
    } else {
      console.log(`Auth Diagnostic: ${env} check passed.`);
    }
  });

  // Essential for Vercel/proxies
  app.set("trust proxy", 1);
  console.log("Auth: 'trust proxy' set to 1");
  
  try {
    const sessionMiddleware = getSession();
    app.use(sessionMiddleware);
    console.log("Auth: Session middleware applied.");

    app.use(passport.initialize());
    app.use(passport.session());
    console.log("Auth: Passport middleware initialized.");
  } catch (middlewareErr) {
    console.error("Auth: CRITICAL ERROR applying auth middleware:", middlewareErr);
    throw middlewareErr;
  }

  const callbackURL = getCallbackURL();
  console.log(`Auth: Google Strategy using Callback URL: ${callbackURL}`);

  try {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID || "",
          clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
          callbackURL,
          proxy: true,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const result = await signInFromGoogleProfile(profile);
            if (!result.user) return done(null, false, { message: result.error });
            done(null, result.user);
          } catch (error) {
            console.error("Auth Callback: Exception in strategy verify callback:", error);
            done(error as Error);
          }
        }
      )
    );
    console.log("Auth: GoogleStrategy configured.");
  } catch (strategyErr) {
    console.error("Auth: CRITICAL ERROR configuring GoogleStrategy:", strategyErr);
    throw strategyErr;
  }

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Every API call deserialises the session user; cache briefly instead of hitting the DB each time.
  const userCache = new Map<string, { at: number; user: any }>();
  const USER_CACHE_MS = 15_000;

  passport.deserializeUser(async (id: string, done) => {
    try {
      const hit = userCache.get(id);
      if (hit && Date.now() - hit.at < USER_CACHE_MS) return done(null, hit.user);
      const user = await storage.getUser(id);
      if (user) userCache.set(id, { at: Date.now(), user });
      if (!user) {
        console.warn(`Auth: Deserialization failed - user not found for ID: ${id}`);
      }
      done(null, user || null);
    } catch (error) {
      console.error(`Auth: Deserialization error for ID: ${id}:`, error);
      done(error);
    }
  });

  app.get("/api/login", (req, res, next) => {
    passport.authenticate("google", { 
      scope: ["profile", "email"],
      prompt: "select_account"
    })(req, res, next);
  });

  app.get(
    "/api/auth/google/callback",
    (req, res, next) => {
      passport.authenticate("google", {
        session: false,
      }, (err, user, info) => {
        if (err) {
          console.error("Auth Callback Route: Passport authentication error:", err);
          return next(err);
        }
        
        if (!user) {
          const reason = (info as any)?.message === "not_registered" ? "not_registered" : "failed";
          return res.redirect(`/auth?error=${reason}`);
        }
        
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            console.error("Auth Callback Route: req.logIn error:", loginErr);
            return next(loginErr);
          }
          
          res.redirect("/");
        });
      })(req, res, next);
    }
  );

  if (testLoginAllowed()) {
    console.warn("Auth: TEST LOGIN ENABLED (local database only)");
    // Pretends to be Google: runs the same sign-in code with a made-up profile.
    app.post("/api/test-login", async (req, res, next) => {
      try {
        const { email, googleGivenName, googleFamilyName } = req.body || {};
        const result = await signInFromGoogleProfile({
          id: `test-${email}`,
          emails: [{ value: email, verified: true }],
          name: { givenName: googleGivenName, familyName: googleFamilyName },
        });
        if (!result.user) return res.status(403).json({ error: result.error });
        req.logIn(result.user, (err) => (err ? next(err) : res.json(result.user)));
      } catch (e) {
        next(e);
      }
    });
  }

  app.post("/api/logout", (req, res) => {
    const userId = (req.user as any)?.id;

    // Prevent browser/proxy from caching this redirect
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");

    req.logout((err) => {
      if (err) {
        console.error("Auth Route: Logout error:", err);
      }

      // Fully destroy the session to ensure a clean logout
      if (req.session) {
        req.session.destroy((destroyErr) => {
          if (destroyErr) {
            console.error("Auth Route: Session destroy error:", destroyErr);
          }
          res.clearCookie("kanban.sid");
          res.status(204).end();
        });
      } else {
        res.clearCookie("kanban.sid");
        res.status(204).end();
      }
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  // console.warn(`Auth: Unauthorized access attempt to ${req.path}`);
  res.status(401).json({ message: "Unauthorized. Please log in." });
};

export const requireRole = (check: (user: any) => boolean, message: string): RequestHandler => (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized. Please log in." });
  }
  if (!check(req.user)) {
    return res.status(403).json({ error: message });
  }
  next();
};
