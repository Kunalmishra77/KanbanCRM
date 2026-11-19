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
  st('s7', 'Second ask from Sam', 'dp', 'su', { acceptedAt: null }),
];
const calls = [];

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
await ctx.route('**/api/**', async (route) => {
  const req = route.request();
  const p = new URL(req.url()).pathname;
  if (p === '/api/events') return route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: 'retry: 600000\n\n' });
  const m = p.match(/^\/api\/stories\/([^/]+)\/(accept|feedback|decline)$/);
  if (m && req.method() === 'POST') {
    calls.push({ id: m[1], kind: m[2], body: req.postData() });
    const body = JSON.parse(req.postData() || '{}');
    if (m[2] === 'accept') stories = stories.map((s) => (s.id === m[1] ? { ...s, acceptedAt: new Date().toISOString(), dueDate: body.dueDate || s.dueDate } : s));
    if (m[2] === 'decline') stories = stories.map((s) => (s.id === m[1] ? { ...s, assignedTo: s.assignedBy, acceptedAt: new Date().toISOString() } : s));
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
ok((await pg.getByTestId('board-me').getAttribute('aria-selected')) === 'true', 'opens on "All my work" inside My Work');
await pg.getByTestId('board-mine').click(); await pg.waitForTimeout(800);
let titles = await allTabsText();
ok(['My own plan', 'Old story without record', 'Accepted work from Sam', 'Founder task due tomorrow'].every((t) => titles.includes(t)), 'Mine: own stories + work I accepted', JSON.stringify(titles));
ok(!titles.some((t) => /New work from Sam|Second ask|Olu/.test(t)), 'Mine: not new (unanswered) work, not work I gave away', JSON.stringify(titles));
ok((await pg.getByTestId('nav-waiting-count').first().innerText()) === '2', 'menu shows 2 new');
ok(await pg.getByTestId('board-tabs').isVisible(), 'one switch inside My Work');
ok(!(await pg.locator('aside').getByText('Assigned by me', { exact: true }).isVisible().catch(() => false)), 'menu has a single My Work item (no extra board items)');
ok(!(await pg.getByTestId('board-all').isVisible().catch(() => false)), 'employees have no Team switch');
await pg.screenshot({ path: `${out}/boards-mywork.png` });

await pg.getByTestId('board-assigned').click(); await pg.waitForTimeout(800);
ok((await pg.getByTestId('board-assigned').getAttribute('aria-selected')) === 'true', 'switches to "Assigned to me"');
ok(new URL(pg.url()).search === '?board=assigned', 'URL follows the board', pg.url());
const waitingBox = pg.getByTestId('waiting-for-you');
ok(await waitingBox.isVisible() && /New work from Sam/.test(await waitingBox.innerText()) && /From Sam Boss/.test(await waitingBox.innerText()), 'inbox lists the new stories and who gave them');
ok((await pg.getByTestId('waiting-item').count()) === 2, 'two waiting');
ok(!(await pg.getByRole('tab', { name: /^To Do/ }).isVisible().catch(() => false)), 'Assigned to me is just the inbox (no columns)');
await pg.screenshot({ path: `${out}/boards-assigned.png` });

// decline with a reason
const second = pg.getByTestId('waiting-item').filter({ hasText: 'Second ask from Sam' });
await second.getByTestId('waiting-decline').click(); await pg.waitForTimeout(400);
ok(await pg.getByTestId('decline-confirm').isDisabled(), 'decline needs a reason');
await pg.getByTestId('decline-reason').fill('Full this week, 6 stories due');
await pg.screenshot({ path: `${out}/boards-decline.png` });
await pg.getByTestId('decline-confirm').click(); await pg.waitForTimeout(1200);
ok(calls.some((c) => c.kind === 'decline' && c.id === 's7' && /Full this week/.test(c.body)), 'decline sent with the reason', JSON.stringify(calls));
ok((await pg.getByTestId('waiting-item').count()) === 1, 'declined story leaves the inbox');

// accept with a date and time
await pg.getByTestId('waiting-accept').click(); await pg.waitForTimeout(400);
ok(await pg.getByTestId('accept-when').isVisible(), 'accept asks when you will do it');
const pick = new Date(Date.now() + 4 * 86400000); pick.setHours(15, 30, 0, 0);
const pad = (n) => String(n).padStart(2, '0');
await pg.getByTestId('accept-when').fill(`${pick.getFullYear()}-${pad(pick.getMonth() + 1)}-${pad(pick.getDate())}T15:30`);
await pg.screenshot({ path: `${out}/boards-accept.png` });
await pg.getByTestId('accept-confirm').click(); await pg.waitForTimeout(1200);
const acc = calls.find((c) => c.kind === 'accept' && c.id === 's2');
ok(acc && new Date(JSON.parse(acc.body).dueDate).getTime() === pick.getTime(), 'accept sends the picked date and time', acc?.body);
ok(!(await waitingBox.isVisible().catch(() => false)) && await pg.getByTestId('assigned-empty').isVisible(), 'inbox empty: "No new work waiting"');
await pg.getByTestId('board-mine').click(); await pg.waitForTimeout(800);
titles = await allTabsText();
ok(titles.includes('New work from Sam'), 'accepted story is now in Mine', JSON.stringify(titles));

// due date filter (on Mine)
await pg.getByTestId('filter-due').selectOption('tomorrow'); await pg.waitForTimeout(300);
titles = await allTabsText();
ok(titles.length === 1 && titles[0] === 'Founder task due tomorrow', 'Due tomorrow filter', JSON.stringify(titles));
await pg.getByTestId('filter-due').selectOption('custom'); await pg.waitForTimeout(300);
ok(await pg.getByTestId('filter-due-from').isVisible() && await pg.getByTestId('filter-due-to').isVisible(), 'custom range shows two date boxes');
await pg.getByTestId('filter-due').selectOption('any'); await pg.waitForTimeout(300);

// assigned by filter (on Mine)
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
ok((await pg.getByTestId('board-me').getAttribute('aria-selected')) === 'true', 'story link opens under All my work');
ok(!(await pg.getByTestId('button-delete-story').isVisible().catch(() => false)), 'cannot delete work somebody else gave you');
await pg.keyboard.press('Escape'); await pg.waitForTimeout(400);
await pg.goto(BASE + '/global-kanban?story=s1'); await pg.waitForTimeout(2200);
ok(await pg.getByTestId('button-delete-story').isVisible().catch(() => false), 'can delete your own story');
await pg.keyboard.press('Escape');

// dashboard "My work" links still show everything assigned to me
await pg.goto(BASE + '/global-kanban?mine=1&scope=open'); await pg.waitForTimeout(2200);
ok((await pg.getByTestId('board-me').getAttribute('aria-selected')) === 'true', 'mine=1 links: all my work');

console.log(`\n${pass} passed, ${fail.length} failed`); for (const f of fail) console.log('FAIL', f);
await b.close(); server.close();
process.exit(fail.length ? 1 : 0);
