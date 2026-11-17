// Full story flows across roles, against a THROWAWAY server + database (made-up people, @example.com).
// Run inside the test app container:  node flows.test.mjs phase1   (then restart the app)   node flows.test.mjs phase2
// Every check states what SHOULD happen; a FAIL is a bug.
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:5000';
const STATE = '/tmp/flows-state.json';
const phase = process.argv[2] || 'phase1';
let pass = 0; const fails = [];
const ok = (c, name, extra = '') => { if (c) { pass++; console.log('  ok  ', name); } else { fails.push(name); console.log('  FAIL', name, extra ? `-> ${extra}` : ''); } };
const section = (t) => console.log(`\n== ${t}`);

class Who {
  constructor(email, name) { this.email = email; this.name = name; this.cookie = ''; }
  async login() {
    const r = await fetch(`${BASE}/api/test-login`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-proto': 'https' }, body: JSON.stringify({ email: this.email }) });
    this.cookie = (r.headers.get('set-cookie') || '').split(';')[0];
    this.user = await r.json();
    if (!this.user?.id) throw new Error('login failed ' + this.email);
    this.id = this.user.id;
    return this;
  }
  async req(method, path, body) {
    const r = await fetch(`${BASE}${path}`, { method, headers: { cookie: this.cookie, 'content-type': 'application/json', 'x-forwarded-proto': 'https' }, body: body === undefined ? undefined : JSON.stringify(body) });
    let data = null; const t = await r.text(); try { data = t ? JSON.parse(t) : null; } catch { data = t; }
    return { status: r.status, data };
  }
  get = (p) => this.req('GET', p);
  post = (p, b) => this.req('POST', p, b);
  patch = (p, b) => this.req('PATCH', p, b);
  del = (p) => this.req('DELETE', p);
  async stories() { return (await this.get('/api/stories')).data; }
  async sees(id) { return (await this.get(`/api/stories/${id}`)).status === 200; }
  async notes() { return (await this.get('/api/notifications')).data?.items || []; }
}

const C1 = '00000000-0000-0000-0000-0000000000c1';
const fiona = new Who('fiona@example.com'), cora = new Who('cora@example.com'), lena = new Who('lena@example.com'),
  sam = new Who('sam@example.com'), sia = new Who('sia@example.com'), max = new Who('max@example.com'), hana = new Who('hana@example.com');
for (const w of [fiona, cora, lena, sam, sia, max, hana]) await w.login();
const story = (title, assignedTo, extra = {}) => ({ clientId: C1, title, description: 'Line one\nLine two', assignedTo, priority: 'Medium', status: 'To Do', progressPercent: 0, dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), tags: [], ...extra });

if (phase === 'phase1') {
  const S = {};
  section('1. Own story (employee makes work for himself)');
  let r = await sam.post('/api/stories', story('Sam own task', sam.id));
  ok(r.status === 201, 'employee can create a story for himself', r.status);
  S.own = r.data.id;
  ok(r.data.assignedBy === sam.id && !!r.data.acceptedAt, 'own story: assigned by self, accepted straight away');
  ok(r.data.description === 'Line one\nLine two', 'line breaks in the description are kept');
  ok(r.data?.dueDate && new Date(r.data.dueDate).getUTCHours() === 18 && new Date(r.data.dueDate).getUTCMinutes() >= 29, 'calendar due date = end of that day (IST)', r.data?.dueDate);
  ok(!(await sam.notes()).some((n) => n.entityId === S.own), 'no notification to yourself for your own story');

  section('2. Chief of staff assigns work to an employee');
  r = await cora.post('/api/stories', story('Cora gives Sam a report', sam.id));
  S.fromCora = r.data.id;
  ok(r.status === 201 && r.data.assignedBy === cora.id && r.data.acceptedAt === null, 'assigned work waits for Accept', JSON.stringify({ s: r.status, by: r.data?.assignedBy, acc: r.data?.acceptedAt }));
  let n = (await sam.notes()).find((x) => x.entityId === S.fromCora);
  ok(n && n.type === 'story_assigned', 'Sam is notified that work was assigned');
  ok(n && /Cora/.test(n.title), 'notification names who assigned it', n?.title);
  ok(await sam.sees(S.fromCora), 'Sam can open it');
  ok(await cora.sees(S.fromCora), 'Cora can open what she assigned');
  ok(!(await sia.sees(S.fromCora)), "Sia (same team) cannot open Sam's story");
  ok(!(await max.sees(S.fromCora)), "Max (other team) cannot open Sam's story");

  section('3. Employee assigns work to a colleague');
  r = await max.post('/api/stories', story('Max asks Sam for help', sam.id));
  S.fromMax = r.data.id;
  ok(r.status === 201 && r.data.acceptedAt === null, 'employee can assign work to a colleague; it waits for Accept', r.status);
  ok(await max.sees(S.fromMax), 'Max still sees the story he assigned (Assigned by me)');

  section('4. Feedback and Accept');
  r = await sam.post(`/api/stories/${S.fromCora}/feedback`, { message: '' });
  ok(r.status === 400, 'empty feedback is refused', r.status);
  r = await sia.post(`/api/stories/${S.fromCora}/feedback`, { message: 'not mine' });
  ok(r.status === 404 || r.status === 403, 'someone else cannot send feedback on it', r.status);
  r = await sam.post(`/api/stories/${S.fromCora}/feedback`, { message: 'Busy until Monday\nwill start then' });
  ok(r.status === 201, 'Sam sends feedback', r.status);
  ok(!!(await sam.get(`/api/stories/${S.fromCora}`)).data && (await sam.get(`/api/stories/${S.fromCora}`)).data.acceptedAt === null, 'after feedback the story still waits');
  n = (await cora.notes()).find((x) => x.entityId === S.fromCora && x.type === 'story_feedback');
  ok(!!n && /Monday/.test(n.message), 'Cora is notified with the feedback text');
  const cm = (await cora.get(`/api/stories/${S.fromCora}/comments`)).data || [];
  ok(cm.some((c) => /Busy until Monday\nwill start then/.test(c.body)), 'feedback is saved as a comment (line breaks kept)');
  r = await cora.post(`/api/stories/${S.fromCora}/accept`);
  ok(r.status === 403, 'the assigner cannot accept on the assignee\'s behalf', r.status);
  r = await sam.post(`/api/stories/${S.fromCora}/accept`);
  ok(r.status === 200 && !!r.data.acceptedAt, 'Sam accepts', r.status);
  n = (await cora.notes()).find((x) => x.entityId === S.fromCora && x.type === 'story_accepted');
  ok(!!n, 'Cora is notified that Sam accepted');
  r = await sam.post(`/api/stories/${S.fromCora}/accept`);
  ok(r.status === 200 && (await cora.notes()).filter((x) => x.entityId === S.fromCora && x.type === 'story_accepted').length === 1, 'accepting twice does not notify twice');
  // working on a waiting story accepts it
  r = await sam.patch(`/api/stories/${S.fromMax}`, { progressPercent: 30 });
  ok(r.status === 200 && !!r.data.acceptedAt && r.data.status === 'In Progress', 'moving the progress bar accepts it and sets In Progress', JSON.stringify({ acc: r.data?.acceptedAt, st: r.data?.status }));

  section('5. Progress and status rules');
  r = await sam.patch(`/api/stories/${S.own}`, { progressPercent: 100 });
  ok(r.data.status === 'Done', '100% = Done');
  r = await sam.patch(`/api/stories/${S.own}`, { progressPercent: 60 });
  ok(r.data.status === 'In Progress', 'dropping below 100% reopens it');
  r = await sam.patch(`/api/stories/${S.own}`, { status: 'Done' });
  ok(r.data.progressPercent === 100, 'marking Done fills the bar');
  r = await sam.patch(`/api/stories/${S.own}`, { status: 'To Do', progressPercent: 0 });

  section('6. Deleting');
  r = await sam.del(`/api/stories/${S.fromCora}`);
  ok(r.status === 403, 'Sam cannot delete work Cora gave him', r.status);
  r = await sia.del(`/api/stories/${S.own}`);
  ok(r.status === 404 || r.status === 403, "Sia cannot delete Sam's story", r.status);
  r = await sam.post('/api/stories', story('Sam scratch', sam.id));
  r = await sam.del(`/api/stories/${r.data.id}`);
  ok(r.status === 204, 'Sam can delete his own story', r.status);
  r = await max.post('/api/stories', story('Max to delete', sam.id));
  const tmp = r.data.id;
  ok((await max.del(`/api/stories/${tmp}`)).status === 204, 'the assigner can delete what he assigned');

  section('7. Comments and @mentions');
  r = await cora.post(`/api/stories/${S.fromCora}/comments`, { body: '@Sam Seller please add the numbers' });
  ok(r.status === 201, 'Cora comments with an @mention', r.status);
  const mentions = (await sam.get('/api/mentions')).data || [];
  ok(mentions.some((m) => m.storyId === S.fromCora), 'Sam sees the mention in "Mentions"');
  ok((await sam.notes()).some((x) => x.entityId === S.fromCora && /mention/i.test(x.type + x.title)), 'Sam gets a notification for the @mention');
  r = await sam.post(`/api/stories/${S.fromCora}/comments`, { body: 'Done, numbers added' });
  ok((await cora.notes()).some((x) => x.entityId === S.fromCora && /comment/i.test(x.type + x.title)), 'Cora is notified when Sam comments on the story she assigned');
  r = await sam.post(`/api/stories/${S.own}/comments`, { body: '@Sia Seller can you check this?' });
  ok(r.status === 201, 'Sam mentions Sia on his own story');
  ok(((await sia.get('/api/mentions')).data || []).some((m) => m.storyId === S.own), 'Sia sees the mention');
  ok(await sia.sees(S.own), 'Sia can open a story she was @mentioned in');
  r = await sia.post(`/api/stories/${S.own}/comments`, { body: 'Checked' });
  ok(r.status === 201, 'Sia can reply on a story she was @mentioned in', r.status);
  r = await sia.post(`/api/stories/${S.fromMax}/comments`, { body: 'sneaky' });
  ok(r.status === 404 || r.status === 403, 'nobody can comment on a story they cannot see', r.status);
  ok(!((await max.get('/api/mentions')).data || []).some((m) => m.storyId === S.own), 'a mention of Sia does not show for Max');

  section('8. Reassigning');
  r = await cora.patch(`/api/stories/${S.fromCora}`, { assignedTo: sia.id });
  ok(r.status === 200 && r.data.assignedTo === sia.id && r.data.assignedBy === cora.id && r.data.acceptedAt === null, 'reassigned work waits for the new person to accept', JSON.stringify({ to: r.data?.assignedTo, by: r.data?.assignedBy, acc: r.data?.acceptedAt }));
  ok((await sia.notes()).some((x) => x.entityId === S.fromCora && x.type === 'story_assigned'), 'Sia is notified');
  ok(!(await sam.stories()).some((x) => x.id === S.fromCora), "after it moved to Sia it leaves Sam's boards");
  ok((await sam.patch(`/api/stories/${S.fromCora}`, { progressPercent: 50 })).status === 404, 'Sam can no longer change it (he only keeps read access because he was @mentioned)');
  r = await sia.patch(`/api/stories/${S.fromCora}`, { assignedTo: sam.id });
  ok(r.status === 200, 'assignee may hand it back (records her as assigner)', r.status);
  S.handedBack = r.data;

  section('9. Who sees what (boards)');
  const ids = async (w) => new Set((await w.stories()).map((s) => s.id));
  const samSet = await ids(sam), siaSet = await ids(sia), maxSet = await ids(max), lenaSet = await ids(lena), coraSet = await ids(cora), fionaSet = await ids(fiona), hanaSet = await ids(hana);
  ok(samSet.has(S.own) && samSet.has(S.fromMax), 'Sam: his own and assigned stories');
  ok(!siaSet.has(S.fromMax), 'Sia: not Sam\'s stories');
  ok(maxSet.has(S.fromMax), 'Max: the story he assigned');
  ok(lenaSet.has(S.own) && lenaSet.has(S.fromMax), 'team lead: her team\'s stories');
  ok(coraSet.has(S.own) && fionaSet.has(S.own), 'chief of staff and founder: everything');
  ok(hanaSet.size === 0, 'HR: only her own (none)', hanaSet.size);

  section('10. Activity feed privacy');
  const feed = async (w) => ((await w.get('/api/activity?limit=200')).data || []);
  const siaFeed = await feed(sia);
  ok(!siaFeed.some((l) => l.entityId === S.fromMax), "Sia's activity feed has nothing about Sam's private story");
  const maxFeed = await feed(max);
  ok(!maxFeed.some((l) => l.entityId === S.own), "Max's feed has nothing about Sam's own story");

  section('11. Dashboard numbers');
  const ov = await fiona.get('/api/overview?period=today');
  ok(ov.status === 200, 'founder overview loads', ov.status);
  const lov = await lena.get('/api/overview?period=today');
  ok(lov.status === 200 && (lov.data?.teams || []).every((t) => t.team === 'Sales'), 'team lead overview: only her team', JSON.stringify((lov.data?.teams || []).map((t) => t.team)));
  const eov = await sam.get('/api/overview?period=today');
  ok(eov.status === 403 || eov.status === 404, 'employee cannot load the company overview', eov.status);

  section('12. Repeating tasks');
  r = await cora.post('/api/recurring-tasks', { clientId: C1, title: 'Daily sales call log', repeat: 'daily', team: 'Sales', assigneeIds: [] });
  ok(r.status === 201, 'chief of staff sets up a daily task for the Sales team', r.status + JSON.stringify(r.data));
  S.rule = r.data?.task?.id;
  let copies = (await cora.stories()).filter((s) => s.recurringTaskId === S.rule);
  ok(copies.length === 3, "today's copies for Lena, Sam and Sia appear at once", copies.length);
  const samCopy = copies.find((s) => s.assignedTo === sam.id);
  S.samCopy = samCopy?.id;
  ok(samCopy && samCopy.assignedBy === cora.id && !!samCopy.acceptedAt, 'copy: assigned by Cora, no Accept needed');
  r = await sam.patch(`/api/recurring-tasks/${S.rule}`, { active: false });
  ok(r.status === 404 || r.status === 403, "Sam cannot pause Cora's repeating task", r.status);
  r = await sam.del(`/api/stories/${S.samCopy}`);
  ok(r.status === 403, "Sam cannot delete a copy of Cora's task", r.status);
  r = await cora.del(`/api/stories/${S.samCopy}`);
  ok(r.status === 204, "Cora removes Sam's copy for today", r.status);
  r = await cora.patch(`/api/recurring-tasks/${S.rule}`, { active: false });
  ok(r.status === 200 && r.data.task.active === false, 'Cora pauses it');
  r = await cora.patch(`/api/recurring-tasks/${S.rule}`, { active: true });
  ok(r.status === 200, 'Cora resumes it');
  copies = (await cora.stories()).filter((s) => s.recurringTaskId === S.rule && s.assignedTo === sam.id);
  ok(copies.length === 0, "the copy Cora removed today does NOT come back on resume", copies.length);
  // own repeating task
  r = await sam.post('/api/recurring-tasks', { clientId: C1, title: 'Sam daily update', repeat: 'daily', assigneeIds: [sam.id] });
  ok(r.status === 201, 'employee sets up his own daily task', r.status);
  S.samRule = r.data?.task?.id;
  const own = (await sam.stories()).find((s) => s.recurringTaskId === S.samRule);
  ok(own && own.assignedBy === sam.id, "own repeating copy is in Sam's My Work");
  r = await sam.del(`/api/stories/${own?.id}`);
  ok(r.status === 204, 'Sam removes today\'s copy of his own task', r.status);
  r = await sam.del(`/api/recurring-tasks/${S.samRule}`);
  ok(r.status === 403, 'only founders delete a whole repeating task (Sam must pause)', r.status);
  r = await sam.post('/api/recurring-tasks', { clientId: C1, title: 'Sneaky for Sia', repeat: 'daily', assigneeIds: [sia.id] });
  const forSia = (await sia.stories()).some((s) => s.title === 'Sneaky for Sia');
  ok(!forSia, 'an employee cannot set up repeating work for someone else');
  r = await lena.post('/api/recurring-tasks', { clientId: C1, title: 'Lena for Max', repeat: 'daily', assigneeIds: [max.id] });
  ok(r.status === 400, 'a team lead cannot set up repeating work outside her team', r.status);

  section('14. Mentions: answered / done');
  let sm = (await sam.get('/api/mentions')).data || [];
  const coraAsk = sm.find((m) => m.storyId === S.fromCora);
  ok(coraAsk && coraAsk.state === 'answered', "Sam replied on that story after the mention -> 'answered'", JSON.stringify(coraAsk?.state));
  r = await cora.post(`/api/stories/${S.own}/comments`, { body: '@Sam Seller FYI the client called' });
  sm = (await sam.get('/api/mentions')).data || [];
  const fyi = sm.find((m) => /FYI the client called/.test(m.body));
  ok(fyi && fyi.state === 'new', 'a new mention is "new"');
  ok((await sia.post(`/api/mentions/${fyi?.id}/done`)).status === 404, 'someone else cannot tick your mention');
  ok((await sam.post(`/api/mentions/${fyi?.id}/done`)).status === 200, 'Sam ticks it Done');
  sm = (await sam.get('/api/mentions')).data || [];
  ok(sm.find((m) => m.id === fyi?.id)?.state === 'done', "it is now 'done'");
  ok(!(await sam.notes()).some((n) => n.type === 'mention' && n.entityId === S.own && !n.isRead), 'its bell notification is marked read too');
  const siaM = ((await sia.get('/api/mentions')).data || []).find((m) => m.storyId === S.own);
  ok(siaM && siaM.state === 'answered', "Sia replied 'Checked' after being tagged -> answered");

  section('15. Overview: yesterday and missed routines');
  const yv = await cora.get('/api/overview?period=yesterday');
  ok(yv.status === 200 && Array.isArray(yv.data.missedRoutines) && typeof yv.data.summary.missed === 'number', 'yesterday overview loads with missed routines', yv.status);

  fs.writeFileSync(STATE, JSON.stringify(S));
  console.log('\nphase1: restart the app now, then run phase2 (simulates the 10-minute / 12 AM job)');
} else {
  const S = JSON.parse(fs.readFileSync(STATE, 'utf8'));
  section('13. After the background job runs again');
  const all = await fiona.stories();
  const samCopies = all.filter((s) => s.recurringTaskId === S.rule && s.assignedTo === sam.id);
  ok(samCopies.length === 0, "a copy removed today never comes back (Cora's task)", samCopies.length);
  const ownCopies = all.filter((s) => s.recurringTaskId === S.samRule);
  ok(ownCopies.length === 0, "a copy removed today never comes back (Sam's own task)", ownCopies.length);
  const others = all.filter((s) => s.recurringTaskId === S.rule);
  ok(others.length === 2, 'the other copies are untouched (no duplicates)', others.length);
}

console.log(`\n${pass} passed, ${fails.length} failed`);
for (const f of fails) console.log('FAIL', f);
process.exit(0);
