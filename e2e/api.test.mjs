// Feature + permission tests against the local test server (port 5055, throwaway database).
// Run: node e2e/api.test.mjs
const BASE = process.env.BASE || 'http://localhost:5055';
let pass = 0; const failures = [];
const ok = (cond, name, extra = '') => { if (cond) pass++; else failures.push(name + (extra ? '  -> ' + extra : '')); };

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
  async login(email, g = {}) { const r = await this.post('/api/test-login', { email, googleGivenName: g.given, googleFamilyName: g.family }); return r; }
}

const founder = new Client(), hr = new Client(), acc = new Client(), pooja = new Client(), ranveer = new Client(), anon = new Client();
const due = new Date(Date.now() + 3 * 86400000).toISOString();

// ---------- 1. Sign-in ----------
{
  const r = await pooja.login('razorbill2018@gmail.com', { given: 'Razorbill' });
  ok(r.status === 200, 'Pooja can sign in', JSON.stringify(r));
  ok(r.data.firstName === 'Pooja' && r.data.lastName === 'Singh', 'Google name "Razorbill" does NOT overwrite the internal name', `${r.data.firstName} ${r.data.lastName}`);
  const again = await pooja.login('RAZORBILL2018@gmail.com', { given: 'Razorbill', family: 'Other' });
  ok(again.data.firstName === 'Pooja', 'email match is case-insensitive and name still preserved');
  const bad = await new Client().login('stranger@gmail.com', { given: 'X' });
  ok(bad.status === 403, 'unregistered Google account is rejected', String(bad.status));
  ok((await anon.get('/api/stories')).status === 401, 'API needs login');
  for (const [c, e] of [[founder, 'vitalsaigorrela@gmail.com'], [hr, 'hr@test.dev'], [acc, 'acc@test.dev'], [ranveer, 'ranveer@test.dev']]) ok((await c.login(e, { given: 'G' })).status === 200, 'sign in ' + e);
  const me = await pooja.get('/api/auth/user');
  ok(me.data.email === 'razorbill2018@gmail.com' && me.data.userType === 'employee', 'session returns the right user');
}
const users = (await founder.get('/api/users')).data;
const U = (e) => users.find((u) => u.email === e);
const poojaId = U('razorbill2018@gmail.com').id, ranveerId = U('ranveer@test.dev').id;

// ---------- 2. Clients ----------
let hot, warm, cold;
{
  const mk = (name, stage, owner) => founder.post('/api/clients', { name, industry: 'Retail', stage, ownerId: owner, expectedRevenue: '100000', revenueTotal: '25000', contactEmail: 'c@x.com' });
  const a = await mk('Hot Co', 'Hot', poojaId), b = await mk('Warm Co', 'Warm', poojaId), c = await mk('Cold Co', 'Cold', ranveerId);
  ok(a.status === 201 && b.status === 201 && c.status === 201, 'founder creates clients', JSON.stringify([a.data, b.data, c.data]).slice(0, 300));
  [hot, warm, cold] = [a.data, b.data, c.data];
  const bad = await founder.post('/api/clients', { industry: 'x' });
  ok(bad.status === 400, 'client without name is rejected', String(bad.status));
  const list = await pooja.get('/api/clients');
  ok(list.data.length === 3, 'employee sees clients');
  ok(list.data.every((c) => c.expectedRevenue === '0' && c.revenueTotal === '0'), 'employee does not see revenue numbers');
  ok((await acc.get('/api/clients')).data.some((c) => c.expectedRevenue === '100000'), 'accountant sees revenue numbers');
  const upd = await founder.patch(`/api/clients/${hot.id}`, { stage: 'Warm' });
  ok(upd.status === 200 && upd.data.stage === 'Warm', 'client stage can be changed');
  await founder.patch(`/api/clients/${hot.id}`, { stage: 'Hot' });
  const emp = await pooja.patch(`/api/clients/${hot.id}`, { notes: 'n', expectedRevenue: '999' });
  ok(emp.status === 200, 'employee can edit a client');
  ok((await founder.get(`/api/clients/${hot.id}`)).data.expectedRevenue === '100000', "employee cannot change a client's revenue");
  ok((await pooja.del(`/api/clients/${cold.id}`)).status === 403, 'employee cannot delete a client');
}

// ---------- 3. Stories: assignment is the reported bug ----------
let s1, s2, s3, s4;
{
  const mk = (clientId, title, assignedTo, person, status = 'To Do') => founder.post('/api/stories', { clientId, title, description: '', assignedTo, person, status, priority: 'Medium', estimatedEffortHours: 2, progressPercent: 0, dueDate: due, tags: [] });
  [s1, s2, s3, s4] = (await Promise.all([
    mk(hot.id, 'Pooja story 1', poojaId, 'Pooja Singh'),
    mk(hot.id, 'Pooja story 2', poojaId, 'Razor Bill', 'In Progress'),
    mk(cold.id, 'Ranveer story', ranveerId, 'ranveer razorveda'),
    mk(warm.id, 'Nobody story', null, 'Unassigned'),
  ])).map((r) => { ok(r.status === 201, 'create story', JSON.stringify(r.data).slice(0, 200)); return r.data; });
  const all = (await pooja.get('/api/stories')).data;
  ok(all.length === 2, 'an employee sees only her own stories (since 11 Nov)', String(all.length));
  ok((await founder.get('/api/stories')).data.length === 4, 'a founder sees all stories');
  ok(all.filter((s) => s.assignedTo === poojaId).length === 2, "Pooja has exactly her 2 stories by id");
  ok(!all.filter((s) => s.assignedTo === poojaId).some((s) => s.title === 'Ranveer story'), "Ranveer's story is not Pooja's");
  const mv = await ranveer.patch(`/api/stories/${s3.id}`, { status: 'In Progress' });
  ok(mv.status === 200 && mv.data.status === 'In Progress', 'status change via board move');
  const re = await founder.patch(`/api/stories/${s4.id}`, { assignedTo: ranveerId, person: 'ranveer razorveda' });
  ok(re.data.assignedTo === ranveerId, 'story can be re-assigned');
  ok((await founder.get('/api/stories?clientId=' + hot.id)).data.length === 2, 'filter stories by client');
  ok((await founder.get('/api/stories/' + s1.id)).data.title === 'Pooja story 1', 'get one story');
  const cm = await pooja.post(`/api/stories/${s1.id}/comments`, { authorId: poojaId, authorName: 'Pooja Singh', body: 'hello', isSystem: false });
  ok(cm.status === 201 || cm.status === 200, 'add comment', JSON.stringify(cm.data).slice(0, 160));
  ok((await pooja.get(`/api/stories/${s1.id}/comments`)).data.length >= 1, 'comments listed');
  ok((await pooja.del(`/api/stories/${s3.id}`)).status === 404, "employee cannot delete someone else's story (it is not even visible)");
}

// ---------- 4. Rename keeps stories in step (the fix) ----------
{
  ok((await hr.patch(`/api/users/${poojaId}`, { lastName: 'X' })).status === 403, 'HR cannot rename (team management: founders + Chief of Staff)');
  const r = await founder.patch(`/api/users/${poojaId}`, { firstName: 'Pooja', lastName: 'Rani Singh' });
  ok(r.status === 200 && r.data.lastName === 'Rani Singh', 'founder can rename an employee', JSON.stringify(r.data).slice(0, 160));
  const st = (await founder.get('/api/stories')).data.filter((s) => s.assignedTo === poojaId);
  ok(st.length === 2 && st.every((s) => s.person === 'Pooja Rani Singh'), "rename updates the name on her stories", st.map((s) => s.person).join('|'));
  await founder.patch(`/api/users/${poojaId}`, { firstName: 'Pooja', lastName: 'Singh' });
  ok((await pooja.patch(`/api/users/${poojaId}`, { lastName: 'Hacker' })).status === 403, 'employee cannot rename');
  ok((await hr.patch(`/api/users/${U('vitalsaigorrela@gmail.com').id}`, { userType: 'employee' })).status === 403, 'HR cannot demote a founder');
  ok((await hr.patch(`/api/users/${poojaId}`, { userType: 'founder' })).status === 403, 'HR cannot promote to founder');
}

// ---------- 5. Team analytics ----------
{
  ok((await hr.get('/api/analytics/team')).status === 403, 'HR does not see team analytics (since 14 Nov)');
  const t = await founder.get('/api/analytics/team');
  ok(t.status === 200, 'founder sees team analytics');
  const row = t.data.find((x) => x.user.id === poojaId);
  ok(row && row.totalAssigned === 2, "analytics: Pooja has 2 stories", JSON.stringify(row && row.totalAssigned));
  const r2 = t.data.find((x) => x.user.id === ranveerId);
  ok(r2 && r2.totalAssigned === 2, 'analytics: Ranveer has 2 stories', JSON.stringify(r2 && r2.totalAssigned));
  ok((await pooja.get('/api/analytics/team')).status === 403, 'employee blocked from team analytics');
}

// ---------- 6. Leads ----------
{
  const own = await pooja.post('/api/leads', { name: 'x', ownerId: poojaId });
  ok(own.status === 201, 'everyone can create a lead (since 11 Nov)', String(own.status));
  const l = await founder.post('/api/leads', { name: 'Lead A', stage: 'New', ownerId: U('vitalsaigorrela@gmail.com').id, assignedTo: poojaId, estimatedValue: '5000', contactEmail: 'l@x.com' });
  ok(l.status === 201, 'create lead', JSON.stringify(l.data).slice(0, 200));
  const id = l.data.id;
  ok((await founder.patch(`/api/leads/${id}`, { stage: 'Contacted' })).data.stage === 'Contacted', 'move lead stage');
  ok((await pooja.get('/api/leads')).data.length === 2, 'list leads');
  const lc = await founder.post(`/api/leads/${id}/comments`, { authorId: poojaId, authorName: 'Pooja', body: 'called' });
  ok([200, 201].includes(lc.status), 'lead comment', JSON.stringify(lc.data).slice(0, 160));
  const conv = await founder.post(`/api/clients/${warm.id}/convert-to-lead`);
  ok([200, 201].includes(conv.status), 'convert client to lead', JSON.stringify(conv.data).slice(0, 160));
  ok((await pooja.del(`/api/leads/${own.data.id}`)).status < 300, 'an employee can delete a lead');
  ok((await founder.del(`/api/leads/${id}`)).status < 300, 'founder deletes a lead');
}

// ---------- 7. Invoices / finance ----------
{
  const inv = await acc.post(`/api/clients/${hot.id}/invoices`, { label: 'INV-1', amount: '5000', status: 'paid' });
  ok([200, 201].includes(inv.status), 'accountant creates invoice', JSON.stringify(inv.data).slice(0, 200));
  ok((await pooja.get(`/api/clients/${hot.id}/invoices`)).status === 403, 'employee blocked from invoices');
  ok((await acc.get(`/api/clients/${hot.id}/invoices`)).data.length === 1, 'accountant lists invoices');
  const t = await founder.post('/api/revenue-targets', { period: new Date().toISOString().slice(0, 7), targetAmount: '100000' });
  ok([200, 201].includes(t.status), 'founder sets revenue target', JSON.stringify(t.data).slice(0, 160));
  await founder.post('/api/revenue-targets', { period: new Date().toISOString().slice(0, 7), targetAmount: '250000' });
  const tg = (await founder.get('/api/revenue-targets')).data;
  ok(tg.length === 1 && Number(tg[0].targetAmount) === 250000, 'setting the target again updates it (one per month)', JSON.stringify(tg).slice(0, 160));
  ok((await pooja.get('/api/revenue-targets')).status === 403, 'employee blocked from revenue targets');
}

// ---------- 8. Payroll ----------
{
  const period = new Date().toISOString().slice(0, 7);
  ok((await hr.post('/api/salary-records', { employeeId: poojaId, period, baseSalary: '1', createdBy: 't-hr' })).status === 403, 'HR has no payroll access (since 11 Nov)');
  const s = await acc.post('/api/salary-records', { employeeId: poojaId, period, baseSalary: '30000', createdBy: 't-acc' });
  ok([200, 201].includes(s.status), 'accountant creates salary record', JSON.stringify(s.data).slice(0, 200));
  const i = await acc.post('/api/incentives', { employeeId: poojaId, period, amount: '2000', reason: 'closed deal', createdBy: 't-acc' });
  ok([200, 201].includes(i.status), 'accountant creates incentive', JSON.stringify(i.data).slice(0, 200));
  ok((await pooja.get('/api/salary-records')).status === 403 && (await pooja.get('/api/incentives')).status === 403, 'employee blocked from payroll');
  ok((await acc.get('/api/salary-records')).status === 200, 'accountant can view payroll');
}

// ---------- 9. Announcements, comms, internal ----------
{
  const a = await founder.post('/api/announcements', { title: 'Holiday', body: 'Closed' });
  ok([200, 201].includes(a.status), 'founder posts announcement', JSON.stringify(a.data).slice(0, 200));
  ok((await pooja.get('/api/announcements')).data.length >= 1, 'employee reads announcements');
  ok((await pooja.post('/api/announcements', { title: 'x', body: 'y' })).status === 403, 'employee cannot post announcement');
  const cm = await pooja.post(`/api/clients/${hot.id}/communications`, { type: 'call', summary: 'spoke', loggedBy: 'Pooja' });
  ok([200, 201].includes(cm.status), 'log a communication', JSON.stringify(cm.data).slice(0, 160));
  ok((await pooja.get('/api/internal-documents')).status === 403, 'employee blocked from internal documents');
  ok((await pooja.get('/api/founder-investments')).status === 403, 'employee blocked from investments');
  ok((await founder.get('/api/internal-documents')).status === 200, 'founder opens internal documents');
  ok((await founder.get('/api/founder-investments')).status === 200, 'founder opens investments');
  ok((await founder.get('/api/activity')).status === 200, 'activity feed loads');
  ok((await founder.get(`/api/clients/${hot.id}/timeline`)).status === 200, 'client timeline loads');
}

// ---------- 10. Team management ----------
{
  ok((await hr.post('/api/users', { firstName: 'H', lastName: 'R', email: 'hr.add@test.dev', userType: 'employee' })).status === 403, 'HR cannot add employees (since 11 Nov)');
  const n = await founder.post('/api/users', { firstName: 'New', lastName: 'Hire', email: 'new.hire@test.dev', userType: 'employee', role: 'editor' });
  ok([200, 201].includes(n.status), 'founder adds an employee', JSON.stringify(n.data).slice(0, 200));
  ok((await new Client().login('new.hire@test.dev', { given: 'Whoever' })).status === 200, 'new employee can then sign in');
  ok((await pooja.post('/api/users', { firstName: 'a', lastName: 'b', email: 'z@z.com', userType: 'employee' })).status === 403, 'employee cannot add users');
  const dup = await founder.post('/api/users', { firstName: 'New', lastName: 'Hire', email: 'new.hire@test.dev', userType: 'employee' });
  ok(dup.status === 409, 'duplicate email gives a clear 409, not a crash', String(dup.status));
  const newId = (await founder.get('/api/users')).data.find((u) => u.email === 'new.hire@test.dev').id;
  const del = await founder.del(`/api/users/${newId}`);
  ok([200, 204].includes(del.status), 'founder deletes a user', String(del.status));
  // deleting an assignee must unassign, not delete, their stories
  const before = (await founder.get('/api/stories')).data.length;
  const d2 = await founder.del(`/api/users/${ranveerId}`);
  const after = (await founder.get('/api/stories')).data;
  ok([200, 204].includes(d2.status) && after.length === before, 'deleting an employee keeps their stories (unassigned)', `${before}->${after.length} status ${d2.status}`);
  ok(after.filter((s) => s.title === 'Ranveer story')[0]?.assignedTo === null, 'those stories become unassigned');
}

// ---------- 11. Cleanup paths ----------
{
  ok((await founder.del(`/api/stories/${s1.id}`)).status === 204, 'founder deletes a story');
  ok((await hr.del(`/api/clients/${warm.id}`)).status !== 500, 'client delete does not crash');
  const cron = await fetch(BASE + '/api/cron/check-deadlines', { headers: { authorization: 'Bearer wrong' } });
  ok(cron.status === 401 || cron.status === 403, 'cron endpoint rejects a wrong secret', String(cron.status));
  const cron2 = await fetch(BASE + '/api/cron/check-deadlines', { headers: { authorization: 'Bearer testcron' } });
  ok(cron2.status === 200, 'cron endpoint works with the secret', String(cron2.status));
  const lo = await pooja.post('/api/logout');
  ok(lo.status === 204 && (await pooja.get('/api/auth/user')).status === 401, 'logout ends the session');
}

console.log(`\n${pass} checks passed, ${failures.length} failed`);
failures.forEach((f) => console.log('  FAIL: ' + f));
process.exit(failures.length ? 1 : 0);
