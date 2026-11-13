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

const url = process.env.DATABASE_URL;
/**
 * Supabase's pooler has two modes. Transaction mode (port 6543) shares a few database connections
 * between many clients; through it each query took ~300ms and, on 12-13 Nov, connections stopped
 * getting answers and froze the app. Session mode (port 5432) gives each of our connections its own
 * database connection: normal Postgres behaviour, prepared statements allowed, and measured 9x faster
 * (200 queries: 1.8s vs 16s). It allows only 15 connections in total (Supabase "pool size"), so we use
 * DB_POOL_MAX (9) here + 1 watchdog probe + SESSION_POOL_MAX (2) for the login session store.
 */
export const sessionMode = !isSupabaseUrl(url) || /:5432\//.test(url);
const poolMax = Number(process.env.DB_POOL_MAX) || 9;
// postgres.js supports max_pipeline (src/index.js) but its type definitions do not list it
const ONE_QUERY_AT_A_TIME = { max_pipeline: 1 } as {};

const client = postgres(url, {
  // Prepared statements are fine in session mode and save a round trip per query;
  // transaction mode does not support them.
  prepare: sessionMode,
  ssl: dbSsl(url),
  max: poolMax,
  // Transaction mode only: one query at a time per connection (a reply once went to the wrong query)
  ...(sessionMode ? {} : ONE_QUERY_AT_A_TIME),
  // Opening a connection costs ~1.1s (TLS to Mumbai), a query on an open one ~150ms, so keep them.
  // Session mode: keep idle connections 5 minutes (TCP keepalive spots dead ones). Transaction mode
  // silently dropped long-idle connections, so there they close after 20s.
  idle_timeout: sessionMode ? 300 : 20,
  max_lifetime: 60 * 30,
  // Give up on opening a connection after 10s instead of waiting forever
  connect_timeout: 10,
});

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

/** Slow requests are only logged; being busy is not a reason to restart. */
export function reportDbStall(source: string) {
  console.warn(`DB watchdog: slow (over 30s): ${source}`);
}

/**
 * Self-healing, for one failure only: connections of the app's pool that never get an answer
 * (12 Nov) while the database itself is fine. Every 30s a query goes through the app's pool AND,
 * separately, through a dedicated one-connection "probe". Only when the pool has not answered for
 * 2 checks in a row (over a minute) while the probe answers fine is the pool stuck; then the
 * process exits and Docker restarts it with fresh connections.
 *
 * It never restarts when the database is slow or down for everyone (the probe fails too: a restart
 * would not help and only knocks everyone out), within 5 minutes of starting, or more than once in
 * 10 minutes (the last restart time is kept in a file that survives the container restart).
 * On 13 Nov a "restart on any slow request" rule restarted the app every 40s under morning load.
 */
const probe = postgres(url, {
  prepare: false, ssl: dbSsl(url), max: 1, ...ONE_QUERY_AT_A_TIME, idle_timeout: 0, connect_timeout: 10,
});
const RESTART_FILE = '/tmp/crm-db-watchdog-restart';
const startedAt = Date.now();
let poolFailures = 0;
async function watchdog() {
  const [poolOk, probeOk] = await Promise.all([
    settlesWithin(client`select 1`, 30_000),
    settlesWithin(probe`select 1`, 30_000),
  ]);
  if (poolOk) { poolFailures = 0; return; }
  if (!probeOk) { poolFailures = 0; console.warn('DB watchdog: database slow or unreachable for everyone; not restarting'); return; }
  poolFailures++;
  console.error(`DB watchdog: app connections not answering while the database is fine (${poolFailures}/2)`);
  if (poolFailures < 2 || process.env.NODE_ENV !== 'production') return;
  if (Date.now() - startedAt < 5 * 60_000) return;
  try {
    const fs = await import('fs');
    const last = Number(fs.readFileSync(RESTART_FILE, 'utf8')) || 0;
    if (Date.now() - last < 10 * 60_000) return console.error('DB watchdog: restarted less than 10 min ago; waiting');
    fs.writeFileSync(RESTART_FILE, String(Date.now()));
  } catch {
    try { (await import('fs')).writeFileSync(RESTART_FILE, String(Date.now())); } catch {}
  }
  console.error('DB watchdog: restarting the server to drop stuck database connections');
  setTimeout(() => process.exit(1), 200);
}
const warm = setInterval(() => { watchdog().catch(() => {}); }, 30_000);
warm.unref();

export const db = drizzle(client, { schema });
