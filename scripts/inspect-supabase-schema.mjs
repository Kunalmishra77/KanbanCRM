import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.example" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing");
}

const quoteIdent = (value) => `"${String(value).replaceAll('"', '""')}"`;
const db = postgres(process.env.DATABASE_URL, {
  prepare: false,
  max: 1,
  connect_timeout: 20,
});

try {
  const tables = await db.unsafe(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
    order by table_name
  `);

  console.log("TABLES");
  for (const table of tables) {
    const rows = await db.unsafe(
      `select count(*)::int as count from public.${quoteIdent(table.table_name)}`,
    );
    console.log(`${table.table_name}\t${rows[0].count}`);
  }

  console.log("COLUMNS");
  const columns = await db.unsafe(`
    select table_name, column_name, data_type, udt_name, is_nullable, column_default
    from information_schema.columns
    where table_schema = 'public'
    order by table_name, ordinal_position
  `);
  for (const column of columns) {
    console.log([
      column.table_name,
      column.column_name,
      column.data_type,
      column.udt_name,
      column.is_nullable,
      column.column_default || "",
    ].join("\t"));
  }
} finally {
  await db.end();
}
