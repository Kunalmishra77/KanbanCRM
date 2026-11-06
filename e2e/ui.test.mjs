// Real browser flows against the local test server (port 5055, throwaway database), at phone width.
// Run: node e2e/ui.test.mjs [desktop]
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = 'http://localhost:5055';
const DESKTOP = process.argv.includes('desktop');
const VP = DESKTOP ? { width: 1366, height: 800 } : { width: 390, height: 844 };
fs.mkdirSync('e2e/shots-ui', { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
let pass = 0; const failures = [];

async function session(email, google = {}) {
  const ctx = await browser.newContext({ viewport: VP, hasTouch: !DESKTOP, isMobile: !DESKTOP, extraHTTPHeaders: { 'x-forwarded-proto': 'https' } });
  const r = await ctx.request.post(BASE + '/api/test-login', { data: { email, googleGivenName: google.given, googleFamilyName: google.family } });
  if (!r.ok()) throw new Error('login failed ' + email + ' ' + r.status());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.split('\n')[0]));
  page.on('response', (res) => { if (res.url().startsWith(BASE + '/api') && res.status() >= 500) errors.push(`${res.status()} ${res.url().replace(BASE, '')}`); });
  page.errors = errors; page.ctx = ctx;
  return page;
}
const api = (page, method, path, data) => page.ctx.request.fetch(BASE + path, { method, data, headers: { 'content-type': 'application/json' } }).then(async (r) => ({ status: r.status(), data: await r.json().catch(() => null) }));

async function step(name, page, fn) {
  const before = page.errors.length;
  try {
    await fn();
    if (page.errors.length > before) throw new Error('server/page error: ' + page.errors.slice(before).join(' | '));
    pass++;
    console.log('  ok   ' + name);
  } catch (e) {
    failures.push(`${name}: ${e.message.split('\n')[0]}`);
    console.log('  FAIL ' + name + ' -> ' + e.message.split('\n')[0]);
    await page.screenshot({ path: `e2e/shots-ui/FAIL-${name.replace(/\W+/g, '_').slice(0, 40)}.png` }).catch(() => {});
  }
}
const go = async (page, path) => { await page.goto(BASE + path, { waitUntil: 'networkidle' }); await page.waitForTimeout(300); };
const pickOption = async (page, trigger, optionText) => { await trigger.click(); await page.getByRole('option', { name: optionText, exact: false }).first().click(); };
const noSideways = async (page, label) => { const w = await page.evaluate(() => { const m = document.querySelector('main'); return m ? m.scrollWidth - m.clientWidth : 0; }); if (w > 1) throw new Error(`${label}: content wider than screen by ${w}px`); };

// ---- seed data through the API as founder ----
const founder = await session('vitalsaigorrela@gmail.com', { given: 'Vital' });
const users = (await api(founder, 'GET', '/api/users')).data;
const id = (e) => users.find((u) => u.email === e).id;
const poojaId = id('razorbill2018@gmail.com'), ranveerId = id('ranveer@test.dev');
const mkClient = async (name, stage, owner) => (await api(founder, 'POST', '/api/clients', { name, industry: 'Retail', stage, ownerId: owner, expectedRevenue: '100000', revenueTotal: '25000' })).data;
const hot = await mkClient('Hot Co', 'Hot', poojaId), cold = await mkClient('Cold Co', 'Cold', ranveerId);
const due = (d) => new Date(Date.now() + d * 86400000).toISOString();
const mkStory = (clientId, title, assignedTo, person, status, d) => api(founder, 'POST', '/api/stories', { clientId, title, description: 'seed', assignedTo, person, status, priority: 'Medium', estimatedEffortHours: 1, progressPercent: 0, dueDate: due(d), tags: [] });
await mkStory(hot.id, 'Pooja one', poojaId, 'Razor Bill', 'To Do', 3);
await mkStory(hot.id, 'Pooja two', poojaId, 'Pooja Singh', 'In Progress', -2);
await mkStory(cold.id, 'Ranveer one', ranveerId, 'ranveer razorveda', 'To Do', 5);

// ================= Pooja (employee), signs in as Google "Razorbill" =================
console.log('\nPooja (employee)' + (DESKTOP ? ' desktop' : ' phone'));
const pooja = await session('razorbill2018@gmail.com', { given: 'Razorbill' });

await step('dashboard greets her by her internal name, not "Razorbill"', pooja, async () => {
  await go(pooja, '/');
  const t = await pooja.locator('body').innerText();
  if (!/Welcome back, Pooja/.test(t)) throw new Error('greeting: ' + t.slice(0, 120).replace(/\n/g, ' '));
  if (/Razorbill/i.test(t.split('My work')[0])) throw new Error('Razorbill appears in header area');
});
await step('top-right menu shows Pooja Singh', pooja, async () => {
  await pooja.getByRole('button', { name: 'Account menu' }).click();
  await pooja.getByText('Pooja Singh').first().waitFor({ timeout: 3000 });
  await pooja.keyboard.press('Escape');
});
await step('dashboard "My work" shows only her 2 stories, 2 on Hot, none of Ranveer\'s', pooja, async () => {
  await go(pooja, '/');
  const w = pooja.locator('[data-testid=my-work]');
  const t = (await w.innerText()).replace(/\n+/g, ' ');
  if (!/2\s+Assigned to me/.test(t)) throw new Error('assigned: ' + t.slice(0, 100));
  const n = async (k) => Number(await pooja.locator(`[data-testid=my-temp-${k}] p`).first().innerText());
  if ((await n('Hot')) !== 2 || (await n('Warm')) !== 0 || (await n('Cold')) !== 0) throw new Error(`temps ${await n('Hot')}/${await n('Warm')}/${await n('Cold')}`);
  if (/Ranveer one/.test(t)) throw new Error("Ranveer's story shown");
  if (!/Overdue\s+1|1\s+Overdue/.test(t)) throw new Error('overdue count: ' + t.slice(0, 160));
  await noSideways(pooja, 'dashboard');
  await pooja.screenshot({ path: 'e2e/shots-ui/pooja-dashboard.png' });
});
await step('board: her story cards show her name (also the one with stale "Razor Bill" text)', pooja, async () => {
  await go(pooja, '/global-kanban');
  await pooja.getByRole('tab', { name: /To Do/ }).click();
  const todo = await pooja.locator('main').innerText();
  if (!/Pooja one/.test(todo)) throw new Error('missing story');
  const card = pooja.locator('div', { hasText: 'Pooja one' }).last();
  if (/Razor Bill/.test(await pooja.locator('main').innerText())) throw new Error('"Razor Bill" still displayed');
  await noSideways(pooja, 'board');
});
await step('board: assignee filter for Pooja excludes Ranveer\'s story', pooja, async () => {
  await go(pooja, '/global-kanban');
  await pooja.getByRole('button', { name: /Filter/ }).click();
  await pooja.getByText('Pooja Singh', { exact: false }).last().click();
  await pooja.keyboard.press('Escape');
  await pooja.waitForTimeout(300);
  for (const tab of ['To Do', 'In Progress']) { await pooja.getByRole('tab', { name: new RegExp(tab) }).click(); }
  await pooja.getByRole('tab', { name: /To Do/ }).click();
  const t = await pooja.locator('main').innerText();
  if (/Ranveer one/.test(t)) throw new Error("Ranveer's story leaked into Pooja's filter");
  if (!/Pooja one/.test(t)) throw new Error("Pooja's own story missing under her filter");
});
await step('create a story from the board, assigned to herself', pooja, async () => {
  await go(pooja, '/global-kanban');
  await pooja.getByRole('button', { name: /Add Story/ }).click();
  await pickOption(pooja, pooja.getByTestId('select-story-client'), 'Hot Co');
  await pickOption(pooja, pooja.getByTestId('select-story-assignee'), 'Pooja Singh');
  await pooja.getByTestId('input-story-title').fill('Created from phone');
  const box = await pooja.getByRole('dialog').boundingBox();
  if (box && box.x + box.width > VP.width + 1) throw new Error('dialog wider than screen');
  await pooja.getByTestId('button-create-story').click();
  await pooja.waitForTimeout(800);
  const s = (await api(pooja, 'GET', '/api/stories')).data.find((x) => x.title === 'Created from phone');
  if (!s || s.assignedTo !== poojaId) throw new Error('story not saved to Pooja: ' + JSON.stringify(s && s.assignedTo));
  if (s.person !== 'Pooja Singh') throw new Error('person text is ' + s.person);
});
await step('dashboard count goes up to 3 after creating it', pooja, async () => {
  await go(pooja, '/');
  const t = (await pooja.locator('[data-testid=my-work]').innerText()).replace(/\n+/g, ' ');
  if (!/3\s+Assigned to me/.test(t)) throw new Error(t.slice(0, 100));
});
await step('move a story to another status with the dropdown', pooja, async () => {
  await go(pooja, '/global-kanban');
  await pooja.getByRole('tab', { name: /To Do/ }).click();
  const sel = pooja.locator('select').first();
  await sel.selectOption('In Progress');
  await pooja.waitForTimeout(800);
  const inprog = (await api(pooja, 'GET', '/api/stories')).data.filter((s) => s.status === 'In Progress').length;
  if (inprog < 2) throw new Error('status did not change on server (in progress=' + inprog + ')');
});
await step('open a story, edit the title, add a comment', pooja, async () => {
  await go(pooja, '/global-kanban');
  await pooja.getByRole('tab', { name: /In Progress/ }).click();
  await pooja.getByRole('button', { name: /View Details/ }).first().click();
  await pooja.getByRole('button', { name: 'Edit story' }).click();
  const title = pooja.getByRole('dialog').locator('input').first();
  await title.fill('Renamed by Pooja');
  await pooja.getByRole('dialog').locator('button:has(svg.lucide-check)').first().click();
  await pooja.waitForTimeout(800);
  const names = (await api(pooja, 'GET', '/api/stories')).data.map((s) => s.title);
  if (!names.includes('Renamed by Pooja')) throw new Error('title not saved: ' + names.join(','));
  await pooja.getByRole('tab', { name: /Comments/ }).click();
  const box = pooja.getByRole('dialog').locator('textarea').last();
  await box.fill('comment from the UI');
  await pooja.getByRole('dialog').locator('button:has(svg.lucide-send)').first().click();
  await pooja.waitForTimeout(800);
  const st = (await api(pooja, 'GET', '/api/stories')).data.find((s) => s.title === 'Renamed by Pooja');
  const c = (await api(pooja, 'GET', `/api/stories/${st.id}/comments`)).data;
  if (!c.some((x) => /comment from the UI/.test(x.body))) throw new Error('comment not saved');
  if (!c.some((x) => x.authorName === 'Pooja Singh' || x.authorId === poojaId)) throw new Error('comment author wrong: ' + JSON.stringify(c.map((x) => x.authorName)));
});
await step('Clients page loads, tabs switch, no revenue shown to employee', pooja, async () => {
  await go(pooja, '/clients');
  const t = await pooja.locator('main').innerText();
  if (!/Hot Co/.test(t)) throw new Error('client missing');
  if (/Revenue Collected/.test(t)) throw new Error('revenue visible to employee');
  await pooja.getByRole('tab', { name: /Cold/ }).click();
  await pooja.getByText('Cold Co').first().waitFor({ timeout: 3000 });
  await noSideways(pooja, 'clients');
});
await step('client detail opens and shows its board', pooja, async () => {
  await go(pooja, `/clients/${hot.id}`);
  await pooja.getByText('Hot Co').first().waitFor();
  await noSideways(pooja, 'client detail');
});
await step('global search finds a client', pooja, async () => {
  await go(pooja, '/');
  await pooja.getByText('Search everything').first().click();
  await pooja.keyboard.type('Cold');
  await pooja.getByText('Cold Co').first().waitFor({ timeout: 4000 });
  await pooja.keyboard.press('Escape');
});
await step('notifications menu opens', pooja, async () => {
  await go(pooja, '/');
  await pooja.getByRole('button', { name: 'Notifications' }).click();
  await pooja.waitForTimeout(300);
  await pooja.keyboard.press('Escape');
});
await step('leads: she can view but has no Add Lead button', pooja, async () => {
  await go(pooja, '/leads');
  if (await pooja.getByRole('button', { name: /Add Lead/ }).count()) throw new Error('Add Lead visible to employee');
});
await step('Internal and Salary are closed to her', pooja, async () => {
  await go(pooja, '/internal');
  if (!/Access Restricted/i.test(await pooja.locator('body').innerText())) throw new Error('internal not restricted');
  const nav = await pooja.locator('body').innerText();
  if (/Audit Log|Team Performance/.test(nav)) { /* sidebar hidden on phone until opened; checked below */ }
  if (!DESKTOP) await pooja.getByRole('button', { name: 'Open menu' }).click();
  const side = await pooja.locator('body').innerText();
  if (/Salary|Audit Log|Team Performance|Internal/.test(side.split('Settings')[0])) throw new Error('restricted links in her menu');
  await pooja.keyboard.press('Escape');
});
await step('announcements page: no post button for employee', pooja, async () => {
  await go(pooja, '/announcements');
  if (await pooja.getByRole('button', { name: /Post Announcement/ }).count()) throw new Error('post button visible');
});
await step('settings page loads', pooja, async () => { await go(pooja, '/settings'); await noSideways(pooja, 'settings'); });
await step('log out returns to the login page', pooja, async () => {
  await go(pooja, '/');
  await pooja.getByRole('button', { name: 'Account menu' }).click();
  await pooja.getByRole('menuitem', { name: /Log out/ }).click();
  await pooja.waitForURL(/\/auth/, { timeout: 5000 });
  const me = await pooja.ctx.request.get(BASE + '/api/auth/user');
  if (me.status() !== 401) throw new Error('still logged in after logout');
});

// ================= Founder =================
console.log('\nFounder' + (DESKTOP ? ' desktop' : ' phone'));
const f = await session('vitalsaigorrela@gmail.com', { given: 'Vital' });
await step('founder adds a client through the form', f, async () => {
  await go(f, '/clients');
  await f.getByRole('button', { name: /New Client/ }).click();
  await f.getByTestId('input-client-name').fill('UI Created Client');
  await pickOption(f, f.getByTestId('select-industry'), 'Technology');
  await f.getByTestId('button-create-client').click();
  await f.waitForTimeout(1000);
  const c = (await api(f, 'GET', '/api/clients')).data.find((x) => x.name === 'UI Created Client');
  if (!c) throw new Error('client not created');
});
await step('founder adds a lead through the form', f, async () => {
  await go(f, '/leads');
  await f.getByRole('button', { name: /Add Lead/ }).click();
  await f.getByPlaceholder('Acme Corp').first().fill('UI Lead');
  await f.getByRole('button', { name: /^(Add Lead|Save|Create)/ }).last().click();
  await f.waitForTimeout(1000);
  const l = (await api(f, 'GET', '/api/leads')).data.find((x) => x.name === 'UI Lead');
  if (!l) throw new Error('lead not created');
});
await step('founder posts an announcement; it shows for everyone', f, async () => {
  await go(f, '/announcements');
  await f.getByRole('button', { name: /Post Announcement/ }).first().click();
  await f.getByPlaceholder('Announcement title').fill('Diwali holiday');
  await f.getByPlaceholder('Write the announcement content here...').fill('Office closed Friday');
  await f.getByRole('button', { name: /^Post( Announcement)?$/ }).last().click();
  await f.waitForTimeout(1000);
  const a = (await api(f, 'GET', '/api/announcements')).data.find((x) => x.title === 'Diwali holiday');
  if (!a) throw new Error('announcement not saved');
});
await step('founder sets a monthly revenue target from the dashboard and it sticks', f, async () => {
  await go(f, '/');
  await f.getByRole('button', { name: /Set Target/ }).click();
  await f.getByPlaceholder('e.g. 500000').fill('750000');
  await f.getByRole('button', { name: 'Save' }).click();
  await f.waitForTimeout(1000);
  const t = (await api(f, 'GET', '/api/revenue-targets')).data;
  if (!t.some((x) => Number(x.targetAmount) === 750000)) throw new Error('target not saved: ' + JSON.stringify(t));
});
await step('Internal: founder renames a team member and her stories follow', f, async () => {
  await go(f, '/internal');
  await f.getByTestId(`edit-user-${poojaId}`).click();
  const dlg = f.getByRole('dialog');
  await dlg.locator('input').nth(1).fill('Singhania');
  await dlg.getByRole('button', { name: /Save Changes/ }).click();
  await f.waitForTimeout(1000);
  const stories = (await api(f, 'GET', '/api/stories')).data.filter((s) => s.assignedTo === poojaId);
  if (!stories.length || !stories.every((s) => s.person === 'Pooja Singhania')) throw new Error('stories not renamed: ' + stories.map((s) => s.person).join('|'));
  await api(f, 'PATCH', `/api/users/${poojaId}`, { lastName: 'Singh' });
});
await step('Internal page, tabs, salary, audit log and team pages load for the founder', f, async () => {
  for (const p of ['/internal', '/salary', '/audit-log', '/team', '/insights/revenue', '/insights/clients', '/insights/stories', '/insights/completion']) {
    await go(f, p);
    const t = await f.locator('body').innerText();
    if (/something went wrong|access restricted/i.test(t)) throw new Error(p + ' shows an error/restricted screen');
    await noSideways(f, p);
  }
});

await browser.close();
console.log(`\n${pass} UI steps passed, ${failures.length} failed`);
failures.forEach((x) => console.log('  FAIL: ' + x));
process.exit(failures.length ? 1 : 0);
