// My Work / Assigned to me / Assigned by me boards, Accept + feedback, new filters, delete rule.
// Made-up data only (built client + mocked /api). Run (after npm run build): node e2e/boards.test.mjs <outdir>
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
const endOfTomorrow = () => { const d = new Date(); d.setHours(23, 59, 0, 0); d.setDate(d.getDate() + 1); return d.toISOString(); };
const u = (id, firstName, lastName, userType = 'employee') => ({ id, firstName, lastName, email: `${id}@example.com`, userType, role: 'editor', team: 'Sales' });
const me = u('dp', 'Dev', 'Planner'), boss = u('su', 'Sam', 'Boss'), founder = u('vf', 'Vik', 'Founder', 'founder'), other = u('ot', 'Olu', 'Other');
const users = [me, boss, founder, other];
const client = { id: 'c1', name: 'Sample Co', industry: 'IT', stage: 'Hot', averageProgress: '0', expectedRevenue: '0', revenueTotal: '0', createdAt: iso(-5), updatedAt: iso(-1) };
const st = (id, title, assignedTo, assignedBy, extra = {}) => ({ id, clientId: 'c1', title, description: 'x', assignedTo, assignedBy, acceptedAt: iso(-1), person: '', priority: 'Medium', estimatedEffortHours: 0, actualHoursSpent: '0', dueDate: iso(5), status: 'To Do', progressPercent: 0, tags: [], createdAt: iso(-1), updatedAt: iso(-1), ...extra });
let stories = [
  st('s1', 'My own plan', 'dp', 'dp'),
  st('s2', 'New work from Sam', 'dp', 'su', { acceptedAt: null }),
  st('s3', 'Accepted work from Sam', 'dp', 'su', { status: 'In Progress', progressPercent: 30 }),
  st('s4', 'Old story without record', 'dp', null),
  st('s5', 'Work I gave Olu', 'ot', 'dp', { acceptedAt: null }),
  st('s6', 'Founder task due tomorrow', 'dp', 'vf', { dueDate: endOfTomorrow() }),
];
const calls = [];

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
await ctx.route('**/api/**', async (route) => {
  const req = route.request();
  const p = new URL(req.url()).pathname;
  if (p === '/api/events') return route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: 'retry: 600000\n\n' });
  const m = p.match(/^\/api\/stories\/([^/]+)\/(accept|feedback)$/);
  if (m && req.method() === 'POST') {
    calls.push({ id: m[1], kind: m[2], body: req.postData() });
    if (m[2] === 'accept') stories = stories.map((s) => (s.id === m[1] ? { ...s, acceptedAt: new Date().toISOString() } : s));
    return route.fulfill({ status: m[2] === 'accept' ? 200 : 201, contentType: 'application/json', body: JSON.stringify(stories.find((s) => s.id === m[1]) || {}) });
  }
  const one = stories.find((s) => p === `/api/stories/${s.id}`);
  const body = p === '/api/auth/user' ? me : p === '/api/users' ? users : p === '/api/clients' ? [client] : p === '/api/stories' ? stories : one ? one : p.startsWith('/api/notifications') ? { items: [], unread: 0 } : [];
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
const pg = await ctx.newPage();
const visible = async (t) => pg.getByText(t, { exact: true }).first().isVisible().catch(() => false);
const allTabsText = async () => { // every status tab's titles (list view shows one tab at a time)
  const seen = [];
  for (const col of ['To Do', 'In Progress', 'Blocked', 'Review', 'Done']) {
    await pg.getByRole('tab', { name: new RegExp(`^${col}`) }).click(); await pg.waitForTimeout(150);
    seen.push(...(await pg.locator('h3').allInnerTexts()));
  }
  return seen;
};

await pg.goto(BASE + '/global-kanban'); await pg.waitForTimeout(2500);
ok((await pg.getByTestId('board-title').innerText()) === 'My Work', 'opens on "My Work"');
let titles = await allTabsText();
ok(titles.includes('My own plan') && titles.includes('Old story without record'), 'My Work: own + unrecorded stories', JSON.stringify(titles));
ok(!titles.some((t) => /Sam|Founder|Olu/.test(t)), 'My Work: nothing assigned by others / to others', JSON.stringify(titles));
ok(await visible('Assigned to me'), 'menu has "Assigned to me"');
ok((await pg.getByTestId('nav-waiting-count').first().innerText()) === '1', 'menu shows 1 waiting');
ok(/My Work\s*2/.test(await pg.getByTestId('board-mine').innerText()) && /Assigned to me\s*3/.test(await pg.getByTestId('board-assigned').innerText()) && /Assigned by me\s*1/.test(await pg.getByTestId('board-given').innerText()), 'tab counts 2 / 3 / 1',
  [await pg.getByTestId('board-mine').innerText(), await pg.getByTestId('board-assigned').innerText(), await pg.getByTestId('board-given').innerText()].join(' | '));
ok(!(await pg.getByTestId('board-all').isVisible().catch(() => false)), 'employees have no "Everyone" tab');
await pg.screenshot({ path: `${out}/boards-mywork.png` });

await pg.getByTestId('board-assigned').click(); await pg.waitForTimeout(800);
ok((await pg.getByTestId('board-title').innerText()) === 'Assigned to me', 'switches to "Assigned to me"');
ok(new URL(pg.url()).search === '?board=assigned', 'URL follows the board', pg.url());
const waitingBox = pg.getByTestId('waiting-for-you');
ok(await waitingBox.isVisible() && /New work from Sam/.test(await waitingBox.innerText()) && /From Sam Boss/.test(await waitingBox.innerText()), 'waiting box lists the new story and who gave it');
titles = await allTabsText();
ok(!titles.includes('New work from Sam') && titles.includes('Accepted work from Sam') && titles.includes('Founder task due tomorrow'), 'columns: accepted work only', JSON.stringify(titles));
ok(await pg.getByTestId('filter-assigned-by').isVisible(), 'Assigned by filter shown');
await pg.screenshot({ path: `${out}/boards-assigned.png` });

// feedback keeps it waiting
await pg.getByTestId('waiting-feedback').click(); await pg.waitForTimeout(400);
ok(await pg.getByTestId('feedback-send').isDisabled(), 'feedback needs text');
await pg.getByTestId('feedback-text').fill('Full this week, can start Monday');
await pg.screenshot({ path: `${out}/boards-feedback.png` });
await pg.getByTestId('feedback-send').click(); await pg.waitForTimeout(800);
ok(calls.some((c) => c.kind === 'feedback' && c.id === 's2' && /Monday/.test(c.body)), 'feedback sent', JSON.stringify(calls));
ok(await waitingBox.isVisible(), 'after feedback the story still waits');

// accept
await pg.getByTestId('waiting-accept').click(); await pg.waitForTimeout(1200);
ok(calls.some((c) => c.kind === 'accept' && c.id === 's2'), 'accept sent');
ok(!(await waitingBox.isVisible().catch(() => false)), 'waiting box gone after accepting');
titles = await allTabsText();
ok(titles.includes('New work from Sam'), 'accepted story now in the columns', JSON.stringify(titles));

// due date filter
await pg.getByTestId('filter-due').selectOption('tomorrow'); await pg.waitForTimeout(300);
titles = await allTabsText();
ok(titles.length === 1 && titles[0] === 'Founder task due tomorrow', 'Due tomorrow filter', JSON.stringify(titles));
await pg.getByTestId('filter-due').selectOption('custom'); await pg.waitForTimeout(300);
ok(await pg.getByTestId('filter-due-from').isVisible() && await pg.getByTestId('filter-due-to').isVisible(), 'custom range shows two date boxes');
await pg.getByTestId('filter-due').selectOption('any'); await pg.waitForTimeout(300);

// assigned by filter
await pg.getByTestId('filter-assigned-by').click(); await pg.waitForTimeout(300);
await pg.getByRole('option', { name: /Vik Founder/ }).or(pg.getByText(/Vik Founder/).last()).first().click(); await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
titles = await allTabsText();
ok(titles.length === 1 && titles[0] === 'Founder task due tomorrow', 'Assigned by Vik filter', JSON.stringify(titles));

// assigned by me
await pg.getByTestId('board-given').click(); await pg.waitForTimeout(800);
titles = await allTabsText();
ok(titles.length === 1 && titles[0] === 'Work I gave Olu', 'Assigned by me lists what I gave', JSON.stringify(titles));
await pg.getByRole('tab', { name: /^To Do/ }).click(); await pg.waitForTimeout(200);
ok(await pg.getByTestId('not-accepted').first().isVisible(), '"Not accepted yet" badge for the assigner');
await pg.screenshot({ path: `${out}/boards-given.png` });

// delete rule in the story window
await pg.goto(BASE + '/global-kanban?story=s3'); await pg.waitForTimeout(2200);
ok((await pg.getByTestId('board-title').innerText()) === 'Assigned to me', 'story link opens on its board');
ok(!(await pg.getByTestId('button-delete-story').isVisible().catch(() => false)), 'cannot delete work somebody else gave you');
await pg.keyboard.press('Escape'); await pg.waitForTimeout(400);
await pg.goto(BASE + '/global-kanban?story=s1'); await pg.waitForTimeout(2200);
ok(await pg.getByTestId('button-delete-story').isVisible().catch(() => false), 'can delete your own story');
await pg.keyboard.press('Escape');

// dashboard "My work" links still show everything assigned to me
await pg.goto(BASE + '/global-kanban?mine=1&scope=open'); await pg.waitForTimeout(2200);
ok((await pg.getByTestId('board-title').innerText()) === 'All my stories', 'mine=1 links: all my stories');

console.log(`\n${pass} passed, ${fail.length} failed`); for (const f of fail) console.log('FAIL', f);
await b.close(); server.close();
process.exit(fail.length ? 1 : 0);
