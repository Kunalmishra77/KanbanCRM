// "Assigned by" on story cards and in story details. Made-up data only (built client + mocked /api).
// Run (after npm run build): node e2e/assigned-by.test.mjs <outdir>
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

const iso = (d) => new Date(Date.now() + d * 86400000).toISOString();
const u = (id, firstName, lastName, userType = 'employee') => ({ id, firstName, lastName, email: `${id}@example.com`, userType, role: 'editor', team: 'Marketing' });
const me = u('sh', 'Shira', 'Writer'), boss = u('dp', 'Dev', 'Planner'), founder = u('vf', 'Vik', 'Founder', 'founder');
const users = [me, boss, founder];
const client = { id: 'c1', name: 'Sample Co', industry: 'IT', stage: 'Hot', averageProgress: '0', expectedRevenue: '0', revenueTotal: '0', createdAt: iso(-5), updatedAt: iso(-1) };
const st = (id, title, assignedBy) => ({ id, clientId: 'c1', title, description: 'x', assignedTo: 'sh', assignedBy, person: 'Shira Writer', priority: 'Medium', estimatedEffortHours: 0, actualHoursSpent: '0', dueDate: iso(2), status: 'To Do', progressPercent: 0, tags: [], createdAt: iso(-1), updatedAt: iso(-1) });
const stories = [st('s1', 'Blog post from Dev', 'dp'), st('s2', 'Ad copy from Vik', 'vf'), st('s3', 'My own note', 'sh'), st('s4', 'Old story', null)];

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
await ctx.route('**/api/**', (route) => {
  const p = new URL(route.request().url()).pathname;
  if (p === '/api/events') return route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: 'retry: 600000\n\n' });
  const one = stories.find((s) => p === `/api/stories/${s.id}`);
  const body = p === '/api/auth/user' ? me : p === '/api/users' ? users : p === '/api/clients' ? [client] : p === '/api/stories' ? stories : one ? one : p.startsWith('/api/notifications') ? { items: [], unread: 0 } : [];
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
const pg = await ctx.newPage();
await pg.goto(BASE + '/global-kanban?mine=1'); await pg.waitForTimeout(2500);
const labelFor = async (title) => pg.locator('div.group, div').filter({ has: pg.getByText(title, { exact: true }) }).last().getByTestId('assigned-by').innerText().catch(() => '?');
const cardText = async (title) => (await pg.locator('h3', { hasText: title }).locator('xpath=ancestor::*[.//*[@data-testid="assigned-by"]][1]').getByTestId('assigned-by').innerText().catch(() => '?')).trim();
ok(await cardText('Blog post from Dev') === 'by Dev', 'card: assigned by a colleague shows "by Dev"', await cardText('Blog post from Dev'));
ok(await cardText('Ad copy from Vik') === 'by Vik', 'card: assigned by a founder shows "by Vik"', await cardText('Ad copy from Vik'));
ok(await cardText('My own note') === 'Self', 'card: own story shows "Self"', await cardText('My own note'));
ok(await cardText('Old story') === '', 'card: an old story without the record shows nothing', await cardText('Old story'));
await pg.screenshot({ path: `${out}/assigned-by-cards.png` });
await pg.getByText('Blog post from Dev').first().click(); await pg.waitForTimeout(1500);
ok((await pg.getByTestId('details-assigned-by').innerText()) === 'Assigned by Dev Planner', 'details: "Assigned by Dev Planner"', await pg.getByTestId('details-assigned-by').innerText());

console.log(`\n${pass} passed, ${fail.length} failed`); for (const f of fail) console.log('FAIL', f);
await b.close(); server.close();
process.exit(fail.length ? 1 : 0);
