// Founder overview, teams and @mentions against the throwaway DB on :5055 (run e2e/seed.mjs first).
import { chromium } from 'playwright-core';

const BASE = 'http://localhost:5055';
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
const founder = await who('vitalsaigorrela@gmail.com');
const pooja = await who('razorbill2018@gmail.com');
const ranveer = await who('ranveer@test.dev');
const users = (await founder.api('GET', '/api/users')).data;
const U = (e) => users.find((u) => u.email === e);
const poojaU = U('razorbill2018@gmail.com'), ranveerU = U('ranveer@test.dev');

// data: 2 clients, stories for both, one in Review, one overdue
const client = (await founder.api('POST', '/api/clients', { name: 'Razorveda', industry: 'Retail', stage: 'Hot' })).data;
const day = (d) => new Date(Date.now() + d * 86400000).toISOString();
const story = async (title, u, status, due) => (await founder.api('POST', '/api/stories', { clientId: client.id, title, description: '', assignedTo: u.id, person: `${u.firstName} ${u.lastName}`, status, priority: 'Medium', estimatedEffortHours: 1, progressPercent: 0, dueDate: day(due), tags: [] })).data;
const sPooja = await story('Pooja calls', poojaU, 'To Do', -2);
await story('Pooja report', poojaU, 'Done', 0);
const sRan = await story('Ranveer site fix', ranveerU, 'Review', 1);
await story('Ranveer deploy', ranveerU, 'In Progress', 3);

// ---------------- API: permissions, teams, overview ----------------
ok((await pooja.api('GET', '/api/overview')).status === 403, 'employee cannot open the founder overview');
ok((await ranveer.api('GET', '/api/overview?period=week')).status === 403, 'another employee cannot either');
let ov = (await founder.api('GET', '/api/overview?period=week')).data;
ok(ov.people.length === 4 && !ov.people.some((p) => p.id === U('vitalsaigorrela@gmail.com').id), 'overview lists the team, not the founder', String(ov.people?.length));
ok(ov.teams.length === 1 && ov.teams[0].team === 'No team set', 'before teams are set, everyone is grouped as "No team set"');
ok((await founder.api('PATCH', `/api/users/${poojaU.id}`, { team: 'Sales' })).status === 200, 'founder sets a team');
ok((await founder.api('PATCH', `/api/users/${ranveerU.id}`, { team: 'Development' })).status === 200, 'founder sets another team');
ok((await founder.api('PATCH', `/api/users/${poojaU.id}`, { team: 'Astronauts' })).status === 400, 'unknown team rejected');
ok((await pooja.api('PATCH', `/api/users/${poojaU.id}`, { team: 'Design' })).status === 403, 'employee cannot change a team');
ov = (await founder.api('GET', '/api/overview?period=week')).data;
ok(['Sales', 'Development'].every((t) => ov.teams.some((x) => x.team === t)), 'teams appear once set', ov.teams.map((t) => t.team).join());
const row = (n) => ov.people.find((p) => p.name === n);
ok(row('Pooja Singh').overdue === 1 && row('Pooja Singh').health === 'attention', 'Pooja has 1 overdue -> needs attention', JSON.stringify(row('Pooja Singh')).slice(0, 200));
ok(ov.review.length === 1 && ov.review[0].assignee === 'ranveer razorveda', 'review queue shows who has it', JSON.stringify(ov.review));
for (const p of ['today', 'month']) { const r = await founder.api('GET', `/api/overview?period=${p}`); ok(r.status === 200 && r.data.period === p, `${p} period works`, String(r.status)); }
ok((await founder.api('GET', '/api/overview?period=bogus')).data.period === 'today', 'unknown period falls back to today');

// ---------------- API: mentions are private ----------------
const say = (c, storyId, authorU, body) => c.api('POST', `/api/stories/${storyId}/comments`, { authorId: authorU.id, authorName: `${authorU.firstName} ${authorU.lastName}`, body, isSystem: false });
await say(ranveer, sRan.id, ranveerU, '@Pooja Singh please review the login page today');
await say(ranveer, sRan.id, ranveerU, 'unrelated note with no tag');
await say(pooja, sPooja.id, poojaU, 'talking to myself @Pooja Singh');
await say(pooja, sPooja.id, poojaU, 'wildcard attempt @P%');
const mine = (await pooja.api('GET', '/api/mentions')).data;
ok(mine.length === 1 && mine[0].body.includes('please review'), 'Pooja sees only the comment that tags her', JSON.stringify(mine.map((m) => m.body)));
ok(mine[0].storyTitle === 'Ranveer site fix' && mine[0].clientId === client.id, 'mention links to the right story');
ok((await ranveer.api('GET', '/api/mentions')).data.length === 0, 'the author does not see their own tag');
ok((await founder.api('GET', '/api/mentions')).data.length === 0, "the founder does not see someone else's mentions");

// ---------------- UI ----------------
async function step(name, page, fn) {
  try { await fn(); pass++; console.log('  ok   ' + name); }
  catch (e) { failures.push(`${name}: ${e.message.split('\n')[0]}`); console.log('  FAIL ' + name + ' -> ' + e.message.split('\n')[0]); await page.screenshot({ path: `e2e/shots-ui/FAIL-ov-${name.replace(/\W+/g, '_').slice(0, 30)}.png` }).catch(() => {}); }
}
const go = async (p, path) => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(400); };
const noSideways = async (p) => { const w = await p.evaluate(() => { const m = document.querySelector('main'); return m ? m.scrollWidth - m.clientWidth : 0; }); if (w > 1) throw new Error('content wider than screen by ' + w); };

for (const phone of [true, false]) {
  const label = phone ? 'phone' : 'desktop';
  const fctx = await who('vitalsaigorrela@gmail.com', phone);
  const fp = await fctx.newPage();
  const errs = []; fp.on('pageerror', (e) => errs.push(e.message));
  console.log(`\nFounder ${label}`);
  await step(`${label}: overview shows teams, people, review queue and latest comments`, fp, async () => {
    await go(fp, '/');
    const o = fp.getByTestId('founder-overview');
    await o.waitFor();
    const t = await o.innerText();
    for (const x of ['Sales', 'Development', 'Pooja Singh', 'ranveer razorveda', 'Ranveer site fix', 'Waiting for review']) if (!t.includes(x)) throw new Error('missing: ' + x);
    await fp.getByTestId('period-week').click(); await fp.waitForTimeout(500);
    await fp.getByTestId('period-month').click(); await fp.waitForTimeout(500);
    await fp.getByTestId('period-today').click(); await fp.waitForTimeout(500);
    if (errs.length) throw new Error(errs[0]);
    await noSideways(fp);
    await fp.screenshot({ path: `e2e/shots-ui/overview-${label}.png`, fullPage: false });
  });
  await step(`${label}: tapping a team filters the people list`, fp, async () => {
    await go(fp, '/');
    await fp.getByTestId('team-Sales').click();
    const people = await fp.getByTestId('overview-people').innerText();
    if (!people.includes('Pooja Singh') || people.includes('ranveer razorveda')) throw new Error('filter wrong: ' + people.slice(0, 80));
  });
  await fctx.close();
}

console.log('\nTeam from the Internal page');
{
  const fctx = await who('vitalsaigorrela@gmail.com', false);
  const p = await fctx.newPage();
  await step('Internal -> Edit -> Team saves and shows on the overview', p, async () => {
    await go(p, '/internal');
    await p.getByTestId(`edit-user-${poojaU.id}`).click();
    await p.getByTestId('edit-team').click();
    await p.getByRole('option', { name: 'Marketing' }).click();
    await p.getByRole('button', { name: /Save Changes/ }).click();
    await p.waitForTimeout(1000);
    const u = (await fctx.api('GET', '/api/users')).data.find((x) => x.id === poojaU.id);
    if (u.team !== 'Marketing') throw new Error('team = ' + u.team);
    await fctx.api('PATCH', `/api/users/${poojaU.id}`, { team: 'Sales' });
  });
  await fctx.close();
}

console.log('\n@mention on a phone');
{
  const pctx = await who('razorbill2018@gmail.com', true);
  const p = await pctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await step('typing @ offers teammates; picking one inserts the full name; posting saves it', p, async () => {
    await go(p, '/global-kanban');
    await p.getByRole('tab', { name: /Review/ }).click();
    await p.getByRole('button', { name: /View Details/ }).first().click();
    await p.getByRole('tab', { name: /Comments/ }).click();
    const box = p.getByTestId('input-comment');
    await box.click();
    await p.keyboard.type('Looks good, over to you @Ran');
    await p.getByTestId('mention-list').waitFor({ timeout: 3000 });
    const lb = await p.getByTestId('mention-list').boundingBox();
    if (lb.x < 0 || lb.x + lb.width > 391) throw new Error('mention list off screen');
    await p.getByRole('option', { name: /ranveer razorveda/ }).first().click();
    const v = await box.inputValue();
    if (!v.includes('@ranveer razorveda ')) throw new Error('inserted text: ' + v);
    await p.keyboard.type('please deploy');
    await p.locator('button:has(svg.lucide-send)').first().click();
    await p.waitForTimeout(1000);
    const body = (await pctx.api('GET', `/api/stories/${sRan.id}/comments`)).data.map((c) => c.body);
    if (!body.some((b) => b.includes('@ranveer razorveda please deploy'))) throw new Error('not saved: ' + body.join(' | '));
    if (errs.length) throw new Error(errs[0]);
  });
  await pctx.close();

  const rctx = await who('ranveer@test.dev', true);
  const rp = await rctx.newPage();
  await step("Ranveer's dashboard shows the mention; Pooja's and the founder's do not", rp, async () => {
    await go(rp, '/');
    const card = rp.getByTestId('mentions-card');
    await card.waitFor({ timeout: 4000 });
    const t = await card.innerText();
    if (!t.includes('please deploy') || !t.includes('Pooja Singh')) throw new Error('card: ' + t.replace(/\n/g, ' ').slice(0, 120));
    await noSideways(rp);
    await rp.screenshot({ path: 'e2e/shots-ui/mention-ranveer.png' });
    const pctx2 = await who('razorbill2018@gmail.com', true);
    const pp = await pctx2.newPage(); await go(pp, '/');
    if (await pp.getByTestId('mentions-card').count()) { const x = await pp.getByTestId('mentions-card').innerText(); if (x.includes('please deploy')) throw new Error("leaked to Pooja"); }
    const fctx2 = await who('vitalsaigorrela@gmail.com', true);
    const fpp = await fctx2.newPage(); await go(fpp, '/');
    if (await fpp.getByTestId('mentions-card').count()) throw new Error('founder sees a mention card for a comment that did not tag them');
  });
}

await browser.close();
console.log(`\n${pass} checks passed, ${failures.length} failed`);
failures.forEach((f) => console.log('  FAIL: ' + f));
process.exit(failures.length ? 1 : 0);
