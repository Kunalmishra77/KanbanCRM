// More real-browser flows (desktop, founder): drag and drop, invoices, communications, delete, convert.
// Run: node e2e/ui2.test.mjs   (server on :5055, throwaway database, run e2e/seed.mjs first)
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = 'http://localhost:5055';
fs.mkdirSync('e2e/shots-ui', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
let pass = 0; const failures = [];

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, extraHTTPHeaders: { 'x-forwarded-proto': 'https' } });
await ctx.request.post(BASE + '/api/test-login', { data: { email: 'vitalsaigorrela@gmail.com' } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message.split('\n')[0]));
page.on('response', (r) => { if (r.url().startsWith(BASE + '/api') && r.status() >= 500) errors.push(`${r.status()} ${r.url().replace(BASE, '')}`); });
const api = (method, path, data) => ctx.request.fetch(BASE + path, { method, data, headers: { 'content-type': 'application/json' } }).then(async (r) => ({ status: r.status(), data: await r.json().catch(() => null) }));
const go = async (p) => { await page.goto(BASE + p, { waitUntil: 'networkidle' }); await page.waitForTimeout(300); };

async function step(name, fn) {
  const before = errors.length;
  try { await fn(); if (errors.length > before) throw new Error('server/page error: ' + errors.slice(before).join(' | ')); pass++; console.log('  ok   ' + name); }
  catch (e) { failures.push(`${name}: ${e.message.split('\n')[0]}`); console.log('  FAIL ' + name + ' -> ' + e.message.split('\n')[0]); await page.screenshot({ path: `e2e/shots-ui/FAIL2-${name.replace(/\W+/g, '_').slice(0, 40)}.png` }).catch(() => {}); }
}
async function drag(sourceSel, targetSel) {
  const s = await page.locator(sourceSel).first().boundingBox();
  const t = await page.locator(targetSel).first().boundingBox();
  await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
  await page.mouse.down();
  await page.mouse.move(s.x + s.width / 2 + 10, s.y + s.height / 2 + 10, { steps: 4 });
  await page.mouse.move(t.x + t.width / 2, t.y + 120, { steps: 25 });
  await page.waitForTimeout(250);
  await page.mouse.up();
  await page.waitForTimeout(900);
}

const users = (await api('GET', '/api/users')).data;
const poojaId = users.find((u) => u.email === 'razorbill2018@gmail.com').id;
const client = (await api('POST', '/api/clients', { name: 'Drag Co', industry: 'IT', stage: 'Hot', expectedRevenue: '50000', revenueTotal: '0' })).data;
const story = (await api('POST', '/api/stories', { clientId: client.id, title: 'Drag me', description: '', assignedTo: poojaId, person: 'Pooja Singh', status: 'To Do', priority: 'Medium', estimatedEffortHours: 1, progressPercent: 0, dueDate: new Date(Date.now() + 86400000).toISOString(), tags: [] })).data;

console.log('\nFounder desktop: boards, invoices, communications, delete');
await step('drag a story card to another column on the client board', async () => {
  await go(`/clients/${client.id}`);
  await drag(`[data-rfd-draggable-id="${story.id}"]`, '[data-rfd-droppable-id="In Progress"]');
  const s = (await api('GET', `/api/stories/${story.id}`)).data;
  if (s.status !== 'In Progress') throw new Error('status after drag = ' + s.status);
});
await step('the dragged card stays in the new column after reload (no snap-back)', async () => {
  await go(`/clients/${client.id}`);
  const inCol = await page.locator('[data-rfd-droppable-id="In Progress"]').locator(`[data-rfd-draggable-id="${story.id}"]`).count();
  if (!inCol) throw new Error('card not in In Progress after reload');
});
await step('add a story from the client page', async () => {
  await go(`/clients/${client.id}`);
  await page.getByTestId('button-add-story').click();
  await page.getByTestId('input-story-title').fill('Second story');
  await page.getByTestId('button-create-story').click();
  await page.waitForTimeout(900);
  const all = (await api('GET', '/api/stories?clientId=' + client.id)).data;
  if (!all.some((s) => s.title === 'Second story')) throw new Error('not created');
});
await step('add an invoice, mark it paid, then delete it', async () => {
  await go(`/clients/${client.id}`);
  await page.getByTestId('tab-invoices').click();
  await page.getByTestId('button-add-invoice').click();
  await page.getByTestId('input-invoice-label').fill('Invoice #1');
  await page.getByTestId('input-invoice-amount').fill('40000');
  await page.getByTestId('button-save-invoice').click();
  await page.waitForTimeout(1000);
  let inv = (await api('GET', `/api/clients/${client.id}/invoices`)).data;
  if (inv.length !== 1 || inv[0].label !== 'Invoice #1') throw new Error('invoice not saved: ' + JSON.stringify(inv));
  await page.getByTestId(`mark-paid-${inv[0].id}`).click();
  await page.waitForTimeout(900);
  inv = (await api('GET', `/api/clients/${client.id}/invoices`)).data;
  if (inv[0].status !== 'paid') throw new Error('status = ' + inv[0].status);
  const c = (await api('GET', `/api/clients/${client.id}`)).data;
  if (Number(c.revenueTotal) !== 40000) throw new Error('client revenue not recalculated: ' + c.revenueTotal);
  await page.getByTestId(`delete-invoice-${inv[0].id}`).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await page.waitForTimeout(900);
  if ((await api('GET', `/api/clients/${client.id}/invoices`)).data.length !== 0) throw new Error('invoice not deleted');
  const c2 = (await api('GET', `/api/clients/${client.id}`)).data;
  if (Number(c2.revenueTotal) !== 0) throw new Error('revenue not reset after delete: ' + c2.revenueTotal);
});
await step('log a communication, then delete it', async () => {
  await go(`/clients/${client.id}`);
  await page.getByTestId('tab-communications').click();
  await page.getByTestId('button-log-communication').click();
  await page.getByPlaceholder('What was discussed or noted?').fill('Spoke about renewal');
  await page.getByRole('dialog').getByRole('button', { name: /^(Log|Save|Add)/ }).last().click();
  await page.waitForTimeout(900);
  const c = (await api('GET', `/api/clients/${client.id}/communications`)).data;
  if (!c.some((x) => /renewal/.test(x.summary))) throw new Error('not saved');
  if (!c[0].loggedBy || /undefined|null/.test(c[0].loggedBy)) throw new Error('loggedBy = ' + c[0].loggedBy);
});
await step('timeline tab shows activity', async () => {
  await go(`/clients/${client.id}`);
  await page.getByTestId('tab-timeline').click();
  await page.waitForTimeout(600);
  if (/something went wrong/i.test(await page.locator('body').innerText())) throw new Error('crashed');
});
await step('lead board: drag a lead to another stage', async () => {
  const lead = (await api('POST', '/api/leads', { name: 'Drag Lead', stage: 'New', ownerId: users.find((u) => u.userType === 'founder').id, estimatedValue: '1000' })).data;
  await go('/leads');
  await page.getByRole('button', { name: /Board/ }).click();
  await page.waitForTimeout(500);
  await drag(`[data-rfd-draggable-id="${lead.id}"]`, '[data-rfd-droppable-id="Contacted"]');
  const l = (await api('GET', `/api/leads/${lead.id}`)).data;
  if (l.stage !== 'Contacted') throw new Error('lead stage after drag = ' + l.stage);
});
await step('delete a story from its modal', async () => {
  await go('/global-kanban');
  await page.getByRole('tab', { name: /In Progress/ }).click();
  await page.getByRole('button', { name: /View Details/ }).first().click();
  await page.getByRole('dialog').locator('button:has(svg.lucide-trash-2)').first().click();
  await page.getByRole('alertdialog').getByRole('button', { name: /Delete/ }).click();
  await page.waitForTimeout(1000);
  const left = (await api('GET', '/api/stories')).data.length;
  if (left !== 1) throw new Error('stories left = ' + left);
});
await step('convert a client back to a lead', async () => {
  await go(`/clients/${client.id}`);
  await page.getByTestId('button-convert-client').click();
  await page.getByTestId('button-confirm-convert-client').click();
  await page.waitForTimeout(1200);
  if ((await api('GET', `/api/clients/${client.id}`)).status !== 404) throw new Error('client still exists');
  if (!(await api('GET', '/api/leads')).data.some((l) => l.name === 'Drag Co')) throw new Error('lead not created from client');
});
await step('delete a client from the Clients list menu', async () => {
  const c = (await api('POST', '/api/clients', { name: 'Delete Me', industry: 'IT', stage: 'Hot' })).data;
  await go('/clients');
  await page.getByRole('button', { name: 'Actions for Delete Me' }).click();
  await page.getByRole('menuitem', { name: /Delete/ }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: /Delete/ }).click();
  await page.waitForTimeout(1000);
  if ((await api('GET', `/api/clients/${c.id}`)).status !== 404) throw new Error('client not deleted');
});

await browser.close();
console.log(`\n${pass} steps passed, ${failures.length} failed`);
failures.forEach((x) => console.log('  FAIL: ' + x));
process.exit(failures.length ? 1 : 0);
