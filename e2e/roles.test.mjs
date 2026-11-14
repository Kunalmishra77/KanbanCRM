// Roles: Team Lead, Chief of Staff, activity privacy, repeating-task targets. LOCAL test server only (port 5055, throwaway DB).
// Run: node e2e/seed.mjs && node e2e/roles.test.mjs
// Team lead + activity feed permission tests against the LOCAL test server (5055, throwaway DB).
const BASE = 'http://localhost:5055';
let pass = 0; const fail = [];
const ok = (c, n, x = '') => { if (c) pass++; else fail.push(n + (x ? '  -> ' + x : '')); };

class C {
  cookie = '';
  async req(method, path, body) {
    const r = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json', cookie: this.cookie, 'x-forwarded-proto': 'https' }, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
    const set = r.headers.getSetCookie?.() || [];
    if (set.length) this.cookie = set.map((c) => c.split(';')[0]).join('; ');
    const t = await r.text(); let data; try { data = JSON.parse(t); } catch { data = t; }
    return { status: r.status, data };
  }
  get = (p) => this.req('GET', p); post = (p, b) => this.req('POST', p, b ?? {}); patch = (p, b) => this.req('PATCH', p, b ?? {});
  login = (email) => this.post('/api/test-login', { email, googleGivenName: 'G' });
}

const founder = new C();
ok((await founder.login('vitalsaigorrela@gmail.com')).status === 200, 'founder login');

// People: Sunita (CoS), Charu (Sales lead), Divya (Sales), Kapil (Development)
const mk = async (firstName, lastName, email, userType, team) => {
  const r = await founder.post('/api/users', { firstName, lastName, email, userType });
  ok(r.status === 201, 'create ' + firstName, JSON.stringify(r.data));
  const p = await founder.patch('/api/users/' + r.data.id, { team });
  ok(p.status === 200, 'set team ' + firstName, JSON.stringify(p.data));
  return r.data.id;
};
const sunitaId = await mk('Sunita', 'Arya', 'sunita@test.dev', 'chief_of_staff', 'Chief of Staff');
const charuId = await mk('Charu', 'Lead', 'charu@test.dev', 'team_lead', 'Sales');
const divyaId = await mk('Divya', 'Sales', 'divya@test.dev', 'employee', 'Sales');
const kapilId = await mk('Kapil', 'Dev', 'kapil@test.dev', 'employee', 'Development');

const sunita = new C(), charu = new C(), divya = new C(), kapil = new C();
for (const [c, e] of [[sunita, 'sunita@test.dev'], [charu, 'charu@test.dev'], [divya, 'divya@test.dev'], [kapil, 'kapil@test.dev']]) ok((await c.login(e)).status === 200, 'login ' + e);

const client = (await founder.post('/api/clients', { name: 'Acme', industry: 'Retail', stage: 'Hot', ownerId: divyaId, expectedRevenue: '1', revenueTotal: '0', contactEmail: 'a@x.com' })).data;
const due = new Date(Date.now() + 3 * 86400000).toISOString();
const story = async (who, title) => (await founder.post('/api/stories', { clientId: client.id, title, description: 'd', assignedTo: who, priority: 'Medium', estimatedEffortHours: 1, dueDate: due, status: 'To Do', progressPercent: 0, person: '' })).data;
const sDivya = await story(divyaId, 'Divya sales call');
const sCharu = await story(charuId, 'Charu own task');
const sKapil = await story(kapilId, 'Kapil dev secret task');
ok(sDivya?.id && sKapil?.id, 'stories created', JSON.stringify(sKapil));
// Some activity by the people themselves
await kapil.patch('/api/stories/' + sKapil.id, { status: 'In Progress' });
await divya.patch('/api/stories/' + sDivya.id, { status: 'In Progress' });
await kapil.post('/api/stories/' + sKapil.id + '/comments', { body: 'dev comment' });

const titles = async (c) => ((await c.get('/api/stories')).data || []).map((s) => s.title).sort();

// ---- Boards ----
ok(JSON.stringify(await titles(charu)) === JSON.stringify(['Charu own task', 'Divya sales call']), 'Charu (Sales lead) sees her own + Sales team stories only', JSON.stringify(await titles(charu)));
ok((await titles(sunita)).length === 3, 'Sunita (CoS) sees every story', JSON.stringify(await titles(sunita)));
ok(JSON.stringify(await titles(divya)) === JSON.stringify(['Divya sales call']), 'Divya (employee) sees only her own');
ok(JSON.stringify(await titles(kapil)) === JSON.stringify(['Kapil dev secret task']), 'Kapil sees only his own');
ok((await charu.get('/api/stories/' + sDivya.id)).status === 200, 'Charu can open a Sales story');
ok((await charu.get('/api/stories/' + sKapil.id)).status === 404, 'Charu cannot open a Development story');
ok((await charu.patch('/api/stories/' + sDivya.id, { status: 'Review' })).status === 200, 'Charu can update a Sales story');
ok((await charu.req('DELETE', '/api/stories/' + sDivya.id)).status === 403, 'Charu cannot delete a teammate story');
ok((await divya.get('/api/stories/' + sCharu.id)).status === 404, 'Divya cannot open the lead story');

// ---- Dashboard overview ----
const ovC = await charu.get('/api/overview?period=week');
ok(ovC.status === 200, 'Charu gets a team overview', String(ovC.status));
ok(ovC.data.people?.map((p) => p.name).sort().join(',') === 'Charu Lead,Divya Sales', 'team overview lists only Sales people', JSON.stringify(ovC.data.people?.map((p) => p.name)));
ok(ovC.data.teams?.length === 1 && ovC.data.teams[0].team === 'Sales', 'team overview shows only the Sales team', JSON.stringify(ovC.data.teams?.map((t) => t.team)));
ok(!JSON.stringify(ovC.data).includes('Kapil'), 'no Development data in Charu overview');
ok((await sunita.get('/api/overview?period=week')).data.people?.length >= 6, 'Sunita overview has everyone');
ok((await divya.get('/api/overview')).status === 403, 'employee gets no overview');

// ---- Activity feed ----
const feed = async (c) => JSON.stringify((await c.get('/api/activity?limit=50')).data);
const fDivya = await feed(divya), fCharu = await feed(charu), fSunita = await feed(sunita), fKapil = await feed(kapil);
ok(!fDivya.includes('Kapil dev secret task') && !fDivya.includes('dev comment'), 'Divya feed hides Development work', fDivya.slice(0, 300));
ok(fDivya.includes('Divya sales call'), 'Divya feed still shows her own work');
ok(!fCharu.includes('Kapil dev secret task'), 'Charu feed hides Development work');
ok(fCharu.includes('Divya sales call'), 'Charu feed shows Sales team work');
ok(fSunita.includes('Kapil dev secret task') && fSunita.includes('Divya sales call'), 'Sunita feed shows all work');
ok(!fKapil.includes('Divya sales call') && fKapil.includes('Kapil dev secret task'), 'Kapil feed: own work only');
ok(!fDivya.includes('"entityType":"user"'), 'employee feed hides team admin entries');

// ---- Users list carries team (for the board filter) ----
ok((await charu.get('/api/users')).data.find((u) => u.id === divyaId)?.team === 'Sales', 'users list includes team');

// ---- Repeating tasks ----
const rule = (extra) => ({ clientId: client.id, title: 'Daily ' + Math.random().toString(36).slice(2, 6), description: '', priority: 'Medium', repeat: 'daily', weekday: null, monthDay: null, dueTime: null, team: null, excludeIds: [], assigneeIds: [], ...extra });
const rs = await sunita.post('/api/recurring-tasks', rule({ team: 'Development' }));
ok(rs.status === 201 && rs.data.task.team === 'Development', 'Sunita sets a repeating task for the whole Development team', JSON.stringify(rs.data).slice(0, 200));
const rs2 = await sunita.post('/api/recurring-tasks', rule({ assigneeIds: [divyaId] }));
ok(rs2.status === 201 && rs2.data.task.assigneeIds[0] === divyaId, 'Sunita sets one for a single person (Divya)');
const rc = await charu.post('/api/recurring-tasks', rule({ team: 'Sales' }));
ok(rc.status === 201 && rc.data.task.team === 'Sales', 'Charu sets one for the whole Sales team', JSON.stringify(rc.data).slice(0, 200));
const rc2 = await charu.post('/api/recurring-tasks', rule({ assigneeIds: [divyaId] }));
ok(rc2.status === 201 && rc2.data.task.assigneeIds[0] === divyaId, 'Charu sets one for Divya (Sales)');
ok((await charu.post('/api/recurring-tasks', rule({ team: 'Development' }))).status === 400, 'Charu cannot target the Development team');
ok((await charu.post('/api/recurring-tasks', rule({ assigneeIds: [kapilId] }))).status === 400, 'Charu cannot target Kapil (Development)');
const rk = await kapil.post('/api/recurring-tasks', rule({ team: 'Sales', assigneeIds: [divyaId] }));
ok(rk.status === 201 && rk.data.task.team === null && rk.data.task.assigneeIds.join() === kapilId, 'an employee always gets it for himself only', JSON.stringify(rk.data.task));
ok((await sunita.get('/api/recurring-tasks')).data.length === 5, 'Sunita sees every repeating task');
ok((await charu.get('/api/recurring-tasks')).data.length === 2, 'Charu sees the ones she made');
ok((await sunita.req('DELETE', '/api/recurring-tasks/' + rk.data.task.id)).status === 204, "Sunita can delete anyone's repeating task");
ok((await charu.req('DELETE', '/api/recurring-tasks/' + rs.data.task.id)).status === 404, "Charu cannot delete Sunita's");
ok((await charu.patch('/api/recurring-tasks/' + rc.data.task.id, { active: false })).status === 200, 'Charu can pause her own');
ok((await charu.patch('/api/recurring-tasks/' + rc2.data.task.id, rule({ assigneeIds: [kapilId] }))).status === 400, 'Charu cannot edit her rule to target another team');
const dv = await titles(divya);
ok(dv.filter((t) => t.startsWith('Daily')).length >= 1, 'Divya got today\'s story from a repeating task', JSON.stringify(dv));

console.log(`\n${pass} passed, ${fail.length} failed`);
for (const f of fail) console.log('FAIL', f);
process.exit(fail.length ? 1 : 0);
