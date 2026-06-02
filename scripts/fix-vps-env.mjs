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

  // Step 1: List all Docker networks
  console.log('=== All Docker networks ===');
  const { out: allNets } = await exec(conn, 'docker network ls');
  console.log(allNets);

  // Step 2: Get PocketBase container IP on each network
  console.log('\n=== PocketBase IPs ===');
  const { out: pbIps } = await exec(conn,
    `docker inspect pocketbase-jkc4oswoc00sw84wkgcsgk0c --format '{{json .NetworkSettings.Networks}}'`
  );
  console.log(pbIps);

  // Step 3: Get kanban-crm IPs
  console.log('\n=== kanban-crm IPs ===');
  const { out: crmIps } = await exec(conn,
    `docker inspect kanban-crm --format '{{json .NetworkSettings.Networks}}'`
  );
  console.log(crmIps);

  // Parse PocketBase IP
  let pbIP = null;
  try {
    const pbData = JSON.parse(pbIps);
    const nets = Object.values(pbData);
    if (nets.length > 0) {
      pbIP = nets[0].IPAddress;
      console.log('\n✅ PocketBase IP:', pbIP);
    }
  } catch(e) {
    console.log('Could not parse PocketBase networks:', e.message);
  }

  // Step 4: Find what networks each container is on using network inspect
  console.log('\n=== Scanning all networks for our containers ===');
  const { out: netList } = await exec(conn, "docker network ls --format '{{.Name}}'");
  const networks = netList.split('\n').filter(Boolean);

  let pbNetworkNames = [];
  let crmNetworkNames = [];

  for (const net of networks) {
    const { out: netInspect } = await exec(conn, `docker network inspect ${net} --format '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null`);
    const containers = netInspect.split(' ').map(c => c.trim()).filter(Boolean);
    if (containers.includes('pocketbase-jkc4oswoc00sw84wkgcsgk0c')) pbNetworkNames.push(net);
    if (containers.includes('kanban-crm')) crmNetworkNames.push(net);
  }

  console.log('PocketBase is on networks:', pbNetworkNames);
  console.log('kanban-crm is on networks:', crmNetworkNames);

  // Step 5: Connect kanban-crm to PocketBase's networks
  const missingNets = pbNetworkNames.filter(n => !crmNetworkNames.includes(n));
  console.log('\nNeed to connect kanban-crm to:', missingNets);

  for (const net of missingNets) {
    const { out, err, code } = await exec(conn, `docker network connect ${net} kanban-crm 2>&1`);
    console.log(`Connect to ${net}:`, code === 0 ? '✓ Done' : (err || out));
  }

  // Step 6: Test with IP directly
  if (pbIP) {
    await new Promise(r => setTimeout(r, 2000));
    console.log(`\n=== Testing PocketBase via IP (${pbIP}:8080) ===`);
    const { out: ipTest } = await exec(conn,
      `docker exec kanban-crm wget -q -O- --timeout=5 "http://${pbIP}:8080/api/health" 2>&1`
    );
    console.log('IP test:', ipTest || 'empty response');

    // Test hostname now (after network connect)
    const { out: hostTest } = await exec(conn,
      `docker exec kanban-crm wget -q -O- --timeout=5 "http://pocketbase-jkc4oswoc00sw84wkgcsgk0c:8080/api/health" 2>&1`
    );
    console.log('Hostname test:', hostTest || 'empty response');

    // Determine the working URL
    let workingUrl = null;
    if (hostTest && !hostTest.includes('bad address') && !hostTest.includes('FAILED')) {
      workingUrl = 'http://pocketbase-jkc4oswoc00sw84wkgcsgk0c:8080';
      console.log('\n✅ Hostname works! Using:', workingUrl);
    } else if (ipTest && !ipTest.includes('refused') && !ipTest.includes('FAILED') && !ipTest.includes('error')) {
      workingUrl = `http://${pbIP}:8080`;
      console.log('\n✅ IP works! Using:', workingUrl);
    } else {
      console.log('\n⚠  Neither hostname nor IP works from kanban-crm');
    }

    if (workingUrl) {
      // Update container env with working URL
      const { out: allEnv } = await exec(conn, 'docker inspect kanban-crm --format \'{{range .Config.Env}}{{println .}}{{end}}\'');
      const envLines = allEnv.split('\n').filter(Boolean);
      const updatedEnv = envLines.map(line =>
        line.startsWith('POCKETBASE_URL=') ? `POCKETBASE_URL=${workingUrl}` : line
      );
      const envFlags = updatedEnv.map(e => `-e "${e.replace(/"/g, '\\"')}"`).join(' ');

      const { out: inspectRaw } = await exec(conn, 'docker inspect kanban-crm --format \'{{json .}}\'');
      const inspect = JSON.parse(inspectRaw);
      const portBindings = inspect.HostConfig?.PortBindings || {};
      const portFlags = Object.entries(portBindings)
        .map(([cp, bindings]) => (bindings||[]).map(b =>
          `-p ${b.HostIp?b.HostIp+':':''}${b.HostPort}:${cp.replace('/tcp','').replace('/udp','')}`
        ).join(' ')).join(' ');

      const primaryNet = [...pbNetworkNames, ...crmNetworkNames][0] || 'coolify';
      const allNetsForContainer = [...new Set([...pbNetworkNames, ...crmNetworkNames])];
      const extraNets = allNetsForContainer.slice(1);

      console.log('\n⏹  Rebuilding container with working URL...');
      await exec(conn, 'docker stop kanban-crm && docker rm kanban-crm');
      const runCmd = `docker run -d --name kanban-crm --restart unless-stopped --network ${primaryNet} ${portFlags} ${envFlags} kanban-crm:latest`;
      const { out: newId, code: rc, err: re } = await exec(conn, runCmd);
      if (rc !== 0) { console.error('✗ Failed:', re); conn.end(); return; }
      console.log('✓ Started:', newId.substring(0,12));

      for (const net of extraNets) {
        await exec(conn, `docker network connect ${net} kanban-crm 2>&1`);
        console.log(`✓ Connected to: ${net}`);
      }

      await new Promise(r => setTimeout(r, 5000));
      const { out: finalTest } = await exec(conn,
        `docker exec kanban-crm wget -q -O- --timeout=5 "http://pocketbase-jkc4oswoc00sw84wkgcsgk0c:8080/api/health" 2>&1`
      );
      console.log('\n✅ Final connectivity:', finalTest || 'FAILED');

      const { out: startLog } = await exec(conn, 'docker logs kanban-crm --tail 10 2>&1');
      console.log('\n--- Startup logs ---\n' + startLog);
    }
  } else {
    // Try by IP anyway using direct docker exec
    console.log('\n⚠  Could not get PocketBase IP. Trying direct inspect...');
    const { out: raw } = await exec(conn, `docker inspect pocketbase-jkc4oswoc00sw84wkgcsgk0c 2>&1 | grep -A2 '"IPAddress"' | head -10`);
    console.log(raw);
  }

  conn.end();
  console.log('\n🏁 Script complete.');
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
