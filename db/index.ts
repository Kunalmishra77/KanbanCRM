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
  // Close idle connections after 20s (some hop between here and Supabase silently drops
  // long-idle ones, and a query on a dead connection hangs). A ping every 15s keeps a few
  // connections in use so normal requests don't pay the ~1.1s cost of opening a new one.
  idle_timeout: 20,
  max_lifetime: 60 * 30,
  // Give up on opening a connection after 10s instead of waiting forever
  connect_timeout: 10,
});

/**
 * Self-healing. Sometimes a query sent to Supabase never gets an answer, and the connection stays
 * "busy" forever. Requests then pile up behind it and the whole app (login, board) hangs until
 * someone restarts it. Anything that notices a stall reports it here; after 3 stalls in 2 minutes
 * the process exits and Docker (restart policy unless-stopped) brings it back in a few seconds
 * with fresh connections.
 */
const stalls: number[] = [];
export function reportDbStall(source: string) {
  const now = Date.now();
  stalls.push(now);
  while (stalls.length && now - stalls[0] > 120_000) stalls.shift();
  console.error(`DB watchdog: stall in ${source} (${stalls.length} in the last 2 min)`);
  if (stalls.length >= 3 && process.env.NODE_ENV === 'production') {
    console.error('DB watchdog: restarting the server to drop stuck database connections');
    setTimeout(() => process.exit(1), 200);
  }
}

/** Resolves false if the promise has not settled within ms. */
export function settlesWithin(p: Promise<unknown>, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(false), ms);
    p.then(
      () => { clearTimeout(t); resolve(true); },
      () => { clearTimeout(t); resolve(true); }, // an error is an answer, not a hang
    );
  });
}

const warm = setInterval(async () => {
  const ok = await settlesWithin(Promise.all([client`select 1`, client`select 1`, client`select 1`]), 10_000);
  if (!ok) reportDbStall('database ping');
}, 15_000);
warm.unref();

export const db = drizzle(client, { schema });
