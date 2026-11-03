import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema.js';
import { SUPABASE_CA } from './supabaseCa.js';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

export function isSupabaseUrl(url: string) {
  return /supabase\.(com|co)/i.test(url);
}

/** TLS options for Supabase: encrypted and verified against Supabase's own root CA. */
export function dbSsl(url: string) {
  return isSupabaseUrl(url) ? { ca: SUPABASE_CA, rejectUnauthorized: true } : undefined;
}

const client = postgres(process.env.DATABASE_URL, {
  prepare: false, // Required for the Supabase pooler (transaction mode)
  ssl: dbSsl(process.env.DATABASE_URL),
  idle_timeout: 20,
  max_lifetime: 60 * 30,
});

export const db = drizzle(client, { schema });
