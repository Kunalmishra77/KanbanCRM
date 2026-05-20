import fs from "node:fs";
import postgres from "postgres";

const {
  TARGET_POSTGRES_URL,
  TARGET_DATABASE = "crm",
  MIGRATION_SQL = "tmp/supabase-public-migration.sql",
} = process.env;

if (!TARGET_POSTGRES_URL) {
  throw new Error("TARGET_POSTGRES_URL is required");
}

if (!fs.existsSync(MIGRATION_SQL)) {
  throw new Error(`Migration SQL not found: ${MIGRATION_SQL}`);
}

function withDatabase(url, database) {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

const adminUrl = withDatabase(TARGET_POSTGRES_URL, "postgres");
const targetUrl = withDatabase(TARGET_POSTGRES_URL, TARGET_DATABASE);

const admin = postgres(adminUrl, {
  prepare: false,
  max: 1,
  connect_timeout: 20,
});

try {
  const existing = await admin`
    select 1
    from pg_database
    where datname = ${TARGET_DATABASE}
  `;

  if (existing.length === 0) {
    await admin.unsafe(`create database "${TARGET_DATABASE.replaceAll('"', '""')}"`);
    console.log(`Created database ${TARGET_DATABASE}`);
  } else {
    console.log(`Database ${TARGET_DATABASE} already exists`);
  }
} finally {
  await admin.end();
}

const target = postgres(targetUrl, {
  prepare: false,
  max: 1,
  connect_timeout: 20,
});

try {
  const migration = fs.readFileSync(MIGRATION_SQL, "utf8");
  await target.unsafe(migration);
  const tables = await target`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
    order by table_name
  `;
  console.log(`Imported ${tables.length} public tables into ${TARGET_DATABASE}`);
  for (const table of tables) {
    const tableName = String(table.table_name).replaceAll('"', '""');
    const rows = await target.unsafe(`select count(*)::int as count from public."${tableName}"`);
    console.log(`${table.table_name}\t${rows[0].count}`);
  }
} finally {
  await target.end();
}
