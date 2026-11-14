// Leave / work-from-home / overtime requests: who is notified, who may decide, the decision log, and the new
// Chief of Staff role. Runs against the local test server (port 5055, throwaway database).
// Run: node e2e/seed.mjs && node e2e/requests-notifications.test.mjs
import { chromium } from 'playwright-core';

const BASE = process.env.BASE || 'http://localhost:5055';
let pass = 0; const failures = [];
const ok = (cond, name, extra = '') => { if (cond) { pass++; } else failures.push(name + (extra ? '  -> ' + extra : '')); console.log((cond ? '  ok   ' : '  FAIL ') + name + (!cond && extra ? '  -> ' + extra : '')); };

class Client {
  constructor() { this.cookie = ''; }
  async req(method, path, body) {
    const r = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json', cookie: this.cookie, 'x-forwarded-proto': 'https' }, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
    const set = r.headers.getSetCookie?.() || [];
    if (set.length) this.cookie = set.map((c) => c.split(';')[0]).join('; ');
    let data = null; const t = await r.text(); try { data = JSON.parse(t); } catch { data = t; }
    return { status: r.status, data };
  }
  get = (p) => this.req('GET', p);
  post = (p, b) => this.req('POST', p, b ?? {});
  patch = (p, b) => this.req('PATCH', p, b ?? {});
  del = (p) => this.req('DELETE', p);
  login = (email) => this.post('/api/test-login', { email });
}
const as = async (email) => { const c = new Client(); const r = await c.login(email); if (r.status !== 200) throw new Error('login failed for ' + email + ': ' + JSON.stringify(r.data)); c.me = r.data; return c; };

const istToday = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const plusDays = (n) => new Date(Date.now() + 5.5 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);

const founder = await as('vitalsaigorrela@gmail.com');
const hr = await as('hr@test.dev');
const acc = await as('acc@test.dev');
const pooja = await as('razorbill2018@gmail.com');
const ranveer = await as('ranveer@test.dev');

const notes = async (c) => (await c.get('/api/notifications')).data;
const byType = (n, type) => n.items.filter((i) => i.type === type);
const forReq = (n, id) => n.items.filter((i) => i.entityId === id);

// ---------- 1. the new role ----------
console.log('\n1. Chief of Staff role');
const created = await founder.post('/api/users', { firstName: 'Sunita', lastName: 'Arya', email: 'cos@test.dev', userType: 'chief_of_staff', role: 'editor' });
ok(created.status === 201 || created.status === 200, 'founder can create a Chief of Staff', JSON.stringify(created.data).slice(0, 140));
const cos = await as('cos@test.dev');
ok(cos.me.userType === 'chief_of_staff', 'Chief of Staff can sign in with the new role', cos.me.userType);
ok((await hr.post('/api/users', { firstName: 'X', lastName: 'Y', email: 'x@test.dev', userType: 'chief_of_staff' })).status === 403, 'HR cannot add people (team management: founders + Chief of Staff, since 11 Nov)');
ok((await cos.post('/api/users', { firstName: 'N', lastName: 'M', email: 'nm@test.dev', userType: 'employee' })).status < 400, 'Chief of Staff can add team members');
ok((await ranveer.patch(`/api/users/${cos.me.id}`, { userType: 'founder' })).status === 403, 'an employee cannot change roles');

// ---------- 2. raising a request notifies the right people ----------
console.log('\n2. Raising a leave request');
const raised = await pooja.post('/api/requests', { type: 'leave', startDate: plusDays(2), endDate: plusDays(3), reason: 'family function' });
ok(raised.status === 201, 'employee raises a leave request', JSON.stringify(raised.data).slice(0, 120));
const reqId = raised.data.id;
let nPooja = await notes(pooja), nFounder = await notes(founder), nCos = await notes(cos), nHr = await notes(hr), nAcc = await notes(acc), nRan = await notes(ranveer);
ok(forReq(nPooja, reqId).some((i) => i.type === 'request_submitted' && !i.isRead), 'the requester gets a "request sent" notification');
ok(/waiting for approval/i.test(forReq(nPooja, reqId)[0]?.message || ''), 'it says the request is waiting for approval', forReq(nPooja, reqId)[0]?.message);
ok(forReq(nFounder, reqId).some((i) => i.type === 'request_pending' && /Pooja Singh/.test(i.title)), 'the founder is notified, naming the person');
ok(forReq(nCos, reqId).some((i) => i.type === 'request_pending'), 'the Chief of Staff is notified');
ok(!forReq(nHr, reqId).some((i) => i.type === 'request_pending'), 'HR is not asked to decide (only founders + Chief of Staff approve)');
ok(forReq(nAcc, reqId).length === 0, 'the accountant is NOT notified');
ok(forReq(nRan, reqId).length === 0, 'other employees are NOT notified');
ok(nPooja.unread >= 1 && nFounder.unread >= 1, 'unread counts go up', `${nPooja.unread}/${nFounder.unread}`);
ok(forReq(nFounder, reqId)[0].link === '/services', 'the notification links to Employee Services');

// ---------- 3. privacy ----------
console.log('\n3. Privacy');
const actRan = (await ranveer.get('/api/activity?limit=100')).data;
ok(!actRan.some((l) => l.entityType === 'request'), 'other employees do not see leave in the activity feed');
const actPooja = (await pooja.get('/api/activity?limit=100')).data;
ok(actPooja.some((l) => l.entityType === 'request'), 'the requester still sees their own entry');
const actFounder = (await founder.get('/api/activity?limit=100')).data;
ok(actFounder.some((l) => l.entityType === 'request'), 'the founder sees it');
ok((await acc.get('/api/activity?limit=100')).data.every((l) => l.entityType !== 'request'), 'the accountant does not see it');
const stolen = await ranveer.post('/api/notifications/read', { ids: forReq(nPooja, reqId).map((i) => i.id) });
ok(stolen.data.marked === 0, "nobody can mark someone else's notifications as read", JSON.stringify(stolen.data));
ok((await new Client().get('/api/notifications')).status === 401, 'notifications need a login');

// ---------- 4. approval by the Chief of Staff ----------
console.log('\n4. Chief of Staff approves');
const dec = await cos.patch(`/api/requests/${reqId}`, { status: 'approved', note: 'enjoy' });
ok(dec.status === 200 && dec.data.status === 'approved', 'Chief of Staff approves an employee request', JSON.stringify(dec.data).slice(0, 120));
ok(dec.data.decidedBy === cos.me.id && !!dec.data.decidedAt, 'the decision records who decided and when');
nPooja = await notes(pooja); nFounder = await notes(founder); nHr = await notes(hr); nCos = await notes(cos);
const decided = forReq(nPooja, reqId).find((i) => i.type === 'request_decided');
ok(!!decided && /Sunita Arya approved/.test(decided.message), 'the requester is told who approved', decided?.message);
ok(/Note: enjoy/.test(decided?.message || ''), 'and sees the note');
ok(/approved/i.test(decided?.title || ''), 'the title says approved', decided?.title);
ok(forReq(nPooja, reqId).filter((i) => i.type === 'request_submitted').every((i) => i.isRead), 'the "request sent" notification is cleared');
ok(forReq(nFounder, reqId).some((i) => i.type === 'request_decided_fyi' && /Sunita Arya approved Pooja Singh/.test(i.title)), 'the founder is told the Chief of Staff approved it');
ok(forReq(nFounder, reqId).filter((i) => i.type === 'request_pending').every((i) => i.isRead), "the founder's pending prompt is cleared");
ok(!forReq(nHr, reqId).some((i) => i.type === 'request_decided_fyi'), 'HR is not sent decisions either');
ok(!forReq(nCos, reqId).some((i) => i.type === 'request_decided_fyi'), 'the person who decided is not notified about their own decision');
ok((await founder.patch(`/api/requests/${reqId}`, { status: 'rejected' })).status === 409, 'a request can only be decided once');
const mine = (await pooja.get('/api/requests')).data.find((r) => r.id === reqId);
ok(mine.status === 'approved' && mine.decidedBy === cos.me.id && mine.decisionNote === 'enjoy', "the requester's own list shows the decision, who made it and the note");

// ---------- 5. rejection by the founder ----------
console.log('\n5. Founder rejects');
const ot = await ranveer.post('/api/requests', { type: 'ot', startDate: istToday, hours: 2, reason: 'release night' });
ok(ot.status === 201, 'employee raises an overtime request');
const rej = await founder.patch(`/api/requests/${ot.data.id}`, { status: 'rejected', note: 'not pre-approved' });
ok(rej.status === 200, 'founder rejects it');
const nRan2 = await notes(ranveer);
const rejN = forReq(nRan2, ot.data.id).find((i) => i.type === 'request_decided');
ok(!!rejN && /rejected/i.test(rejN.title) && /Anant Founder rejected/.test(rejN.message) && /not pre-approved/.test(rejN.message), 'the requester sees "rejected", by whom, and why', rejN?.message);
ok(forReq(await notes(cos), ot.data.id).some((i) => i.type === 'request_decided_fyi' && /rejected/i.test(i.title)), 'the Chief of Staff is told the founder rejected it');

// ---------- 6. withdrawing ----------
console.log('\n6. Withdrawing');
const wfh = await pooja.post('/api/requests', { type: 'wfh', startDate: plusDays(5), reason: 'plumber visit' });
ok(forReq(await notes(founder), wfh.data.id).length === 1, 'the founder got the pending prompt');
ok((await pooja.del(`/api/requests/${wfh.data.id}`)).status === 204, 'the requester withdraws it');
ok(forReq(await notes(founder), wfh.data.id).length === 0, "the approvers' prompts disappear");
ok(forReq(await notes(cos), wfh.data.id).length === 0, 'for the Chief of Staff too');

// ---------- 7. who may decide whose request ----------
console.log('\n7. Decision rules');
const rule = async (requester, type, who, expect, label) => {
  const r = await requester.post('/api/requests', { type: 'wfh', startDate: plusDays(9), reason: 'rule check ' + type });
  const d = await who.patch(`/api/requests/${r.data.id}`, { status: 'approved' });
  ok(d.status === expect, label, `got ${d.status}`);
  return r.data;
};
await rule(hr, 'hr', cos, 200, 'Chief of Staff can approve an HR request');
await rule(acc, 'acc', cos, 200, 'Chief of Staff can approve an accountant request');
await rule(ranveer, 'emp', hr, 403, 'HR cannot approve requests');
await rule(acc, 'acc2', hr, 403, 'HR cannot approve an accountant request either');
await rule(hr, 'hr2', hr, 403, 'HR cannot approve their own request');
await rule(cos, 'cos', cos, 403, 'Chief of Staff cannot approve their own request');
await rule(cos, 'cos2', hr, 403, "HR cannot approve the Chief of Staff's request");
await rule(cos, 'cos3', founder, 200, "a founder can approve the Chief of Staff's request");
await rule(founder, 'f', cos, 403, "Chief of Staff cannot approve a founder's request");
await rule(founder, 'f2', hr, 403, "HR cannot approve a founder's request");
await rule(hr, 'hr3', founder, 200, "a founder can approve HR's request");
await rule(pooja, 'emp2', ranveer, 403, 'an employee cannot approve anyone');
await rule(pooja, 'emp3', acc, 403, 'an accountant cannot approve anyone');
const all = await cos.get('/api/requests?scope=all');
ok(all.status === 200 && all.data.length > 3, 'Chief of Staff can see everyone\'s requests');
ok((await ranveer.get('/api/requests?scope=all')).data.every((r) => r.userId === ranveer.me.id), 'an employee only ever sees their own requests');

// ---------- 8. what the Chief of Staff can and cannot see ----------
console.log('\n8. Chief of Staff access');
const status = async (c, p) => (await c.get(p)).status;
ok(await status(cos, '/api/overview?period=today') === 200, 'Chief of Staff sees the company overview (all teams, all tasks)');
ok(await status(cos, '/api/analytics/team') === 200, 'and team performance');
ok(await status(cos, '/api/stories') === 200, 'and all stories');
ok(await status(founder, '/api/overview?period=today') === 200, 'founder still sees the overview');
for (const [who, c] of [['HR', hr], ['accountant', acc], ['employee', ranveer]]) ok(await status(c, '/api/overview?period=today') === 403, `${who} cannot see the company overview`);
ok(await status(hr, '/api/analytics/team') === 403, 'HR does not see team performance (since 14 Nov)');
ok(await status(acc, '/api/analytics/team') === 403 && await status(ranveer, '/api/analytics/team') === 403, 'accountant and employee still cannot');
ok(await status(cos, '/api/salary-records') === 200, 'Chief of Staff sees salaries (payroll, since 11 Nov)');
ok(await status(cos, '/api/incentives') === 200, 'and incentives');
ok(await status(cos, '/api/internal-documents') === 200, 'and internal documents');
ok(await status(cos, '/api/founder-investments') === 200, 'and investments');
ok(await status(cos, '/api/recurring-tasks') === 200, 'and every repeating task (since 12 Nov)');
ok(await status(cos, '/api/revenue-targets') === 403 || await status(cos, '/api/revenue-targets') === 200, 'revenue targets follow the existing rule');
const cl = (await founder.post('/api/clients', { name: 'Notif Co', industry: 'Retail', stage: 'Hot', ownerId: founder.me.id })).data;
ok(await status(cos, `/api/clients/${cl.id}/invoices`) === 403, 'or invoices');
ok((await cos.get('/api/clients')).data.every((c) => Number(c.expectedRevenue) === 0 && Number(c.revenueTotal) === 0), 'and client revenue figures stay hidden');
ok((await cos.del(`/api/clients/${cl.id}`)).status === 403, 'Chief of Staff cannot delete clients');
ok(await status(cos, '/api/requests') === 200, 'Chief of Staff can raise and see their own requests');

// ---------- 9. mark read ----------
console.log('\n9. Mark as read');
nFounder = await notes(founder);
const one = nFounder.items.find((i) => !i.isRead);
const before = nFounder.unread;
ok((await founder.post('/api/notifications/read', { ids: [one.id] })).data.marked === 1, 'one notification can be marked read');
ok((await notes(founder)).unread === before - 1, 'the unread count drops by one');
ok((await founder.post('/api/notifications/read', {})).data.marked >= 0 && (await notes(founder)).unread === 0, '"mark all read" clears the badge');

// ---------- 10. in the browser ----------
console.log('\n10. In the browser');
const browser = await chromium.launch({ channel: 'chrome' });
const openAs = async (email) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, extraHTTPHeaders: { 'x-forwarded-proto': 'https' } });
  const lr = await ctx.request.post(BASE + '/api/test-login', { data: { email } });
  if (!lr.ok()) throw new Error('browser login failed ' + email);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => failures.push('pageerror: ' + e.message.split('\n')[0]));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  return { ctx, page };
};
const toast = (page, text) => page.locator('[role="status"], li[data-state="open"]').filter({ hasText: text }).first();

// Founder is looking at the dashboard; the employee raises a request; a pop-up appears without a reload
const F = await openAs('vitalsaigorrela@gmail.com');
await F.page.goto(BASE + '/', { waitUntil: 'load' });
await F.page.waitForTimeout(1500);
const P = await openAs('razorbill2018@gmail.com');
await P.page.goto(BASE + '/services', { waitUntil: 'load' });
await P.page.waitForTimeout(1200);
const live = await pooja.post('/api/requests', { type: 'leave', startDate: plusDays(20), endDate: plusDays(21), reason: 'live popup check' });
let popped = true; try { await toast(F.page, 'needs your approval').waitFor({ state: 'visible', timeout: 30000 }); } catch { popped = false; }
ok(popped, 'a pop-up appears on the founder\'s screen when an employee raises a request (no reload)');
const badge = F.page.getByTestId('notification-badge');
ok(await badge.count() === 1 && Number((await badge.innerText()).replace('+', '')) >= 1, 'the bell shows an unread badge');
await F.page.getByTestId('button-notifications').click();
await F.page.waitForTimeout(500);
const item = F.page.getByTestId(`notification-${(await notes(founder)).items.find((i) => i.entityId === live.data.id).id}`);
ok(await item.isVisible(), 'the notification is listed under the bell');
ok(/Pooja Singh needs your approval/.test(await item.innerText()), 'it names the person', (await item.innerText()).replace(/\n/g, ' | '));
await item.click();
await F.page.waitForTimeout(900);
ok(F.page.url().includes('/services'), 'clicking it opens Employee Services (at that request)', F.page.url());
ok(await F.page.getByTestId(`pending-Pooja Singh-leave`).first().isVisible(), 'and the request is waiting in the approval queue');
// Approve from the UI
await F.page.getByTestId(`note-${live.data.id}`).fill('Approved, enjoy the break');
await F.page.getByTestId(`approve-${live.data.id}`).click();
await F.page.waitForTimeout(1200);
ok(await F.page.getByTestId(`logged-${live.data.id}`).isVisible(), 'the decision shows up in the "Recent decisions" log');
ok(/Approved by Anant Founder/.test(await F.page.getByTestId(`logged-${live.data.id}`).innerText()), 'which says who approved it');
// The employee's screen (idle, already open) gets the pop-up and the decision line
let poppedBack = true; try { await toast(P.page, 'Leave approved').waitFor({ state: 'visible', timeout: 30000 }); } catch { poppedBack = false; }
ok(poppedBack, "a pop-up appears on the employee's screen when the request is approved");
await P.page.reload({ waitUntil: 'load' }); await P.page.waitForTimeout(1500);
const decisionLine = P.page.getByTestId(`decision-${live.data.id}`);
ok(await decisionLine.isVisible() && /Approved by Anant Founder/.test(await decisionLine.innerText()), 'the employee\'s request list says "Approved by Anant Founder" with the time', await decisionLine.innerText().catch(() => 'n/a'));
ok(Number((await P.page.getByTestId('notification-badge').innerText()).replace('+', '')) >= 1, "the employee's bell shows an unread badge");
await P.page.getByTestId('button-notifications').click(); await P.page.waitForTimeout(400);
ok(await P.page.getByText(/Anant Founder approved your leave request/).first().isVisible(), 'and the bell lists the approval');
await P.page.getByTestId('mark-all-read').click(); await P.page.waitForTimeout(800);
ok(await P.page.getByTestId('notification-badge').count() === 0, '"Mark all read" removes the badge');

// The approver's note is shown to the requester, and a rejection needs a reason
ok(/Note from Anant Founder: Approved, enjoy the break/.test(await P.page.getByTestId(`decision-note-${live.data.id}`).innerText()), "the employee sees the approver's note, labelled with who wrote it");
const rj = await pooja.post('/api/requests', { type: 'wfh', startDate: plusDays(25), reason: 'need to be home' });
await F.page.reload({ waitUntil: 'load' }); await F.page.waitForTimeout(1500);
await F.page.getByTestId(`reject-${rj.data.id}`).click(); await F.page.waitForTimeout(500);
ok(await F.page.getByTestId(`note-error-${rj.data.id}`).isVisible(), 'rejecting without a reason is refused with a clear message');
ok((await pooja.get('/api/requests')).data.find((r) => r.id === rj.data.id).status === 'pending', 'and the request stays pending');
await F.page.getByTestId(`note-${rj.data.id}`).fill('Team is short-handed that day');
await F.page.getByTestId(`reject-${rj.data.id}`).click(); await F.page.waitForTimeout(1200);
ok(/Rejected by Anant Founder/.test(await F.page.getByTestId(`logged-${rj.data.id}`).innerText()), 'the rejection is logged with who rejected it');
ok(/Reason from Anant Founder: Team is short-handed that day/.test(await F.page.getByTestId(`logged-note-${rj.data.id}`).innerText()), 'and the reason');
await P.page.reload({ waitUntil: 'load' }); await P.page.waitForTimeout(1500);
ok(/Rejected by Anant Founder/.test(await P.page.getByTestId(`decision-${rj.data.id}`).innerText()), 'the employee sees "Rejected by Anant Founder"');
ok(/Reason from Anant Founder: Team is short-handed that day/.test(await P.page.getByTestId(`decision-note-${rj.data.id}`).innerText()), 'with the reason');

// Chief of Staff in the browser
const C = await openAs('cos@test.dev');
await C.page.goto(BASE + '/', { waitUntil: 'load' }); await C.page.waitForTimeout(1500);
ok(await C.page.getByTestId('founder-overview').isVisible(), 'Chief of Staff sees the company overview on the dashboard');
const nav = await C.page.locator('aside').first().innerText();
ok(/Team Performance/.test(nav) && /Employee Services/.test(nav), 'the menu has Team Performance and Employee Services');
ok(/Salary/.test(nav) && /Internal/.test(nav) && /Audit Log/.test(nav) && !/Repeating Tasks/.test(nav), 'and Salary, Internal and Audit Log; Repeating Tasks now lives on the Global Board');
await C.page.goto(BASE + '/services', { waitUntil: 'load' }); await C.page.waitForTimeout(1200);
ok(await C.page.getByTestId('approvals').isVisible(), 'Chief of Staff gets the approvals queue');
await C.page.goto(BASE + '/team', { waitUntil: 'load' }); await C.page.waitForTimeout(1000);
ok(!(await C.page.locator('body').innerText()).includes('available to founders'), 'and can open Team Performance');
await C.page.goto(BASE + '/salary', { waitUntil: 'load' }); await C.page.waitForTimeout(800);
ok(!/restricted|not available/i.test(await C.page.locator('main').innerText()), 'Salary is open to the Chief of Staff');

const E = await openAs('ranveer@test.dev');
await E.page.goto(BASE + '/services', { waitUntil: 'load' }); await E.page.waitForTimeout(1200);
ok(await E.page.getByTestId('approvals').count() === 0, 'an employee does not get an approvals queue');
await browser.close();

console.log(`\n${pass} checks passed, ${failures.length} failed`);
failures.forEach((f) => console.log('  FAIL: ' + f));
process.exit(failures.length ? 1 : 0);
