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

/**
 * Returns the stable callback URL based on the environment.
 */
function getCallbackURL() {
  // Use VERCEL env var or production mode to determine the URL
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return "https://kanbancrm-five.vercel.app/api/auth/google/callback";
  }
  // Default to local development
  return `http://localhost:${process.env.PORT || 5000}/api/auth/google/callback`;
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const secret = process.env.SESSION_SECRET;
  
  if (!secret) {
    console.error("CRITICAL AUTH ERROR: SESSION_SECRET is missing from environment variables!");
  }

  const sessionOptions: session.SessionOptions = {
    secret: secret || "kanban-crm-temporary-fallback-secret-12345",
    resave: false,
    saveUninitialized: false,
    name: 'kanban.sid', // Explicit session name
    cookie: {
      httpOnly: true,
      // Secure cookies are required for production/Vercel to work with proxies
      secure: process.env.NODE_ENV === "production" || !!process.env.VERCEL,
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  };

  if (process.env.DATABASE_URL) {
    console.log("Auth: Initializing PostgreSQL session store...");
    const pgStore = connectPg(session);
    sessionOptions.store = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false, // Handled by complete_fix.sql
      ttl: sessionTtl / 1000,
      tableName: "sessions",
    });
  } else {
    console.warn("Auth: DATABASE_URL missing, sessions will be stored in memory (NOT recommended for production).");
  }

  return session(sessionOptions);
}

export async function setupGoogleAuth(app: Express) {
  // Essential for Vercel/proxies to trust the 'x-forwarded-proto' header for secure cookies
  app.set("trust proxy", 1);
  
  // Apply session middleware
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Check for required Google credentials
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error("CRITICAL AUTH ERROR: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing!");
  }

  const callbackURL = getCallbackURL();
  console.log(`Auth: Google Strategy configured with Callback: ${callbackURL}`);

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        callbackURL,
        proxy: true, // Crucial for Vercel's internal proxy handling
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value || null;
          console.log(`Auth: Google Profile received for email: ${email} (ID: ${profile.id})`);

          const firstName = profile.name?.givenName || profile.displayName?.split(" ")[0] || null;
          const lastName = profile.name?.familyName || null;
          const profileImageUrl = profile.photos?.[0]?.value || null;

          // Determine user type and role based on email allowlist
          const isCoFounder = isCoFounderEmail(email);
          const userType = isCoFounder ? 'co-founder' : 'employee';
          const role = isCoFounder ? 'admin' : 'editor';

          console.log(`Auth: Starting upsertUser for ID: ${profile.id}...`);
          const user = await storage.upsertUser({
            id: profile.id,
            email,
            firstName,
            lastName,
            profileImageUrl,
            userType,
            role,
          });
          console.log(`Auth: upsertUser successful for user ID: ${user.id}`);

          done(null, user);
        } catch (error) {
          console.error("Auth: Exception in Google Strategy verify callback:", error);
          done(error as Error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    console.log(`Auth: Serializing user session for ID: ${user.id}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      // console.log(`Auth: Deserializing user session for ID: ${id}`);
      const user = await storage.getUser(id);
      if (!user) {
        console.warn(`Auth: Deserialization warning - user not found in storage for ID: ${id}`);
      }
      done(null, user || null);
    } catch (error) {
      console.error(`Auth: Deserialization error for ID: ${id}:`, error);
      done(error);
    }
  });

  // Login Route
  app.get("/api/login", (req, res, next) => {
    console.log("Auth: User initiated login via /api/login");
    passport.authenticate("google", { 
      scope: ["profile", "email"],
      prompt: "select_account" // Force account selection to avoid auto-login loops
    })(req, res, next);
  });

  // Callback Route
  app.get(
    "/api/auth/google/callback",
    (req, res, next) => {
      console.log("Auth: Handling Google callback at /api/auth/google/callback");
      
      passport.authenticate("google", {
        failureRedirect: "/auth",
      }, (err, user, info) => {
        if (err) {
          console.error("Auth: Passport authentication error details:", err);
          return next(err);
        }
        
        if (!user) {
          console.warn("Auth: Authentication failed - no user returned from Google:", info);
          return res.redirect("/auth");
        }
        
        console.log(`Auth: Passport authenticated user ${user.id}. Establishing session...`);
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            console.error("Auth: Error saving session (req.logIn):", loginErr);
            return next(loginErr);
          }
          
          console.log(`Auth: Session established for user ${user.id}. Redirecting to app root.`);
          res.redirect("/");
        });
      })(req, res, next);
    }
  );

  // Logout Route
  app.get("/api/logout", (req, res) => {
    const userId = (req.user as any)?.id;
    req.logout((err) => {
      if (err) {
        console.error("Auth: Logout error:", err);
      }
      console.log(`Auth: User ${userId} logged out.`);
      res.redirect("/auth");
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
