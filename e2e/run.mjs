// Usage: node e2e/run.mjs as=employee|founder   (needs `npm run build` first)
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import * as F from './fixtures.mjs';

const ROOT = path.resolve('dist/public');
const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(ROOT, 'index.html');
  res.setHeader('content-type', MIME[path.extname(p)] || 'application/octet-stream');
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const BASE = `http://localhost:${server.address().port}`;

const AS = (process.argv.find((a) => a.startsWith('as=')) || 'as=employee').slice(3);
const me = AS === 'founder' ? F.users[0] : F.users[1];

const VIEWPORTS = [
  { name: 'phone-small', width: 360, height: 640 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1366, height: 768 },
];
const PAGES = ['/', '/global-kanban', '/clients', '/clients/c1', '/leads', '/announcements', '/salary', '/internal', '/audit-log', '/team', '/settings', '/insights/revenue', '/insights/clients', '/insights/stories', '/insights/completion'];

function api(url, method) {
  const p = new URL(url).pathname;
  if (method !== 'GET') return { ok: true };
  if (p === '/api/auth/user') return me;
  if (p === '/api/users') return F.users;
  if (p === '/api/clients') return F.clients;
  if (/^\/api\/clients\/c\d+\/./.test(p)) return [];
  if (p.startsWith('/api/clients/c')) return F.clients.find((c) => p.endsWith(c.id)) || F.clients[0];
  if (p === '/api/stories') return F.stories;
  if (p === '/api/leads') return F.leads;
  if (p === '/api/announcements') return F.announcements;
  if (p === '/api/activity') return F.activity;
  if (p === '/api/salary-records') return F.salary;
  if (p === '/api/analytics/team') return F.users.map((x) => ({ user: x, totalAssigned: 3, completed: 1, overdue: 1, totalEstimatedHours: 6 }));
  return [];
}

const results = [];
const fail = (page, vp, msg) => results.push({ page, vp, msg });

const browser = await chromium.launch({ channel: 'chrome' });

async function open(vp, route, errors) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.width < 800, isMobile: vp.width < 800 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.split('\n')[0]));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|favicon|fonts\.g/.test(m.text())) errors.push('console: ' + m.text().split('\n')[0]); });
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(api(r.request().url(), r.request().method())) }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto(BASE + route, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  return { ctx, page };
}

const overflow = (page) => page.evaluate(() => {
  const out = [];
  const vw = window.innerWidth;
  if (document.documentElement.scrollWidth > vw + 1) out.push(`page scrolls sideways (${document.documentElement.scrollWidth}>${vw})`);
  const main = document.querySelector('main');
  if (main && main.scrollWidth > main.clientWidth + 1) out.push(`main content wider than screen (${main.scrollWidth}>${main.clientWidth})`);
  // Anything sticking out of the visible area unless it sits inside a deliberate horizontal scroller
  // (the layout wrappers use overflow-hidden/auto, so only count real inner scrollers below <main>)
  const limit = main ? main.getBoundingClientRect().right : vw;
  for (const el of main ? main.querySelectorAll('*') : []) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || out.length >= 4) continue;
    if (r.right <= limit + 1) continue;
    let p = el.parentElement, scroller = false;
    while (p && p !== main) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowX)) { scroller = true; break; } p = p.parentElement; }
    const cs = getComputedStyle(el);
    if (!scroller && cs.position !== 'fixed' && cs.visibility !== 'hidden') out.push(`sticks out <${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 60)}"> right=${Math.round(r.right)} limit=${Math.round(limit)}`);
  }
  return out;
});

const smallTargets = (page) => page.evaluate(() => {
  const bad = [];
  for (const el of document.querySelectorAll('button, a[href], [role=tab], [role=button], input, select')) {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (r.width === 0 || cs.visibility === 'hidden' || el.disabled || el.closest('[aria-hidden=true]')) continue;
    if (r.height < 28 || r.width < 28) bad.push(`${el.tagName.toLowerCase()}[${(el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || '').trim().slice(0, 24)}] ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  return bad.slice(0, 6);
});

// 1. every page x every viewport
for (const vp of VIEWPORTS) {
  for (const route of PAGES) {
    const errors = [];
    const { ctx, page } = await open(vp, route, errors);
    const body = (await page.locator('body').innerText()).trim();
    if (body.length < 20) fail(route, vp.name, 'blank page');
    if (/something went wrong/i.test(body)) fail(route, vp.name, 'error boundary shown');
    for (const o of await overflow(page)) fail(route, vp.name, 'OVERFLOW ' + o);
    if (vp.width < 800) { const t = await smallTargets(page); if (t.length) fail(route, vp.name, 'small tap targets: ' + t.join('; ')); }
    for (const e of errors) fail(route, vp.name, e);
    if (vp.name === 'phone') await page.screenshot({ path: `e2e/shots/${AS}${route.replace(/\//g, '_') || '_home'}.png` });
    await ctx.close();
  }
}

// 2. click every button on every page at phone width; nothing may throw or break layout
const clickCrawl = [];
for (const route of PAGES) {
  const vp = VIEWPORTS[1];
  const errors = [];
  const { ctx, page } = await open(vp, route, errors);
  const sel = 'button:visible, [role=tab]:visible';
  const n = await page.locator(sel).count();
  for (let i = 0; i < Math.min(n, 40); i++) {
    const b = page.locator(sel).nth(i);
    const name = ((await b.getAttribute('aria-label')) || (await b.innerText().catch(() => '')) || '').trim().slice(0, 30) || `#${i}`;
    if (/log out|delete|remove|trash/i.test(name)) continue;
    try {
      await b.click({ timeout: 2000 });
      await page.waitForTimeout(250);
      const ov = await overflow(page);
      if (ov.length) fail(route, 'click:' + name, 'OVERFLOW after click ' + ov[0]);
      const dlg = page.locator('[role=dialog]:visible');
      if (await dlg.count()) {
        const box = await dlg.first().boundingBox();
        if (box && (box.x < -1 || box.x + box.width > vp.width + 1)) fail(route, 'click:' + name, 'dialog wider than screen');
        if (box && box.height > vp.height + 1) fail(route, 'click:' + name, `dialog taller than screen (${Math.round(box.height)}>${vp.height})`);
      }
      clickCrawl.push(route + ' ' + name);
    } catch (e) { fail(route, 'click:' + name, 'click failed: ' + e.message.split('\n')[0]); }
    await page.keyboard.press('Escape');
    await page.goto(BASE + route, { waitUntil: 'load' });
    await page.waitForTimeout(250);
  }
  for (const e of errors) fail(route, 'clicks', e);
  await ctx.close();
}

// 3. behaviour: the assignment/dashboard bugs from the report
{
  const errors = [];
  const { ctx, page } = await open(VIEWPORTS[1], '/', errors);
  const my = page.locator('[data-testid=my-work]');
  const txt = await my.innerText().catch(() => '');
  const expect = (cond, msg) => { if (!cond) fail('/', 'behaviour', msg); };
  expect((await my.count()) === 1, 'My work section missing on dashboard');
  if (AS === 'employee') {
    const num = async (id) => Number((await page.locator(`[data-testid=${id}] p`).first().innerText()).trim());
    // Pooja: s1,s2,s3 -> 3 assigned, 2 open (both on the Hot client), 1 overdue, none of Ranveer's
    expect((await num('my-temp-Hot')) === 2, 'Hot count should be 2 for Pooja, got ' + (await num('my-temp-Hot')));
    expect((await num('my-temp-Warm')) === 0, 'Warm open count should be 0 for Pooja');
    expect((await num('my-temp-Cold')) === 0, "Cold must not include Ranveer's stories");
    expect(/3\s+Assigned to me/.test(txt.replace(/\n+/g, ' ')), 'Assigned-to-me total should be 3: ' + txt.replace(/\n+/g, ' ').slice(0, 90));
    expect(!/Story 4|Story 5|Story 6/.test(txt), "Ranveer's stories leaked into Pooja's dashboard");
  }
  for (const e of errors) fail('/', 'behaviour', e);
  await ctx.close();
}

await browser.close(); server.close();
const grouped = {};
for (const r of results) (grouped[`${r.page} @ ${r.vp}`] ||= []).push(r.msg);
console.log(`\nButtons clicked at phone width: ${clickCrawl.length}`);
console.log(`Findings: ${results.length}`);
for (const [k, v] of Object.entries(grouped)) { console.log('\n' + k); [...new Set(v)].forEach((m) => console.log('   - ' + m)); }
fs.writeFileSync(`e2e/report-${AS}.json`, JSON.stringify(results, null, 1));
