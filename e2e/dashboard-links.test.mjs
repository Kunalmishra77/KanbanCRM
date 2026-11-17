// Dashboard clicks go to the right place. Made-up data only: serves the built client and answers /api with
// fixtures (no server, no database, no real people). Run (after npm run build): node e2e/dashboard-links.test.mjs
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

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
const u = (id, firstName, lastName, userType, team) => ({ id, firstName, lastName, email: `${id}@example.com`, userType, role: 'editor', team });
const founder = u('f1', 'Fiona', 'Founder', 'founder', null);
const lead = u('l1', 'Lena', 'Lead', 'team_lead', 'Sales');
const sales = u('s1u', 'Sam', 'Seller', 'employee', 'Sales');
const dev = u('d1u', 'Dee', 'Dev', 'employee', 'Development');
const users = [founder, lead, sales, dev];
const client = { id: 'c1', name: 'Sample Co', industry: 'IT', stage: 'Hot', averageProgress: '0', expectedRevenue: '0', revenueTotal: '0', createdAt: iso(-5), updatedAt: iso(-1) };
const coldClient = { ...client, id: 'c2', name: 'Cold Co', stage: 'Cold' };
const st = (id, title, who, status = 'To Do') => ({ id, clientId: 'c1', title, description: 'x', assignedTo: who.id, person: `${who.firstName} ${who.lastName}`, priority: 'Medium', estimatedEffortHours: 0, actualHoursSpent: '0', dueDate: iso(1), status, progressPercent: 0, tags: [], createdAt: iso(-1), updatedAt: iso(-1) });
const stories = [st('st1', 'Sales call list', sales, 'Review'), st('st2', 'Fix login bug', dev), st('st3', 'Lead own task', lead),
  { ...st('st4', 'Finished report', dev, 'Done'), updatedAt: iso(0), dueDate: iso(0.2) },
  { ...st('st5', 'Late invoice chase', sales), dueDate: iso(-2) },
  { ...st('st6', 'Next month plan', sales), dueDate: iso(40) },
  { ...st('st7', 'Soon task', sales), dueDate: iso(3) },
  { ...st('st8', 'Old done', sales, 'Done'), updatedAt: iso(-3), dueDate: iso(-3) },
  { ...st('st9', 'Founder own', founder), dueDate: iso(2) },
  { ...st('st10', 'Cold client follow-up', sales), clientId: 'c2', dueDate: iso(4) }];
const person = (x) => ({ id: x.id, name: `${x.firstName} ${x.lastName}`, team: x.team || 'No team set', assigned: 1, open: 1, overdue: 0, review: 0, planned: 1, plannedDone: 0, completed: 0, comments: 0, actions: 1, lastActiveAt: iso(0), health: 'good', reason: 'On track' });
const overview = {
  period: 'week', from: iso(-1), to: iso(5),
  summary: { peopleWorking: 3, peopleActive: 3, planned: 3, plannedDone: 0, completed: 0, overdue: 0, waitingReview: 1, comments: 1, pendingRequests: 0, otHours: 0, awayToday: { leave: [], wfh: [] } },
  teams: [{ team: 'Sales', people: 2, active: 2, planned: 2, plannedDone: 0, completed: 0, overdue: 0, review: 1, health: 'good', reason: 'On track' }, { team: 'Development', people: 1, active: 1, planned: 1, plannedDone: 0, completed: 0, overdue: 0, review: 0, health: 'good', reason: 'On track' }],
  people: [person(lead), person(sales), person(dev)],
  review: [{ storyId: 'st1', title: 'Sales call list', clientId: 'c1', client: 'Sample Co', assignee: 'Sam Seller', team: 'Sales', waitingDays: 1 }],
  recentComments: [{ id: 'cm1', storyId: 'st2', author: 'Dee Dev', body: 'Pushed a fix', storyTitle: 'Fix login bug', clientId: 'c1', client: 'Sample Co', at: iso(0) }],
};

const b = await chromium.launch({ channel: 'chrome' });
async function as(me, visible) {
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
  await ctx.route('**/api/**', (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p === '/api/events') return route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: 'retry: 600000\n\n' });
    const body = p === '/api/auth/user' ? me : p === '/api/users' ? users : p === '/api/clients' ? [client, coldClient] : p === '/api/stories' ? visible
      : p.startsWith('/api/stories/') && !p.endsWith('/comments') && !p.endsWith('/emails') ? visible.find((s) => p.endsWith(s.id)) || {}
      : p === '/api/overview' ? overview : p.startsWith('/api/notifications') ? { items: [], unread: 0 } : [];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return ctx.newPage();
}
const titles = async (p) => (await p.locator('h3').allInnerTexts()).filter((t) => /Sales call|login bug|own task|Finished report|Late invoice|Next month|Soon task|Old done|Founder own|Cold client/.test(t)).sort();
const allBoard = async (p) => { const out = []; for (const tab of ['To Do', 'In Progress', 'Review', 'Done']) { await p.getByRole('tab', { name: new RegExp('^' + tab) }).click(); await p.waitForTimeout(300); out.push(...await titles(p)); } return out.sort(); };

// Founder
let p = await as(founder, stories);
await p.goto(BASE + '/'); await p.waitForTimeout(2000);
await p.getByTestId('team-Sales').click(); await p.waitForTimeout(1500);
ok(p.url().includes('/global-kanban') && p.url().includes('team=Sales'), 'team card opens the Global Board for that team', p.url());
ok(JSON.stringify(await allBoard(p)) === JSON.stringify(['Cold client follow-up', 'Late invoice chase', 'Lead own task', 'Next month plan', 'Old done', 'Sales call list', 'Soon task']), 'board shows only Sales stories', JSON.stringify(await allBoard(p)));
await p.goto(BASE + '/'); await p.waitForTimeout(2000);
await p.getByTestId('overview-review').getByText('Sales call list').click(); await p.waitForTimeout(1800);
ok(await p.getByRole('dialog').getByText('Sales call list').first().isVisible(), '"Waiting for review" opens that story', p.url());
await p.goto(BASE + '/'); await p.waitForTimeout(2000);
await p.getByText('Pushed a fix').click(); await p.waitForTimeout(1800);
ok(await p.getByRole('dialog').getByText('Fix login bug').first().isVisible(), '"Latest comments" opens that story');
await p.goto(BASE + '/'); await p.waitForTimeout(2000);
await p.getByTestId('stat-open-Dee Dev').click(); await p.waitForTimeout(1500);
ok(JSON.stringify(await titles(p)) === JSON.stringify(['Fix login bug']), "a person's numbers open their stories", JSON.stringify(await titles(p)));

// Summary cards open exactly what they count
const card = async (key) => { await p.goto(BASE + '/'); await p.waitForTimeout(2000); await p.getByTestId('summary-' + key).click(); await p.waitForTimeout(1500); return allBoard(p); };
ok(JSON.stringify(await card('planned')) === JSON.stringify(['Cold client follow-up', 'Finished report', 'Fix login bug', 'Founder own', 'Lead own task', 'Sales call list', 'Soon task']), 'Planned card: stories due in the period (not overdue, not next month)', JSON.stringify(await allBoard(p)));
ok(JSON.stringify(await card('completed')) === JSON.stringify(['Finished report']), 'Completed card: finished in the period', JSON.stringify(await allBoard(p)));
ok(JSON.stringify(await card('overdue')) === JSON.stringify(['Late invoice chase']), 'Overdue card: overdue stories', JSON.stringify(await allBoard(p)));
ok(JSON.stringify(await card('review')) === JSON.stringify(['Sales call list']), 'Review card: waiting for review', JSON.stringify(await allBoard(p)));
await p.goto(BASE + '/'); await p.waitForTimeout(2000);
await p.getByTestId('summary-active').click(); await p.waitForTimeout(800);
ok(await p.getByTestId('people-show-all').isVisible(), 'People active card: shows only active people, with "show all"');

// "My work" numbers (everyone): an employee like Deepak
const salesOnly = stories.filter((x) => x.assignedTo === sales.id);
p = await as(sales, salesOnly);
const mw = async (key) => { await p.goto(BASE + '/'); await p.waitForTimeout(2000); await p.getByTestId('mywork-' + key).click(); await p.waitForTimeout(1500); return allBoard(p); };
ok(JSON.stringify(await mw('overdue')) === JSON.stringify(['Late invoice chase']), 'My work Overdue opens my overdue stories', JSON.stringify(await allBoard(p)));
ok(JSON.stringify(await mw('due7')) === JSON.stringify(['Cold client follow-up', 'Sales call list', 'Soon task']), 'My work Due in 7 days opens those', JSON.stringify(await allBoard(p)));
ok(JSON.stringify(await mw('done')) === JSON.stringify(['Old done']), 'My work Completed opens my finished stories', JSON.stringify(await allBoard(p)));
ok((await mw('assigned')).length === salesOnly.length, 'My work Assigned to me opens all my stories');
await p.goto(BASE + '/'); await p.waitForTimeout(2000);
await p.getByTestId('mywork-status-Review').click(); await p.waitForTimeout(1500);
ok((await p.getByRole('tab', { name: /^Review/ }).getAttribute('data-state')) === 'active' && JSON.stringify(await titles(p)) === JSON.stringify(['Sales call list']), 'status badge opens that column');
await p.goto(BASE + '/'); await p.waitForTimeout(2000);
await p.getByTestId('my-temp-Hot').click(); await p.waitForTimeout(1500);
ok(p.url().includes('/global-kanban') && p.url().includes('stage=Hot'), 'Hot stories tile opens the board, not clients', p.url());
ok(JSON.stringify(await allBoard(p)) === JSON.stringify(['Late invoice chase', 'Next month plan', 'Sales call list', 'Soon task']), 'shows my open stories of Hot clients only', JSON.stringify(await allBoard(p)));
// A founder's "Assigned to me" shows only the founder's own stories
p = await as(founder, stories);
ok(JSON.stringify(await mw('assigned')) === JSON.stringify(['Founder own']), "founder: Assigned to me is only the founder's own", JSON.stringify(await allBoard(p)));

// Team lead: links about a teammate must not be hidden by "My stories"
const salesStories = stories.filter((s) => s.id !== 'st2' && s.id !== 'st9');
p = await as(lead, salesStories);
await p.goto(BASE + '/'); await p.waitForTimeout(2000);
await p.getByTestId('stat-open-Sam Seller').click(); await p.waitForTimeout(1500);
ok((await p.getByTestId('board-all').getAttribute('aria-selected')) === 'true', "lead: a teammate's link switches to the whole team");
ok(JSON.stringify(await allBoard(p)) === JSON.stringify(['Cold client follow-up', 'Late invoice chase', 'Next month plan', 'Sales call list', 'Soon task']), "lead: shows the teammate's open stories", JSON.stringify(await allBoard(p)));
await p.goto(BASE + '/global-kanban'); await p.waitForTimeout(2000);
ok((await p.getByTestId('board-mine').getAttribute('aria-selected')) === 'true', 'lead: opening the board directly starts on My Work');

console.log(`\n${pass} passed, ${fail.length} failed`); for (const f of fail) console.log('FAIL', f);
await b.close(); server.close();
process.exit(fail.length ? 1 : 0);
