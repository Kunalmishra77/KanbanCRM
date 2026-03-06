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
  const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL;
  const isProd = process.env.NODE_ENV === 'production';

  if (isVercel || isProd) {
    return "https://kanbancrm-five.vercel.app/api/auth/google/callback";
  }
  return `http://localhost:${process.env.PORT || 5000}/api/auth/google/callback`;
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const secret = process.env.SESSION_SECRET;
  
  console.log("Auth: Initializing session middleware...");
  if (!secret) {
    console.error("CRITICAL AUTH ERROR: SESSION_SECRET is missing from environment variables! Login will likely fail or be insecure.");
  } else {
    console.log("Auth: SESSION_SECRET check passed.");
  }

  const sessionOptions: session.SessionOptions = {
    secret: secret || "kanban-crm-temporary-fallback-secret-12345",
    resave: false,
    saveUninitialized: false,
    name: 'kanban.sid',
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" || !!process.env.VERCEL,
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  };

  if (process.env.DATABASE_URL) {
    try {
      console.log("Auth: Attempting to initialize PostgreSQL session store with connect-pg-simple...");
      const pgStore = connectPg(session);
      const store = new pgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: false, 
        ttl: sessionTtl / 1000,
        tableName: "sessions",
      });

      store.on('error', (err) => {
        console.error("Auth: Session store error event:", err);
      });

      sessionOptions.store = store;
      console.log("Auth: PostgreSQL session store initialized successfully.");
    } catch (storeErr) {
      console.error("Auth: CRITICAL ERROR initializing PostgreSQL session store:", storeErr);
      console.warn("Auth: Falling back to MemoryStore due to session store initialization failure.");
    }
  } else {
    console.warn("Auth: DATABASE_URL missing! Sessions will be stored in-memory (NOT RECOMMENDED FOR PRODUCTION).");
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
            const email = profile.emails?.[0]?.value || null;
            console.log(`Auth Callback: Google profile received. Email: ${email}, ID: ${profile.id}`);

            const firstName = profile.name?.givenName || profile.displayName?.split(" ")[0] || null;
            const lastName = profile.name?.familyName || null;
            const profileImageUrl = profile.photos?.[0]?.value || null;

            const isCoFounder = isCoFounderEmail(email);
            const userType = isCoFounder ? 'co-founder' : 'employee';
            const role = isCoFounder ? 'admin' : 'editor';

            console.log(`Auth Callback: Pre-upsertUser for ID: ${profile.id}`);
            const user = await storage.upsertUser({
              id: profile.id,
              email,
              firstName,
              lastName,
              profileImageUrl,
              userType,
              role,
            });
            console.log(`Auth Callback: Post-upsertUser success for user ID: ${user.id}`);

            done(null, user);
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
    console.log(`Auth: Serializing user ID: ${user.id}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      console.log(`Auth: Deserializing user ID: ${id}`);
      const user = await storage.getUser(id);
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
    console.log("Auth Route: /api/login hit. Redirecting to Google...");
    passport.authenticate("google", { 
      scope: ["profile", "email"],
      prompt: "select_account"
    })(req, res, next);
  });

  app.get(
    "/api/auth/google/callback",
    (req, res, next) => {
      console.log("Auth Route: /api/auth/google/callback hit.");
      
      passport.authenticate("google", {
        failureRedirect: "/auth",
      }, (err, user, info) => {
        if (err) {
          console.error("Auth Callback Route: Passport authentication error:", err);
          return next(err);
        }
        
        if (!user) {
          console.warn("Auth Callback Route: No user returned from Google:", info);
          return res.redirect("/auth");
        }
        
        console.log(`Auth Callback Route: Passport validated user ${user.id}. Attempting req.logIn...`);
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            console.error("Auth Callback Route: req.logIn error:", loginErr);
            return next(loginErr);
          }
          
          console.log(`Auth Callback Route: Session established for user ${user.id}. Redirecting home.`);
          res.redirect("/");
        });
      })(req, res, next);
    }
  );

  app.get("/api/logout", (req, res) => {
    const userId = (req.user as any)?.id;
    req.logout((err) => {
      if (err) {
        console.error("Auth Route: Logout error:", err);
      }
      console.log(`Auth Route: User ${userId} logged out.`);
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
