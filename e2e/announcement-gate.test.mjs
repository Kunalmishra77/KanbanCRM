// New announcements cover the screen until "Got it". Made-up data only (built client + mocked /api).
// Run (after npm run build): node e2e/announcement-gate.test.mjs <outdir>
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] || '.';
const ROOT = path.resolve('dist/public');
const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(ROOT, 'index.html');
  res.setHeader('content-type', MIME[path.extname(p)] || 'application/octet-stream');
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const BASE = `http://localhost:${server.address().port}`;
let pass = 0; const fail = [];
const ok = (c, n, x = '') => { if (c) pass++; else fail.push(n + (x ? '  -> ' + x : '')); };

const iso = (m) => new Date(Date.now() - m * 60000).toISOString();
const me = { id: 'u1', firstName: 'Test', lastName: 'Person', email: 'test@example.com', userType: 'employee', role: 'editor', team: 'Sales' };
const announcements = [
  { id: 'a1', title: 'Office closed Friday', body: 'The office is closed this Friday for maintenance.\nWork from home.', postedBy: 'HR', createdAt: iso(30), isActive: true },
  { id: 'a2', title: 'New leave policy', body: 'Please read the new leave policy in Internal.', postedBy: 'HR', createdAt: iso(10), isActive: true },
];
let notes = [
  { id: 'n1', type: 'announcement', title: '📢 Office closed Friday', message: 'HR: The office is closed…', link: '/announcements', entityType: 'announcement', entityId: 'a1', isRead: false, createdAt: iso(30) },
  { id: 'n2', type: 'announcement', title: '📢 New leave policy', message: 'HR: Please read…', link: '/announcements', entityType: 'announcement', entityId: 'a2', isRead: false, createdAt: iso(10) },
  { id: 'n3', type: 'request_decided', title: 'Leave approved', message: 'Your leave was approved', link: '/services', isRead: true, createdAt: iso(60) },
];
const marked = [];

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.route('**/api/**', async (route) => {
  const p = new URL(route.request().url()).pathname;
  if (p === '/api/events') return route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: 'retry: 600000\n\n' });
  if (p === '/api/notifications/read') {
    const ids = JSON.parse(route.request().postData() || '{}').ids || [];
    marked.push(...ids); notes = notes.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n));
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  }
  const body = p === '/api/auth/user' ? me : p === '/api/users' ? [me] : p === '/api/announcements' ? announcements
    : p === '/api/notifications' ? { items: notes, unread: notes.filter((n) => !n.isRead).length } : [];
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
const pg = await ctx.newPage();
await pg.goto(BASE + '/'); await pg.waitForTimeout(2500);
const gate = pg.getByTestId('announcement-gate');
ok(await gate.isVisible(), 'a new announcement covers the screen');
ok(/Office closed Friday/.test(await gate.innerText()) && /1 of 2/i.test(await gate.innerText()), 'oldest first, "1 of 2"', await gate.innerText());
ok(/Work from home\./.test(await pg.getByTestId('announcement-body').innerText()), 'shows the full announcement text');
await pg.screenshot({ path: `${out}/announcement-gate.png` });
await pg.keyboard.press('Escape'); await pg.waitForTimeout(400);
ok(await gate.isVisible(), 'Esc does not close it');
await pg.mouse.click(20, 20); await pg.waitForTimeout(400);
ok(await gate.isVisible(), 'clicking outside does not close it');
await pg.screenshot({ path: `${out}/announcement-after-outside.png` });
console.log('gates:', await pg.getByTestId('announcement-gate').count(), 'ack box:', JSON.stringify(await pg.getByTestId('announcement-ack').boundingBox()));
await pg.getByTestId('announcement-ack').click(); await pg.waitForTimeout(1200);
ok(marked.includes('n1'), '"Got it" records it as seen', JSON.stringify(marked));
ok(await gate.isVisible() && /New leave policy/.test(await gate.innerText()), 'then the next announcement comes');
await pg.getByTestId('announcement-ack').click(); await pg.waitForTimeout(1200);
ok(!(await gate.isVisible().catch(() => false)), 'after the last one the app is usable');
await pg.reload(); await pg.waitForTimeout(2500);
ok(!(await pg.getByTestId('announcement-gate').isVisible().catch(() => false)), 'does not come back after a reload');

console.log(`\n${pass} passed, ${fail.length} failed`); for (const f of fail) console.log('FAIL', f);
await b.close(); server.close();
process.exit(fail.length ? 1 : 0);
