import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

console.log("Initializing database connection...");

const client = postgres(process.env.DATABASE_URL, {
  prepare: false, // Required for pgbouncer transaction mode
  idle_timeout: 20,
  max_lifetime: 60 * 30,
});
export const db = drizzle(client, { schema });
console.log("Database connection established.");
