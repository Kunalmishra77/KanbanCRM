import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Allowlist of emails that are co-founders with admin access
const CO_FOUNDER_EMAILS = [
  'vitalsaigorrela@gmail.com',
  'anantsanadhya@gmail.com',
  'myai@ai-agentix.com',
];

export function isCoFounderEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return CO_FOUNDER_EMAILS.includes(email.toLowerCase());
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Use a secret fallback for debugging (though production should always have SESSION_SECRET)
  const secret = process.env.SESSION_SECRET || "kanban-crm-fallback-secret-12345";
  
  if (!process.env.DATABASE_URL) {
    console.error("CRITICAL: DATABASE_URL is missing! Session store will be in-memory only.");
    // Fallback to memory store if DB is missing to prevent total crash
    return session({
      secret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: sessionTtl,
      },
    });
  }

  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false, // We already added this to complete_fix.sql
    ttl: sessionTtl,
    tableName: "sessions",
  });

  return session({
    secret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

export async function setupGoogleAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Detect production vs development domain for OAuth callback
  let domain: string;
  let protocol = 'https';

  if (process.env.VERCEL_URL) {
    // Vercel deployment
    domain = process.env.VERCEL_URL;
  } else if (process.env.REPLIT_DEPLOYMENT === '1' && process.env.REPLIT_DOMAINS) {
    // Production deployment - use the first domain from REPLIT_DOMAINS
    domain = process.env.REPLIT_DOMAINS.split(',')[0];
  } else if (process.env.REPLIT_DEV_DOMAIN) {
    // Replit development environment
    domain = process.env.REPLIT_DEV_DOMAIN;
  } else if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    // Fallback for older Replit environments
    domain = `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  } else if (process.env.VERCEL) {
    // Vercel deployment without VERCEL_URL (shouldn't happen)
    domain = 'kanbancrm-five.vercel.app';
  } else {
    // Local development
    domain = `localhost:${process.env.PORT || 5000}`;
    protocol = 'http';
  }
  const callbackURL = `${protocol}://${domain}/api/auth/google/callback`;

  console.log("Google OAuth initialized with callback URL:", callbackURL);
  console.log("Using VERCEL_URL:", process.env.VERCEL_URL);

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        callbackURL,
        scope: ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value || null;
          const firstName = profile.name?.givenName || profile.displayName?.split(" ")[0] || null;
          const lastName = profile.name?.familyName || null;
          const profileImageUrl = profile.photos?.[0]?.value || null;

          // Determine user type and role based on email allowlist
          const isCoFounder = isCoFounderEmail(email);
          const userType = isCoFounder ? 'co-founder' : 'employee';
          const role = isCoFounder ? 'admin' : 'editor';

          const user = await storage.upsertUser({
            id: profile.id,
            email,
            firstName,
            lastName,
            profileImageUrl,
            userType,
            role,
          });

          done(null, user);
        } catch (error) {
          done(error as Error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || null);
    } catch (error) {
      done(error);
    }
  });

  app.get("/api/login", (req, res, next) => {
    // Dynamically determine the callback URL based on the current request host
    const host = req.get("host");
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const callbackURL = `${protocol}://${host}/api/auth/google/callback`;

    console.log("Initiating login with dynamic callback:", callbackURL);

    passport.authenticate("google", { 
      scope: ["profile", "email"],
      callbackURL 
    })(req, res, next);
  });

  app.get(
    "/api/auth/google/callback",
    (req, res, next) => {
      const host = req.get("host");
      const protocol = req.headers["x-forwarded-proto"] || "http";
      const callbackURL = `${protocol}://${host}/api/auth/google/callback`;

      passport.authenticate("google", {
        failureRedirect: "/auth",
        successRedirect: "/",
        callbackURL
      })(req, res, next);
    }
  );

  app.get("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.redirect("/auth");
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
