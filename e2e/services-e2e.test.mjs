// Repeating tasks, leave / WFH / overtime against the throwaway DB on :5055 (run e2e/seed.mjs first).
import { chromium } from 'playwright-core';
import postgres from 'postgres';

const BASE = 'http://localhost:5055';
const DB = 'postgres://postgres:pw@localhost:54329/crm';
let pass = 0; const failures = [];
const ok = (c, n, x = '') => { if (c) pass++; else failures.push(n + (x ? '  -> ' + x : '')); };
const browser = await chromium.launch({ channel: 'chrome' });

async function who(email, phone) {
  const ctx = await browser.newContext({ viewport: phone ? { width: 390, height: 844 } : { width: 1366, height: 800 }, hasTouch: !!phone, isMobile: !!phone, extraHTTPHeaders: { 'x-forwarded-proto': 'https' } });
  const r = await ctx.request.post(BASE + '/api/test-login', { data: { email } });
  if (!r.ok()) throw new Error('login ' + email);
  ctx.api = (m, p, d) => ctx.request.fetch(BASE + p, { method: m, data: d, headers: { 'content-type': 'application/json' } }).then(async (x) => ({ status: x.status(), data: await x.json().catch(() => null) }));
  return ctx;
}
const F = await who('vitalsaigorrela@gmail.com');
const HR = await who('hr@test.dev');
const P = await who('razorbill2018@gmail.com');
const R = await who('ranveer@test.dev');

const users = (await F.api('GET', '/api/users')).data;
const id = (e) => users.find((u) => u.email === e).id;
const [pooja, ranveer, hr] = [id('razorbill2018@gmail.com'), id('ranveer@test.dev'), id('hr@test.dev')];
const client = (await F.api('POST', '/api/clients', { name: 'Razorveda', industry: 'Retail', stage: 'Hot' })).data;

const istToday = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const dow = new Date(istToday + 'T00:00:00Z').getUTCDay();
const add = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

// teams + 7-day weeks so the checks do not depend on which weekday the suite runs
for (const u of [pooja, ranveer]) await F.api('PATCH', `/api/users/${u}`, { team: 'MIS', workPattern: 'all' });
ok((await F.api('PATCH', `/api/users/${pooja}`, { workPattern: 'whenever' })).status === 400, 'unknown work pattern rejected');
ok((await P.api('PATCH', `/api/users/${pooja}`, { workPattern: 'mon-fri' })).status === 403, 'employee cannot change work days');

const rule = (o = {}) => ({ clientId: client.id, title: 'P&L report', description: '1. P&L\n2. Notes', repeat: 'daily', team: 'MIS', assigneeIds: [], priority: 'High', ...o });
const stories = async () => (await F.api('GET', '/api/stories')).data;

// ---------------- permissions + validation ----------------
ok((await P.api('POST', '/api/recurring-tasks', rule())).status === 403, 'employee cannot create a repeating task');
ok((await HR.api('POST', '/api/recurring-tasks', rule())).status === 403, 'HR cannot either: founders only');
ok((await P.api('GET', '/api/recurring-tasks')).status === 403, 'employee cannot list repeating tasks');
const bad = async (o, name) => { const r = await F.api('POST', '/api/recurring-tasks', rule(o)); ok(r.status === 400, name, `${r.status} ${JSON.stringify(r.data).slice(0, 100)}`); };
await bad({ repeat: 'weekly' }, 'weekly needs a day of the week');
await bad({ repeat: 'monthly' }, 'monthly needs a day of the month');
await bad({ team: null, assigneeIds: [] }, 'must be for someone');
await bad({ team: 'Astronauts' }, 'unknown team rejected');
await bad({ dueTime: '7pm' }, 'bad time rejected');
await bad({ title: '  ' }, 'blank title rejected');
await bad({ team: null, assigneeIds: ['nobody'] }, 'unknown person rejected');

// ---------------- generation ----------------
const created = await F.api('POST', '/api/recurring-tasks', rule({ dueTime: '19:00' }));
ok(created.status === 201 && created.data.created === 2, 'a team rule creates today\'s story for each MIS member immediately', JSON.stringify(created.data).slice(0, 160));
let all = (await stories()).filter((s) => s.title === 'P&L report');
ok(all.length === 2 && all.every((s) => s.occurrenceDate === istToday && s.recurringTaskId === created.data.task.id), 'stories are linked to the rule and the day');
ok(all.every((s) => new Date(s.dueDate).toISOString() === new Date(`${istToday}T19:00:00+05:30`).toISOString()), 'due at the chosen time, India time', all[0]?.dueDate);
ok(new Set(all.map((s) => s.assignedTo)).size === 2 && all.every((s) => s.status === 'To Do' && s.person && s.description.includes('P&L')), 'one each, To Do, checklist copied, person name set');
// saving/resuming again must never duplicate
await F.api('PATCH', `/api/recurring-tasks/${created.data.task.id}`, { active: false });
const resumed = await F.api('PATCH', `/api/recurring-tasks/${created.data.task.id}`, { active: true });
ok(resumed.data.created === 0 && (await stories()).filter((s) => s.title === 'P&L report').length === 2, 'pausing and resuming does not duplicate today\'s stories');
const paused = await F.api('POST', '/api/recurring-tasks', rule({ title: 'Paused one' }));
await F.api('PATCH', `/api/recurring-tasks/${paused.data.task.id}`, { active: false });
// 5-day worker
await F.api('PATCH', `/api/users/${ranveer}`, { workPattern: 'mon-fri' });
const wk = await F.api('POST', '/api/recurring-tasks', rule({ title: 'Weekday report', team: null, assigneeIds: [ranveer] }));
ok(wk.data.created === (dow >= 1 && dow <= 5 ? 1 : 0), `a Mon-Fri worker is skipped on weekends (today is day ${dow})`, String(wk.data.created));
// weekly rule on a different weekday creates nothing today; on today's weekday creates one
const other = await F.api('POST', '/api/recurring-tasks', rule({ title: 'Weekly other', repeat: 'weekly', weekday: (dow + 3) % 7, team: null, assigneeIds: [pooja] }));
ok(other.data.created === 0, 'a weekly task for another weekday creates nothing today');
const same = await F.api('POST', '/api/recurring-tasks', rule({ title: 'Weekly today', repeat: 'weekly', weekday: dow, team: null, assigneeIds: [pooja] }));
ok(same.data.created === 1, "a weekly task on today's weekday creates today's story");
const monthly = await F.api('POST', '/api/recurring-tasks', rule({ title: 'Monthly today', repeat: 'monthly', monthDay: Number(istToday.slice(8)), team: null, assigneeIds: [pooja] }));
ok(monthly.data.created === 1, "a monthly task on today's date creates today's story");
await F.api('PATCH', `/api/users/${ranveer}`, { workPattern: 'all' });

// ---------------- leave: skips repeating tasks ----------------
const leave = await P.api('POST', '/api/requests', { type: 'leave', startDate: istToday, endDate: add(istToday, 1), reason: 'Family function' });
ok(leave.status === 201 && leave.data.status === 'pending', 'employee raises a leave request');
ok((await P.api('PATCH', `/api/requests/${leave.data.id}`, { status: 'approved' })).status === 403, 'employee cannot approve');
const overlapRule = await F.api('POST', '/api/recurring-tasks', rule({ title: 'Leads report' }));
ok(overlapRule.data.created === 2, 'while leave is still pending, tasks are still created');
const ap = await HR.api('PATCH', `/api/requests/${leave.data.id}`, { status: 'approved', note: 'Enjoy' });
ok(ap.status === 200 && ap.data.status === 'approved' && ap.data.decidedBy === hr, 'HR approves');
ok((await HR.api('PATCH', `/api/requests/${leave.data.id}`, { status: 'rejected' })).status === 409, 'a decided request cannot be decided again');
const afterLeave = await F.api('POST', '/api/recurring-tasks', rule({ title: 'Sales report' }));
ok(afterLeave.data.created === 1, 'once leave is approved, that person is skipped and the others are not', JSON.stringify(afterLeave.data.created));
const sr = (await stories()).filter((s) => s.title === 'Sales report');
ok(sr.length === 1 && sr[0].assignedTo === ranveer, 'only Ranveer got "Sales report" (Pooja is on leave)');
// HR cannot approve their own
const own = await HR.api('POST', '/api/requests', { type: 'wfh', startDate: istToday, reason: 'Plumber coming' });
ok((await HR.api('PATCH', `/api/requests/${own.data.id}`, { status: 'approved' })).status === 403, 'HR cannot approve their own request');
ok((await F.api('PATCH', `/api/requests/${own.data.id}`, { status: 'approved' })).status === 200, 'a founder can');

// ---------------- request rules ----------------
const rq = async (c, o) => c.api('POST', '/api/requests', o);
ok((await rq(R, { type: 'leave', startDate: istToday, endDate: add(istToday, -1), reason: 'oops' })).status === 400, 'end before start rejected');
ok((await rq(R, { type: 'leave', startDate: istToday, reason: 'x' })).status === 400, 'a one-letter reason is rejected');
ok((await rq(R, { type: 'leave', startDate: add(istToday, -40), reason: 'too old' })).status === 400, 'leave older than 30 days rejected');
ok((await rq(R, { type: 'leave', startDate: istToday, endDate: add(istToday, 90), reason: 'long trip' })).status === 400, 'a single request over 60 days rejected');
ok((await rq(R, { type: 'ot', startDate: istToday, reason: 'late deploy' })).status === 400, 'overtime without hours rejected');
ok((await rq(R, { type: 'ot', startDate: istToday, hours: 20, reason: 'late deploy' })).status === 400, 'overtime over 16 hours rejected');
ok((await rq(R, { type: 'ot', startDate: add(istToday, 2), hours: 2, reason: 'future' })).status === 400, 'overtime cannot be logged for the future');
const ot = await rq(R, { type: 'ot', startDate: istToday, hours: 2.5, reason: 'Late production deploy' });
ok(ot.status === 201 && Number(ot.data.hours) === 2.5 && ot.data.startDate === ot.data.endDate, 'employee logs 2.5 overtime hours');
// visibility
ok((await R.api('GET', '/api/requests')).data.every((x) => x.userId === ranveer), 'an employee sees only their own requests');
ok((await R.api('GET', '/api/requests?scope=all')).data.every((x) => x.userId === ranveer), 'scope=all is ignored for employees');
ok((await HR.api('GET', '/api/requests?scope=all')).data.length >= 3, 'HR sees everyone\'s requests');
// withdraw
const w = await rq(R, { type: 'wfh', startDate: istToday, reason: 'Internet repair visit' });
ok((await P.api('DELETE', `/api/requests/${w.data.id}`)).status === 403, "cannot withdraw someone else's request");
ok((await R.api('DELETE', `/api/requests/${w.data.id}`)).status === 204, 'withdraw your own pending request');
ok((await R.api('DELETE', `/api/requests/${ap.data.id}`)).status !== 204, 'a decided request cannot be withdrawn');
await F.api('PATCH', `/api/requests/${ot.data.id}`, { status: 'approved' });

// ---------------- overview + housekeeping ----------------
const ov = (await F.api('GET', '/api/overview?period=today')).data;
ok(ov.summary.awayToday.leave.includes('Pooja Singh') && ov.summary.awayToday.wfh.includes('Mahi HR') && ov.summary.otHours === 2.5, 'overview shows who is on leave and the overtime', JSON.stringify(ov.summary.awayToday) + ov.summary.otHours);
ok(ov.people.find((p) => p.name === 'Pooja Singh').health === 'away', 'Pooja shows as on leave, not as underperforming');
// nobody can fake a repeating link through the normal story endpoints
const forged = await P.api('POST', '/api/stories', { clientId: client.id, title: 'forged', description: '', assignedTo: pooja, person: 'Pooja Singh', status: 'To Do', priority: 'Medium', estimatedEffortHours: 0, progressPercent: 0, dueDate: new Date().toISOString(), tags: [], recurringTaskId: created.data.task.id, occurrenceDate: '2020-01-01' });
ok(forged.status === 201 && !forged.data.recurringTaskId && !forged.data.occurrenceDate, 'the repeating link fields cannot be forged');
// finished repeating stories older than a week leave the boards but not the data
const sql = postgres(DB, { prepare: false });
const old = (await stories()).find((s) => s.title === 'P&L report');
await F.api('PATCH', `/api/stories/${old.id}`, { status: 'Done' });
await sql`update stories set updated_at = now() - interval '10 days' where id = ${old.id}`;
ok(!(await stories()).some((s) => s.id === old.id), 'a repeating story finished 10 days ago is hidden from the boards');
ok((await sql`select count(*)::int n from stories where id = ${old.id}`)[0].n === 1, '...but still stored');
await sql.end();
// deleting a rule leaves the stories already created
const n0 = (await stories()).length;
ok((await F.api('DELETE', `/api/recurring-tasks/${paused.data.task.id}`)).status === 204 && (await stories()).length === n0, 'deleting a repeating task keeps existing stories');
ok((await F.api('DELETE', `/api/recurring-tasks/${paused.data.task.id}`)).status === 404, 'deleting it twice is a clean 404');

// ---------------- UI (phone) ----------------
async function step(name, page, fn) {
  try { await fn(); pass++; console.log('  ok   ' + name); }
  catch (e) { failures.push(`${name}: ${e.message.split('\n')[0]}`); console.log('  FAIL ' + name + ' -> ' + e.message.split('\n')[0]); await page.screenshot({ path: `e2e/shots-ui/FAIL-svc-${name.replace(/\W+/g, '_').slice(0, 30)}.png` }).catch(() => {}); }
}
const go = async (p, path) => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(400); };
const noSideways = async (p) => { const w = await p.evaluate(() => { const m = document.querySelector('main'); return m ? m.scrollWidth - m.clientWidth : 0; }); if (w > 1) throw new Error('content wider than screen by ' + w); };

console.log('\nFounder on a phone: add a repeating task');
{
  const ctx = await who('vitalsaigorrela@gmail.com', true);
  const p = await ctx.newPage();
  await step('Add Story -> Repeat -> Every day -> a whole team -> saved, stories appear', p, async () => {
    await go(p, '/global-kanban');
    await p.getByRole('button', { name: /Add Story/ }).click();
    await p.getByTestId('select-story-client').click(); await p.getByRole('option', { name: 'Razorveda' }).click();
    await p.getByTestId('input-story-title').fill('Design: post for client accounts');
    await p.getByTestId('select-repeat').scrollIntoViewIfNeeded();
    await p.getByTestId('select-repeat').click(); await p.getByRole('option', { name: 'Every day' }).click();
    await p.getByTestId('select-due-kind').click(); await p.getByRole('option', { name: 'At a set time' }).click();
    await p.getByTestId('input-due-time').fill('18:30');
    await p.getByTestId('select-for').click(); await p.getByRole('option', { name: 'Everyone in a team' }).click();
    await p.getByTestId('select-team').click(); await p.getByRole('option', { name: 'MIS' }).click();
    const dlg = p.getByRole('dialog'); const box = await dlg.boundingBox();
    if (box.x + box.width > 391) throw new Error('dialog wider than the phone');
    await p.screenshot({ path: 'e2e/shots-ui/repeat-form-phone.png' });
    await p.getByTestId('button-create-story').scrollIntoViewIfNeeded();
    await p.getByTestId('button-create-story').click();
    await p.waitForTimeout(1200);
    const made = (await stories()).filter((s) => s.title === 'Design: post for client accounts');
    if (made.length !== 1 || made[0].assignedTo !== ranveer) throw new Error('expected just Ranveer (Pooja is on approved leave), got ' + made.length);
  });
  await step('Repeating Tasks page lists it; pause and resume work; layout fits', p, async () => {
    await go(p, '/recurring');
    const card = p.getByTestId('rule-Design: post for client accounts');
    await card.waitFor();
    const t = await card.innerText();
    if (!t.includes('Every working day') || !t.includes('18:30') || !t.includes('Everyone in MIS')) throw new Error(t.replace(/\n/g, ' '));
    await card.getByRole('button', { name: /Pause/ }).click(); await p.waitForTimeout(700);
    if (!(await card.innerText()).includes('Paused')) throw new Error('not paused');
    await card.getByRole('button', { name: /Resume/ }).click(); await p.waitForTimeout(700);
    await noSideways(p);
    await p.screenshot({ path: 'e2e/shots-ui/recurring-phone.png' });
  });
  await step('weekly shows its day picker and an incomplete form is refused', p, async () => {
    await go(p, '/recurring');
    await p.getByTestId('add-repeating').click();
    await p.getByTestId('select-story-client').click(); await p.getByRole('option', { name: 'Razorveda' }).click();
    await p.getByTestId('input-story-title').fill('Weekly thing');
    await p.getByTestId('select-repeat').click(); await p.getByRole('option', { name: 'Every week' }).click();
    await p.getByTestId('select-weekday').waitFor();
    await p.getByTestId('button-create-story').click();
    await p.getByTestId('story-error').waitFor({ timeout: 3000 });
  });
}

console.log('\nEmployee services on a phone');
{
  const ctx = await who('ranveer@test.dev', true);
  const p = await ctx.newPage();
  await step('employee raises leave from the Employee services page', p, async () => {
    await go(p, '/services');
    await p.getByTestId('kind-leave').click();
    await p.getByTestId('rq-start').fill(add(istToday, 5)); await p.getByTestId('rq-end').fill(add(istToday, 6));
    await p.getByTestId('rq-submit').click();
    await p.getByTestId('rq-error').waitFor({ timeout: 3000 }); // reason missing
    await p.getByTestId('rq-reason').fill('Cousin wedding');
    await p.getByTestId('rq-submit').click();
    await p.waitForTimeout(1000);
    const mine = (await ctx.api('GET', '/api/requests')).data.find((x) => x.reason === 'Cousin wedding');
    if (!mine || mine.status !== 'pending' || mine.startDate !== add(istToday, 5)) throw new Error('not saved: ' + JSON.stringify(mine));
    if (!/pending/i.test(await p.getByTestId('my-requests').innerText())) throw new Error('not shown as pending');
    await noSideways(p);
    await p.screenshot({ path: 'e2e/shots-ui/services-phone.png' });
  });
  await step('employee logs overtime hours', p, async () => {
    await go(p, '/services');
    await p.getByTestId('kind-ot').click();
    await p.getByTestId('rq-hours').fill('3');
    await p.getByTestId('rq-reason').fill('Fixing the checkout bug');
    await p.getByTestId('rq-submit').click(); await p.waitForTimeout(1000);
    if (!(await ctx.api('GET', '/api/requests')).data.some((x) => x.type === 'ot' && Number(x.hours) === 3)) throw new Error('overtime not saved');
  });
  await step('employee does not see the approvals box', p, async () => {
    await go(p, '/services');
    if (await p.getByTestId('approvals').count()) throw new Error('approvals visible to an employee');
  });
}
{
  const ctx = await who('hr@test.dev', true);
  const p = await ctx.newPage();
  await step('HR sees pending requests and approves one with a tap', p, async () => {
    await go(p, '/services');
    const box = p.getByTestId('approvals');
    await box.waitFor();
    const t = await box.innerText();
    if (!t.includes('ranveer razorveda') || !t.includes('Cousin wedding')) throw new Error(t.replace(/\n/g, ' ').slice(0, 160));
    const target = (await ctx.api('GET', '/api/requests?scope=all')).data.find((x) => x.reason === 'Cousin wedding');
    await p.getByTestId(`approve-${target.id}`).click(); await p.waitForTimeout(1000);
    const after = (await ctx.api('GET', '/api/requests?scope=all')).data.find((x) => x.id === target.id);
    if (after.status !== 'approved') throw new Error('status ' + after.status);
    await noSideways(p);
  });
}
{
  const ctx = await who('vitalsaigorrela@gmail.com', true);
  const p = await ctx.newPage();
  await step('founder overview shows pending requests, who is away, overtime', p, async () => {
    await go(p, '/');
    const t = await p.getByTestId('overview-services').innerText();
    if (!/On leave today/.test(t) || !/Overtime/.test(t)) throw new Error(t.replace(/\n/g, ' '));
    await noSideways(p);
    await p.screenshot({ path: 'e2e/shots-ui/overview-services-phone.png' });
  });
  await step('Internal -> Edit shows Working days and saves it', p, async () => {
    const d = await who('vitalsaigorrela@gmail.com', false);
    const dp = await d.newPage();
    await go(dp, '/internal');
    await dp.getByTestId(`edit-user-${ranveer}`).click();
    await dp.getByTestId('edit-pattern').click();
    await dp.getByRole('option', { name: /5 days/ }).click();
    await dp.getByRole('button', { name: /Save Changes/ }).click(); await dp.waitForTimeout(1000);
    const u = (await d.api('GET', '/api/users')).data.find((x) => x.id === ranveer);
    if (u.workPattern !== 'mon-fri') throw new Error('pattern = ' + u.workPattern);
  });
}

await browser.close();
console.log(`\n${pass} checks passed, ${failures.length} failed`);
failures.forEach((f) => console.log('  FAIL: ' + f));
process.exit(failures.length ? 1 : 0);
