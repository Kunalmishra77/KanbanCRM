import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema.js';

// Export an empty db variable if DATABASE_URL is missing
// to avoid top-level crashes during Vercel serverless function initialization
let dbInstance: any = null;

if (process.env.DATABASE_URL) {
  console.log("Initializing database connection pool...");
  const client = postgres(process.env.DATABASE_URL, {
    prepare: false, // Required for pgbouncer transaction mode
    idle_timeout: 20,
    max_lifetime: 60 * 30,
  });
  dbInstance = drizzle(client, { schema });
  console.log("Database connection pool initialized.");
} else {
  console.error("CRITICAL: DATABASE_URL environment variable is missing!");
}

export const db = dbInstance;

