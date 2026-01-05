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
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
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

  if (process.env.REPLIT_DEPLOYMENT === '1' && process.env.REPLIT_DOMAINS) {
    // Production deployment - use the first domain from REPLIT_DOMAINS
    domain = process.env.REPLIT_DOMAINS.split(',')[0];
  } else if (process.env.REPLIT_DEV_DOMAIN) {
    // Replit development environment
    domain = process.env.REPLIT_DEV_DOMAIN;
  } else if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    // Fallback for older Replit environments
    domain = `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  } else {
    // Local development
    domain = `localhost:${process.env.PORT || 5000}`;
    protocol = 'http';
  }
  const callbackURL = `${protocol}://${domain}/api/auth/google/callback`;

  console.log("Google OAuth callback URL:", callbackURL);

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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

  app.get("/api/login", passport.authenticate("google"));

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/auth",
      successRedirect: "/",
    })
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
