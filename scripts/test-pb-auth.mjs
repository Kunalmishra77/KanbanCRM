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

  console.log('=== Testing PB Auth directly ===');
  
  const payload = JSON.stringify({ identity: "aiagentix2025@gmail.com", password: "AGENTiX@2025" });
  
  const { out: auth1 } = await exec(conn, `docker exec kanban-crm wget -q -O- --timeout=10 --post-data='${payload}' --header="Content-Type: application/json" "http://pocketbase-jkc4oswoc00sw84wkgcsgk0c:8080/api/collections/_superusers/auth-with-password" 2>&1 || echo "FAILED"`);
  console.log('Superusers:', auth1);

  const { out: auth2 } = await exec(conn, `docker exec kanban-crm wget -q -O- --timeout=10 --post-data='${payload}' --header="Content-Type: application/json" "http://pocketbase-jkc4oswoc00sw84wkgcsgk0c:8080/api/admins/auth-with-password" 2>&1 || echo "FAILED"`);
  console.log('Admins:', auth2);

  console.log('\n=== Testing to see if any superusers exist ===');
  const { out: list } = await exec(conn, `docker exec pocketbase-jkc4oswoc00sw84wkgcsgk0c ./pocketbase superuser list 2>&1 || echo "Command failed"`);
  console.log('Superuser list:', list);

  const { out: adminList } = await exec(conn, `docker exec pocketbase-jkc4oswoc00sw84wkgcsgk0c ./pocketbase admin list 2>&1 || echo "Command failed"`);
  console.log('Admin list:', adminList);

  conn.end();
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
