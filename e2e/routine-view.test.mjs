// "Where did my daily tasks go?": own routines + routines set up by someone else, finished copies from earlier days.
// Made-up data only (built client + mocked /api). Run (after npm run build): node e2e/routine-view.test.mjs <outdir>
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

const ymd = (d) => { const t = new Date(Date.now() + d * 86400000); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
const iso = (d) => new Date(Date.now() + d * 86400000).toISOString();
const me = { id: 'dp', firstName: 'Dev', lastName: 'Planner', email: 'dev@example.com', userType: 'employee', role: 'editor', team: 'Marketing' };
const boss = { id: 'su', firstName: 'Sam', lastName: 'Boss', email: 'sam@example.com', userType: 'chief_of_staff', role: 'editor', team: null };
const client = { id: 'c1', name: 'Demo Client', industry: 'IT', stage: 'Hot', averageProgress: '0', expectedRevenue: '0', revenueTotal: '0', createdAt: iso(-5), updatedAt: iso(-1) };
let k = 0;
const copy = (title, day, status, by = me) => ({ id: 'r' + (++k), clientId: 'c1', title, description: '', assignedTo: me.id, assignedBy: by.id, acceptedAt: iso(day), person: '', priority: 'Medium', estimatedEffortHours: 0, actualHoursSpent: '0', dueDate: `${ymd(day)}T23:59:00+05:30`, status, progressPercent: status === 'Done' ? 100 : 0, tags: ['recurring', 'daily'], recurringTaskId: 'rule-' + title, occurrenceDate: ymd(day), createdAt: iso(day), updatedAt: iso(day) });
const stories = [
  copy('Google Ads', -2, 'Done'), copy('Google Ads', -1, 'Done'), copy('Google Ads', 0, 'To Do'),
  copy('Meta Ads', -1, 'Done'), copy('Meta Ads', 0, 'In Progress'),
  copy('Lead Generation', -1, 'Done', boss), copy('Lead Generation', 0, 'To Do', boss),
  { id: 'n1', clientId: 'c1', title: 'One-off report', description: '', assignedTo: me.id, assignedBy: me.id, acceptedAt: iso(-1), person: '', priority: 'Medium', estimatedEffortHours: 0, actualHoursSpent: '0', dueDate: iso(-1), status: 'Done', progressPercent: 100, tags: [], createdAt: iso(-2), updatedAt: iso(-1) },
];

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
await ctx.route('**/api/**', (route) => {
  const p = new URL(route.request().url()).pathname;
  if (p === '/api/events') return route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: 'retry: 600000\n\n' });
  const body = p === '/api/auth/user' ? me : p === '/api/users' ? [me, boss] : p === '/api/clients' ? [client] : p === '/api/stories' ? stories : p.startsWith('/api/notifications') ? { items: [], unread: 0 } : [];
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
const pg = await ctx.newPage();
const tab = async (name) => { await pg.getByRole('tab', { name: new RegExp('^' + name) }).click(); await pg.waitForTimeout(250); return (await pg.locator('h3').allInnerTexts()).sort(); };
await pg.goto(BASE + '/global-kanban'); await pg.waitForTimeout(2500);
ok((await pg.getByTestId('board-me').getAttribute('aria-selected')) === 'true', 'My Work opens on "All my work"');
const todo = await tab('To Do'); const prog = await tab('In Progress');
ok(JSON.stringify(todo) === JSON.stringify(['Google Ads', 'Lead Generation']), "today's copies, own AND set up by someone else, are together in To Do", JSON.stringify(todo));
ok(JSON.stringify(prog) === JSON.stringify(['Meta Ads']), 'In Progress', JSON.stringify(prog));
ok((await pg.getByTestId('routine-day').allInnerTexts()).every((t) => t === "Today's copy"), 'cards say "Today\'s copy"');
let done = await tab('Done');
ok(JSON.stringify(done) === JSON.stringify(['One-off report']), "Done hides earlier days' routine copies (one-off stories stay)", JSON.stringify(done));
ok(/Show 4 earlier routine copies/.test(await pg.getByTestId('toggle-old-routines').innerText()), 'and says how many are tucked away', await pg.getByTestId('toggle-old-routines').innerText());
await pg.screenshot({ path: `${out}/routine-done-hidden.png` });
await pg.getByTestId('toggle-old-routines').click(); await pg.waitForTimeout(300);
done = (await pg.locator('h3').allInnerTexts());
ok(done.length === 5, 'one click shows them', JSON.stringify(done));
ok((await pg.getByTestId('routine-day').allInnerTexts()).some((t) => /copy$/.test(t) && t !== "Today's copy"), 'older copies are labelled with their day');
await pg.screenshot({ path: `${out}/routine-done-shown.png` });
// the split views still work
await pg.getByTestId('board-mine').click(); await pg.waitForTimeout(800);
ok(JSON.stringify(await tab('To Do')) === JSON.stringify(['Google Ads', 'Lead Generation']), 'Mine: my routines, including the one Sam set up for me');
await pg.getByTestId('board-assigned').click(); await pg.waitForTimeout(800);
ok(await pg.getByTestId('assigned-empty').isVisible(), 'Assigned to me: nothing new (routines need no accepting)');

console.log(`\n${pass} passed, ${fail.length} failed`); for (const f of fail) console.log('FAIL', f);
await b.close(); server.close();
process.exit(fail.length ? 1 : 0);
