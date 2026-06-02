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

  console.log('=== Recent Docker Logs for kanban-crm ===');
  const { out: logs } = await exec(conn, 'docker logs kanban-crm --tail 100 2>&1');
  console.log(logs);
  
  console.log('\n=== Error lines specifically ===');
  const { out: errLogs } = await exec(conn, 'docker logs kanban-crm 2>&1 | grep -i "error" | tail -n 20');
  console.log(errLogs);

  conn.end();
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
