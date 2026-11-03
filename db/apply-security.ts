import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import { dbSsl } from './index.js';

// Applies db/supabase-security.sql (RLS on every table, no anon/authenticated access).
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL environment variable is not set');

const sqlText = fs.readFileSync(path.join(import.meta.dirname, 'supabase-security.sql'), 'utf8');
const client = postgres(url, { prepare: false, ssl: dbSsl(url), max: 1 });

try {
  await client.unsafe(sqlText);
  const rows = await client`select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1`;
  const open = rows.filter((r) => !r.rowsecurity).map((r) => r.tablename);
  console.log(`RLS enabled on ${rows.length - open.length}/${rows.length} tables.`);
  if (open.length) console.log('Still without RLS:', open.join(', '));
} finally {
  await client.end();
}
