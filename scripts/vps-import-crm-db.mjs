import fs from "node:fs";
import { Client } from "ssh2";

const {
  VPS_HOST,
  VPS_USER = "root",
  VPS_PASSWORD,
  POSTGRES_CONTAINER = "",
  CRM_DB_NAME = "crm",
  MIGRATION_SQL = "tmp/supabase-public-migration.sql",
} = process.env;

if (!VPS_HOST || !VPS_PASSWORD) {
  throw new Error("VPS_HOST and VPS_PASSWORD are required");
}

if (!fs.existsSync(MIGRATION_SQL)) {
  throw new Error(`Migration SQL not found: ${MIGRATION_SQL}`);
}

const remoteSql = `/tmp/${CRM_DB_NAME}-migration.sql`;

const connect = () => new Promise((resolve, reject) => {
  const client = new Client();
  client
    .on("ready", () => resolve(client))
    .on("error", reject)
    .connect({
      host: VPS_HOST,
      username: VPS_USER,
      password: VPS_PASSWORD,
      readyTimeout: 30000,
    });
});

const exec = (client, command) => new Promise((resolve, reject) => {
  let stdout = "";
  let stderr = "";

  client.exec(command, (error, stream) => {
    if (error) {
      reject(error);
      return;
    }

    stream
      .on("close", (code) => {
        if (code === 0) resolve({ stdout, stderr });
        else reject(new Error(`Command failed with ${code}\n${stdout}\n${stderr}`));
      })
      .on("data", (data) => {
        stdout += data.toString();
      })
      .stderr.on("data", (data) => {
        stderr += data.toString();
      });
  });
});

const upload = (client) => new Promise((resolve, reject) => {
  client.sftp((error, sftp) => {
    if (error) {
      reject(error);
      return;
    }
    sftp.fastPut(MIGRATION_SQL, remoteSql, (uploadError) => {
      if (uploadError) reject(uploadError);
      else resolve();
    });
  });
});

const client = await connect();

try {
  console.log("Connected to VPS");
  await upload(client);
  console.log(`Uploaded ${MIGRATION_SQL} to ${remoteSql}`);

  const containerSelector = POSTGRES_CONTAINER
    ? `container=${JSON.stringify(POSTGRES_CONTAINER)}`
    : `container=$(docker ps --format '{{.Names}} {{.Image}}' | awk 'tolower($0) ~ /postgres|postgis/ {print $1; exit}')`;

  const command = `
set -euo pipefail
${containerSelector}
if [ -z "$container" ]; then
  echo "No Postgres container found. Set POSTGRES_CONTAINER." >&2
  exit 2
fi
user=$(docker exec "$container" printenv POSTGRES_USER 2>/dev/null || true)
if [ -z "$user" ]; then user=postgres; fi
password=$(docker exec "$container" printenv POSTGRES_PASSWORD 2>/dev/null || true)
if docker exec "$container" psql -U "$user" -d postgres -tAc "select 1 from pg_database where datname='${CRM_DB_NAME}'" | grep -q 1; then
  echo "Database ${CRM_DB_NAME} already exists"
else
  docker exec "$container" createdb -U "$user" "${CRM_DB_NAME}"
  echo "Created database ${CRM_DB_NAME}"
fi
docker cp "${remoteSql}" "$container:/tmp/${CRM_DB_NAME}-migration.sql"
docker exec "$container" psql -v ON_ERROR_STOP=1 -U "$user" -d "${CRM_DB_NAME}" -f "/tmp/${CRM_DB_NAME}-migration.sql" >/tmp/${CRM_DB_NAME}-import.log
echo "Imported migration into ${CRM_DB_NAME} on container $container"
echo "$container"
`;

  const { stdout } = await exec(client, command);
  process.stdout.write(stdout);
} finally {
  client.end();
}
