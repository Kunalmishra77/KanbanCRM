// Dashboard at a realistic size (made-up people): screenshots per role and a layout-jump check on reload.
// Run (after npm run build): node e2e/dashboard-look.test.mjs <outdir>
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
const TEAMS = ['Sales', 'MIS', 'Development', 'Marketing', 'Design', 'Dispatch', 'HR', 'Accounts', 'Procurement'];
const names = ['Asha', 'Bilal', 'Chitra', 'Dev', 'Esha', 'Farhan', 'Gita', 'Hari', 'Isha', 'Jai', 'Kiran', 'Lata', 'Mohan', 'Neha'];
const users = names.map((n, i) => ({ id: 'u' + i, firstName: n, lastName: 'Test', email: `${n.toLowerCase()}@example.com`, userType: i === 0 ? 'team_lead' : 'employee', role: 'editor', team: TEAMS[i % TEAMS.length] }));
const founder = { id: 'f0', firstName: 'Fay', lastName: 'Founder', email: 'fay@example.com', userType: 'founder', role: 'admin', team: null };
const allUsers = [founder, ...users];
const clients = [{ id: 'c1', name: 'Demo Client', industry: 'IT', stage: 'Hot', averageProgress: '0', expectedRevenue: '0', revenueTotal: '0', createdAt: iso(-5), updatedAt: iso(-1) }];
let k = 0;
const st = (who, status, due, upd = -1, by = who) => ({ id: 's' + (++k), clientId: 'c1', title: `Task ${k} for ${who.firstName}`, description: '', assignedTo: who.id, assignedBy: by.id, acceptedAt: iso(-1), person: '', priority: 'Medium', estimatedEffortHours: 0, actualHoursSpent: '0', dueDate: iso(due), status, progressPercent: status === 'Done' ? 100 : 0, tags: [], createdAt: iso(-3), updatedAt: iso(upd) });
const stories = [];
users.forEach((u, i) => {
  stories.push(st(u, 'To Do', 1), st(u, 'In Progress', 3), st(u, 'Done', 0, 0));
  if (i % 3 === 0) stories.push(st(u, 'To Do', -2));
  if (i % 4 === 1) stories.push(st(u, 'Blocked', 2, -4));
});
stories.push(st(founder, 'To Do', 1), st(users[2], 'To Do', 2, -1, founder));
const health = (i) => (i % 3 === 0 ? 'attention' : i % 5 === 1 ? 'inactive' : i === 13 ? 'idle' : 'good');
const people = users.map((u, i) => ({ id: u.id, name: `${u.firstName} Test`, team: u.team, assigned: 4, open: 3, overdue: i % 3 === 0 ? 1 : 0, review: 0, planned: 2, plannedDone: i % 2, completed: 1, comments: i % 5 === 1 ? 0 : 2, actions: i % 5 === 1 ? 0 : 5, lastActiveAt: i % 5 === 1 ? null : iso(-0.1), health: health(i), reason: health(i) === 'attention' ? '1 overdue' : '1 of 2 due today done', away: null, otHours: 0 }));
const overview = {
  period: 'today', from: iso(-0.5), to: iso(0.5),
  summary: { peopleWorking: 13, peopleActive: 10, planned: 28, plannedDone: 12, completed: 14, overdue: 5, waitingReview: 0, comments: 20, pendingRequests: 1, otHours: 0, awayToday: { leave: [], wfh: [] } },
  teams: TEAMS.map((t, i) => ({ team: t, people: 2, active: 1, planned: 3, plannedDone: i % 3, completed: 1, overdue: i % 3 === 0 ? 1 : 0, review: 0, health: i % 3 === 0 ? 'attention' : 'good', reason: '' })),
  people, review: [], recentComments: [{ id: 'cm1', storyId: 's1', author: 'Asha Test', body: 'Calls done for today', storyTitle: 'Task 1', clientId: 'c1', client: 'Demo Client', at: iso(-0.05) }],
};

const b = await chromium.launch({ channel: 'chrome' });
async function as(me, { width = 1366, overviewDelay = 0 } = {}) {
  const ctx = await b.newContext({ viewport: { width, height: 900 } });
  await ctx.route('**/api/**', async (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p === '/api/events') return route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: 'retry: 600000\n\n' });
    if (p === '/api/overview' && overviewDelay) await new Promise((r) => setTimeout(r, overviewDelay));
    const body = p === '/api/auth/user' ? me : p === '/api/users' ? allUsers : p === '/api/clients' ? clients : p === '/api/stories' ? stories
      : p === '/api/overview' ? overview : p.startsWith('/api/notifications') ? { items: [], unread: 0 } : [];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  return { pg, errs };
}

// Founder: Team tab
let { pg, errs } = await as(founder, { overviewDelay: 1500 });
await pg.goto(BASE + '/'); await pg.waitForTimeout(700);
const before = await pg.getByTestId('dashboard-tabs').boundingBox();
ok(await pg.locator('[aria-busy]').first().isVisible().catch(() => false), 'while the team numbers load, placeholders hold the space');
await pg.waitForTimeout(2200);
const after = await pg.getByTestId('dashboard-tabs').boundingBox();
ok(before && after && Math.abs(before.y - after.y) < 2, 'nothing above the content jumps when the numbers arrive', JSON.stringify({ before: before?.y, after: after?.y }));
ok(await pg.getByTestId('needs-attention').isVisible(), 'founder opens on Team with "Needs attention" first');
const attention = await pg.getByTestId('needs-attention').innerText();
ok(/5\s*overdue/.test(attention) && /blocked/.test(attention) && /no update today/.test(attention) && /requests to approve/.test(attention), 'attention row: overdue, blocked, no update, requests', attention.replace(/\n/g, ' '));
ok(!/waiting for review/.test(attention), 'zero counts are left out (no review waiting)');
ok(await pg.getByTestId('stuck-work').isVisible(), 'one "Stuck work" list (overdue + blocked)');
ok(!(await pg.getByText('Active Bottlenecks').isVisible().catch(() => false)) && !(await pg.getByText('Employee Workload').isVisible().catch(() => false)) && !(await pg.getByText('Latest Activity').isVisible().catch(() => false)), 'duplicate blocks are gone');
ok(/No work assigned: Neha Test/.test(await pg.getByTestId('people-idle').innerText()), 'people with no work are one line, not cards');
await pg.screenshot({ path: `${out}/dash-founder-team.png`, fullPage: true });
const h = await pg.evaluate(() => document.documentElement.scrollHeight);
console.log('founder team tab height:', h);
await pg.getByTestId('overview-people').screenshot({ path: `${out}/dash-founder-people.png` });
await pg.getByTestId('summary-noupdate').click(); await pg.waitForTimeout(500);
ok(/No update today/.test(await pg.getByTestId('overview-people').locator('..').innerText()), '"no update" button filters the people list');
await pg.getByTestId('dash-tab-me').click(); await pg.waitForTimeout(600);
ok(await pg.getByTestId('my-work').isVisible(), 'My day tab');
await pg.screenshot({ path: `${out}/dash-founder-me.png`, fullPage: true });
await pg.getByTestId('dash-tab-business').click(); await pg.waitForTimeout(800);
ok(await pg.getByTestId('stat-card-clients').isVisible(), 'Business tab');
await pg.screenshot({ path: `${out}/dash-founder-business.png`, fullPage: true });
await pg.reload(); await pg.waitForTimeout(2500);
ok(await pg.getByTestId('stat-card-clients').isVisible(), 'the chosen tab is remembered after a reload');
ok(errs.length === 0, 'no page errors (founder)', errs.join(' | '));

// Employee: just My day, no tabs
({ pg, errs } = await as(users[2]));
await pg.goto(BASE + '/'); await pg.waitForTimeout(2500);
ok(!(await pg.getByTestId('dashboard-tabs').isVisible().catch(() => false)) && await pg.getByTestId('my-work').isVisible(), 'employee: My day only, no tabs');
await pg.screenshot({ path: `${out}/dash-employee.png`, fullPage: true });
ok(errs.length === 0, 'no page errors (employee)', errs.join(' | '));

// Phone, founder
({ pg, errs } = await as(founder, { width: 390 }));
await pg.goto(BASE + '/'); await pg.waitForTimeout(2500);
const overflow = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(overflow <= 1, 'phone: no sideways scrolling', String(overflow));
await pg.screenshot({ path: `${out}/dash-phone.png`, fullPage: true });

console.log(`\n${pass} passed, ${fail.length} failed`); for (const f of fail) console.log('FAIL', f);
await b.close(); server.close();
process.exit(fail.length ? 1 : 0);
