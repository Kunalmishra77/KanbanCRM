import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.example" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing");
}

const outDir = path.resolve("tmp");
const outFile = path.join(outDir, "supabase-public-migration.sql");
fs.mkdirSync(outDir, { recursive: true });

const quoteIdent = (value) => `"${String(value).replaceAll('"', '""')}"`;
const sqlString = (value) => `'${String(value).replaceAll("'", "''")}'`;

const columnType = (column) => {
  if (column.data_type === "ARRAY") return `${column.element_type || "text"}[]`;
  if (column.data_type === "character varying") {
    return column.character_maximum_length
      ? `varchar(${column.character_maximum_length})`
      : "varchar";
  }
  if (column.data_type === "timestamp without time zone") return "timestamp without time zone";
  if (column.data_type === "timestamp with time zone") return "timestamp with time zone";
  if (column.data_type === "USER-DEFINED") return column.udt_name;
  return column.data_type;
};

const literal = (value) => {
  if (value === null || value === undefined) return "NULL";
  if (value instanceof Date) return sqlString(value.toISOString());
  if (Array.isArray(value)) return `ARRAY[${value.map(literal).join(", ")}]`;
  if (typeof value === "object") return sqlString(JSON.stringify(value));
  if (typeof value === "boolean") return value ? "true" : "false";
  return sqlString(value);
};

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

  const constraints = await db.unsafe(`
    select conname, contype, conrelid::regclass::text as table_name, pg_get_constraintdef(oid) as definition
    from pg_constraint
    where connamespace = 'public'::regnamespace
    order by contype, conname
  `);

  const indexes = await db.unsafe(`
    select tablename as table_name, indexname, indexdef
    from pg_indexes
    where schemaname = 'public'
    order by tablename, indexname
  `);

  const lines = [
    "-- Generated from live Supabase public schema and data.",
    "-- Review before importing into an existing database.",
    "CREATE EXTENSION IF NOT EXISTS pgcrypto;",
    "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";",
    "SET client_min_messages TO warning;",
    "",
  ];

  for (const table of [...tables].reverse()) {
    lines.push(`DROP TABLE IF EXISTS public.${quoteIdent(table.table_name)} CASCADE;`);
  }
  lines.push("");

  const primaryAndUnique = constraints.filter((constraint) => ["p", "u"].includes(constraint.contype));
  const foreignKeys = constraints.filter((constraint) => constraint.contype === "f");
  const primaryAndUniqueNames = new Set(primaryAndUnique.map((constraint) => constraint.conname));

  for (const table of tables) {
    const columns = await db.unsafe(`
      select
        c.column_name,
        c.data_type,
        c.udt_name,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        e.data_type as element_type
      from information_schema.columns c
      left join information_schema.element_types e
        on c.table_catalog = e.object_catalog
       and c.table_schema = e.object_schema
       and c.table_name = e.object_name
       and c.dtd_identifier = e.collection_type_identifier
      where c.table_schema = 'public'
        and c.table_name = ${sqlString(table.table_name)}
      order by c.ordinal_position
    `);

    lines.push(`CREATE TABLE public.${quoteIdent(table.table_name)} (`);
    const columnLines = columns.map((column) => {
      const pieces = [
        `  ${quoteIdent(column.column_name)}`,
        columnType(column),
      ];
      if (column.column_default) pieces.push(`DEFAULT ${column.column_default}`);
      if (column.is_nullable === "NO") pieces.push("NOT NULL");
      return pieces.join(" ");
    });
    const tableConstraints = primaryAndUnique
      .filter((constraint) => constraint.table_name === table.table_name)
      .map((constraint) => `  CONSTRAINT ${quoteIdent(constraint.conname)} ${constraint.definition}`);
    lines.push([...columnLines, ...tableConstraints].join(",\n"));
    lines.push(");", "");
  }

  for (const index of indexes) {
    if (primaryAndUniqueNames.has(index.indexname)) continue;
    lines.push(`${index.indexdef};`);
  }
  lines.push("");

  for (const table of tables) {
    const rows = await db.unsafe(`select * from public.${quoteIdent(table.table_name)}`);
    if (rows.length === 0) continue;
    const columns = Object.keys(rows[0]);
    lines.push(`-- Data for public.${table.table_name}`);
    for (const row of rows) {
      const names = columns.map(quoteIdent).join(", ");
      const values = columns.map((column) => literal(row[column])).join(", ");
      lines.push(`INSERT INTO public.${quoteIdent(table.table_name)} (${names}) VALUES (${values});`);
    }
    lines.push("");
  }

  for (const constraint of foreignKeys) {
    lines.push(
      `ALTER TABLE public.${quoteIdent(constraint.table_name)} ADD CONSTRAINT ${quoteIdent(constraint.conname)} ${constraint.definition};`,
    );
  }

  fs.writeFileSync(outFile, `${lines.join("\n")}\n`);
  console.log(`Wrote ${outFile}`);
} finally {
  await db.end();
}
