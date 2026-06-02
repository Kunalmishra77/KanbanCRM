import { Client } from 'ssh2';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const privateKey = readFileSync(join(homedir(), '.ssh', 'vps_crm_key'));
const SSH_CONFIG = { host: '76.13.250.173', port: 22, username: 'root', privateKey, readyTimeout: 20000 };

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '', errOut = '';
      stream.on('data', d => (out += d));
      stream.stderr.on('data', d => (errOut += d));
      stream.on('close', code => resolve({ code, out: out.trim(), err: errOut.trim() }));
    });
  });
}

async function connectSSH() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => resolve(conn));
    conn.on('error', reject);
    conn.connect(SSH_CONFIG);
  });
}

async function run() {
  console.log('🔌 Connecting...');
  const conn = await connectSSH();
  console.log('✅ Connected!\n');

  console.log('=== Finding PocketBase executable ===');
  const { out: pbPath } = await exec(conn, `docker exec pocketbase-jkc4oswoc00sw84wkgcsgk0c find / -name pocketbase -type f -executable 2>/dev/null | head -n 1`);
  console.log('PB Path:', pbPath);

  if (pbPath) {
    console.log(`\n=== Upserting superuser ${pbPath} ===`);
    const { out: upsert, err: upsertErr } = await exec(conn, `docker exec pocketbase-jkc4oswoc00sw84wkgcsgk0c ${pbPath} superuser upsert "aiagentix2025@gmail.com" "AGENTiX@2025"`);
    console.log(upsert || upsertErr);

    console.log('\n=== Testing Auth again ===');
    const payload = JSON.stringify({ identity: "aiagentix2025@gmail.com", password: "AGENTiX@2025" });
    const { out: auth1 } = await exec(conn, `docker exec kanban-crm wget -q -O- --timeout=10 --post-data='${payload}' --header="Content-Type: application/json" "http://pocketbase-jkc4oswoc00sw84wkgcsgk0c:8080/api/collections/_superusers/auth-with-password" 2>&1 || echo "FAILED"`);
    console.log('Superusers:', auth1);
  }

  conn.end();
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
