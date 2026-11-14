// Repeating tasks, due dates, progress bar, HR access, email access, list cache, deep health. LOCAL test server only.
// Run: node e2e/seed.mjs && node e2e/repeating.test.mjs
// Repeating tasks from Add Story: chosen weekdays + next occurrence on the board straight away. LOCAL server only.
const BASE = 'http://localhost:5055';
let pass = 0; const fail = [];
const ok = (c, n, x = '') => { if (c) pass++; else fail.push(n + (x ? '  -> ' + x : '')); };
class C {
  cookie = '';
  async req(method, path, body) {
    const r = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json', cookie: this.cookie, 'x-forwarded-proto': 'https' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const set = r.headers.getSetCookie?.() || []; if (set.length) this.cookie = set.map((c) => c.split(';')[0]).join('; ');
    const t = await r.text(); let data; try { data = JSON.parse(t); } catch { data = t; } return { status: r.status, data };
  }
  get = (p) => this.req('GET', p); post = (p, b) => this.req('POST', p, b ?? {}); patch = (p, b) => this.req('PATCH', p, b ?? {});
}
const ist = (d = 0) => new Date(Date.now() + 5.5 * 3600e3 + d * 86400e3).toISOString().slice(0, 10);
const dow = (s) => new Date(s + 'T00:00:00Z').getUTCDay();
const founder = new C(), pooja = new C();
await founder.post('/api/test-login', { email: 'vitalsaigorrela@gmail.com', googleGivenName: 'G' });
await pooja.post('/api/test-login', { email: 'razorbill2018@gmail.com', googleGivenName: 'G' });
const poojaId = (await pooja.get('/api/auth/user')).data.id;
await founder.patch('/api/users/' + poojaId, { workPattern: 'all' }); // works every day, so any weekday is a working day
const client = (await founder.post('/api/clients', { name: 'Thames', industry: 'Spa', stage: 'Hot', expectedRevenue: '1', revenueTotal: '0', contactEmail: 'a@x.com' })).data;
const base = { clientId: client.id, description: 'Point 1\nPoint 2\n- Point 3', priority: 'Medium', dueTime: null, team: null, excludeIds: [] };

// 1. Weekly on two days that are NOT today: the next one still appears on the board now
const today = ist(), d2 = ist(2), d4 = ist(4);
const r1 = await pooja.post('/api/recurring-tasks', { ...base, title: 'Blog post', repeat: 'weekly', weekday: dow(d2), weekdays: [dow(d2), dow(d4)], assigneeIds: [poojaId] });
ok(r1.status === 201, 'create weekly rule with two chosen days', JSON.stringify(r1.data).slice(0, 200));
ok(JSON.stringify(r1.data.task?.weekdays?.slice().sort()) === JSON.stringify([dow(d2), dow(d4)].sort()), 'both chosen days are saved', JSON.stringify(r1.data.task?.weekdays));
let mine = (await pooja.get('/api/stories')).data.filter((s) => s.title === 'Blog post');
ok(mine.length === 1 && mine[0].occurrenceDate === d2, 'next occurrence is on the board right away (in 2 days)', JSON.stringify(mine.map((s) => s.occurrenceDate)));
ok(mine[0]?.description === 'Point 1\nPoint 2\n- Point 3', 'description keeps its lines');
// running create-side generation again does not duplicate
await pooja.patch('/api/recurring-tasks/' + r1.data.task.id, { active: false });
await pooja.patch('/api/recurring-tasks/' + r1.data.task.id, { active: true });
mine = (await pooja.get('/api/stories')).data.filter((s) => s.title === 'Blog post');
ok(mine.length === 1, 'pause + resume does not create a duplicate', String(mine.length));

// 2. Weekly including today: today's story appears
const r2 = await pooja.post('/api/recurring-tasks', { ...base, title: 'GMB post', repeat: 'weekly', weekdays: [dow(today)], assigneeIds: [poojaId] });
mine = (await pooja.get('/api/stories')).data.filter((s) => s.title === 'GMB post');
ok(r2.status === 201 && mine.length === 1 && mine[0].occurrenceDate === today, "today's occurrence appears when today is chosen", JSON.stringify(mine.map((s) => s.occurrenceDate)));

// 3. Old style single weekday still accepted; no day at all is rejected
ok((await pooja.post('/api/recurring-tasks', { ...base, title: 'Old style', repeat: 'weekly', weekday: dow(d4), assigneeIds: [poojaId] })).status === 201, 'old single-weekday request still works');
ok((await pooja.post('/api/recurring-tasks', { ...base, title: 'No day', repeat: 'weekly', weekdays: [], assigneeIds: [poojaId] })).status === 400, 'weekly with no day is rejected');

// 4. Monthly far ahead still shows its next occurrence
const day = Number(ist(10).slice(8, 10));
await pooja.post('/api/recurring-tasks', { ...base, title: 'Monthly report', repeat: 'monthly', monthDay: day, assigneeIds: [poojaId] });
mine = (await pooja.get('/api/stories')).data.filter((s) => s.title === 'Monthly report');
ok(mine.length === 1, 'monthly: next occurrence appears on the board', JSON.stringify(mine.map((s) => s.occurrenceDate)));

// 6. A calendar-picked due date (midnight India time) means the END of that day
const pick = new Date(ist(1) + 'T00:00:00+05:30').toISOString();
const st = await pooja.post('/api/stories', { clientId: client.id, title: 'One-off', description: '', assignedTo: poojaId, priority: 'Medium', estimatedEffortHours: 0, dueDate: pick, status: 'To Do', progressPercent: 0, person: '' });
ok(st.status === 201 && new Date(st.data.dueDate).toISOString() === new Date(ist(1) + 'T23:59:00+05:30').toISOString(), 'new story due "tomorrow" is due 23:59 tomorrow', st.data.dueDate);
const pick2 = new Date(ist(3) + 'T00:00:00+05:30').toISOString();
const ed = await pooja.patch('/api/stories/' + st.data.id, { dueDate: pick2 });
ok(new Date(ed.data.dueDate).toISOString() === new Date(ist(3) + 'T23:59:00+05:30').toISOString(), 'editing the due date also means end of that day', ed.data.dueDate);
const timed = new Date(ist(2) + 'T15:30:00+05:30').toISOString();
ok(new Date((await pooja.patch('/api/stories/' + st.data.id, { dueDate: timed })).data.dueDate).toISOString() === timed, 'a chosen time is kept as is');

// 7. Progress bar moves the status
const pr = (await pooja.post('/api/stories', { clientId: client.id, title: 'Progress one', description: '', assignedTo: poojaId, priority: 'Medium', estimatedEffortHours: 0, dueDate: pick, status: 'To Do', progressPercent: 0, person: '' })).data;
ok((await pooja.patch('/api/stories/' + pr.id, { progressPercent: 25 })).data.status === 'In Progress', '25% on a To Do story -> In Progress');
ok((await pooja.patch('/api/stories/' + pr.id, { progressPercent: 50 })).data.status === 'In Progress', '50% stays In Progress');
ok((await pooja.patch('/api/stories/' + pr.id, { progressPercent: 100 })).data.status === 'Done', '100% -> Done');
ok((await pooja.patch('/api/stories/' + pr.id, { progressPercent: 75 })).data.status === 'In Progress', 'lowering a Done story to 75% reopens it');
const dn = (await pooja.patch('/api/stories/' + pr.id, { status: 'Done' })).data;
ok(dn.status === 'Done' && dn.progressPercent === 100, 'marking Done fills the bar to 100%');
ok((await pooja.patch('/api/stories/' + pr.id, { status: 'Review', progressPercent: 100 })).data.status === 'Review', 'an explicit status in the same save wins');

// 8. HR: no team performance; error reports accepted
const hr = new C(); await hr.post('/api/test-login', { email: 'hr@test.dev', googleGivenName: 'G' });
ok((await hr.get('/api/analytics/team')).status === 403, 'HR cannot open team performance');
ok((await hr.get('/api/internal-documents')).status === 403, 'HR cannot open the internal panel', String((await hr.get('/api/internal-documents')).status));
ok((await founder.get('/api/analytics/team')).status === 200, 'founder still sees team performance');
ok((await hr.req('POST', '/api/client-error', { where: 'test', message: 'x', url: '/' })).status === 204, 'browser error report is accepted');

// 9. Emailing: founders only
ok((await pooja.get('/api/stories/' + pr.id + '/emails')).status === 403, 'employee cannot list story emails');
ok((await pooja.post('/api/stories/' + pr.id + '/emails', { subject: 'x', body: 'y' })).status === 403, 'employee cannot send a story email');
ok((await pooja.post('/api/stories/' + pr.id + '/generate-email', {})).status === 403, 'employee cannot draft an email');
ok((await founder.get('/api/stories/' + pr.id + '/emails')).status === 200, 'founder still has story emails');

// 10. Marking a repeating story Done puts its next copy on the board straight away
const gmb = (await pooja.get('/api/stories')).data.find((s) => s.title === 'GMB post' && s.occurrenceDate === today);
await pooja.patch('/api/stories/' + gmb.id, { status: 'Done' });
await new Promise((r) => setTimeout(r, 1500));
const nextGmb = (await pooja.get('/api/stories')).data.filter((s) => s.title === 'GMB post' && s.occurrenceDate > today);
ok(nextGmb.length === 1 && nextGmb[0].occurrenceDate === ist(7) && nextGmb[0].status === 'To Do', "finishing this week's copy shows next week's as To Do", JSON.stringify(nextGmb.map((s) => s.occurrenceDate)));
await pooja.patch('/api/stories/' + gmb.id, { status: 'Done' }); await new Promise((r) => setTimeout(r, 800));
ok((await pooja.get('/api/stories')).data.filter((s) => s.title === 'GMB post' && s.occurrenceDate > today).length === 1, 'marking Done again does not add a second copy');

// 10b. Daily: today's copy done -> tomorrow's is on the board as To Do (whoever finishes it)
const daily = (await pooja.post('/api/recurring-tasks', { ...base, title: 'Daily report', repeat: 'daily', assigneeIds: [poojaId] })).data.task;
const todayCopy = (await pooja.get('/api/stories')).data.find((s) => s.title === 'Daily report' && s.occurrenceDate === today);
ok(!!todayCopy, "daily: today's copy is on the board");
await founder.patch('/api/stories/' + todayCopy.id, { status: 'Done' }); // finished by someone else
await new Promise((r) => setTimeout(r, 1500));
const tmr = (await pooja.get('/api/stories')).data.filter((s) => s.title === 'Daily report' && s.occurrenceDate === ist(1));
ok(tmr.length === 1 && tmr[0].status === 'To Do', "daily: finishing today's copy puts tomorrow's in To Do", JSON.stringify(tmr.map((s) => s.status)));
// Pause: no new copy; Resume: back as before
await pooja.patch('/api/recurring-tasks/' + daily.id, { active: false });
const tmrCopy = tmr[0];
await pooja.patch('/api/stories/' + tmrCopy.id, { status: 'Done' }); await new Promise((r) => setTimeout(r, 1200));
ok(!(await pooja.get('/api/stories')).data.some((s) => s.title === 'Daily report' && s.occurrenceDate === ist(2)), 'paused: finishing a copy adds no new one');
await pooja.patch('/api/recurring-tasks/' + daily.id, { active: true }); await new Promise((r) => setTimeout(r, 1200));
ok((await pooja.get('/api/stories')).data.some((s) => s.title === 'Daily report' && s.occurrenceDate > ist(1) && s.status === 'To Do'), 'resumed: the next copy is back in To Do');
// Only founders delete; every change is recorded
ok((await pooja.req('DELETE', '/api/recurring-tasks/' + daily.id)).status === 403, 'an employee cannot delete a repeating task (pause instead)');
const log = JSON.stringify((await founder.get('/api/activity?limit=100')).data);
ok(log.includes('Set up repeating task: Daily report') && log.includes('Paused repeating task: Daily report') && log.includes('Resumed repeating task: Daily report'), 'create / pause / resume are recorded with who did it');
ok((await founder.req('DELETE', '/api/recurring-tasks/' + daily.id)).status === 204, 'a founder can delete it');
ok(JSON.stringify((await founder.get('/api/activity?limit=100')).data).includes('Deleted repeating task: Daily report'), 'the delete is recorded too');

// 10c. A new day: yesterday's copy still open moves to Done; today's fresh copy is the only To Do
{
  const pg = (await import('postgres')).default(process.env.DATABASE_URL || 'postgres://postgres:pw@localhost:5433/crm', { max: 1 });
  const r = (await pooja.post('/api/recurring-tasks', { ...base, title: 'Calling report', repeat: 'daily', assigneeIds: [poojaId] })).data.task;
  await pg`insert into stories (client_id, title, description, assigned_to, priority, estimated_effort_hours, due_date, status, progress_percent, person, tags, recurring_task_id, occurrence_date)
    values (${client.id}, 'Calling report', 'x', ${poojaId}, 'Medium', 0, now() - interval '1 day', 'To Do', 0, 'Pooja Singh', ${['recurring', 'daily']}, ${r.id}, ${ist(-1)})`;
  await pooja.patch('/api/recurring-tasks/' + r.id, { active: false });
  await pooja.patch('/api/recurring-tasks/' + r.id, { active: true }); // any create/resume (and the 12:00 AM run) tidies up
  const copies = (await pooja.get('/api/stories')).data.filter((s) => s.title === 'Calling report');
  const y = copies.find((s) => s.occurrenceDate === ist(-1)), t = copies.find((s) => s.occurrenceDate === today);
  ok(y?.status === 'Done', "yesterday's unfinished copy moved to Done", y?.status);
  ok(t?.status === 'To Do' && copies.filter((s) => s.status !== 'Done').length === 1, "only today's copy is in To Do", JSON.stringify(copies.map((s) => s.occurrenceDate + ':' + s.status)));
  await pg.end();
}

// 11. Lists kept in memory are never stale after a change
const c2 = (await founder.post('/api/clients', { name: 'Fresh Client', industry: 'Spa', stage: 'Hot', expectedRevenue: '1', revenueTotal: '0', contactEmail: 'f@x.com' })).data;
ok((await founder.get('/api/clients')).data.some((c) => c.id === c2.id), 'a new client shows in the list at once');
await founder.patch('/api/clients/' + c2.id, { name: 'Renamed Client' });
ok((await founder.get('/api/clients')).data.find((c) => c.id === c2.id)?.name === 'Renamed Client', 'a renamed client shows the new name at once');
const nu = (await founder.post('/api/users', { firstName: 'Cache', lastName: 'Check', email: 'cache@test.dev', userType: 'employee' })).data;
ok((await founder.get('/api/users')).data.some((u) => u.id === nu.id), 'a new employee shows in the people list at once');

// 12. Health check that really asks the database
const dh = await fetch(BASE + '/api/health/deep'); const dj = await dh.json();
ok(dh.status === 200 && dj.database === 'ok', 'deep health check reaches the database', JSON.stringify(dj));

// 5. The list shows them
ok((await pooja.get('/api/recurring-tasks')).data.length === 5, 'repeating list has the 5 rules');
console.log(`\n${pass} passed, ${fail.length} failed`); for (const f of fail) console.log('FAIL', f);
process.exit(fail.length ? 1 : 0);
