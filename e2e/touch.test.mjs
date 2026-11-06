// Touch drag-and-drop on a phone-size screen (long-press, then drag) on the client board.
import { chromium } from 'playwright-core';
const BASE = 'http://localhost:5055';
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, extraHTTPHeaders: { 'x-forwarded-proto': 'https' } });
await ctx.request.post(BASE + '/api/test-login', { data: { email: 'vitalsaigorrela@gmail.com' } });
const api = (m, p, d) => ctx.request.fetch(BASE + p, { method: m, data: d, headers: { 'content-type': 'application/json' } }).then(async (r) => ({ status: r.status(), data: await r.json().catch(() => null) }));
const client = (await api('POST', '/api/clients', { name: 'Touch Co', industry: 'IT', stage: 'Hot' })).data;
const story = (await api('POST', '/api/stories', { clientId: client.id, title: 'Touch me', description: '', assignedTo: null, person: 'Unassigned', status: 'To Do', priority: 'Medium', estimatedEffortHours: 1, progressPercent: 0, dueDate: new Date(Date.now() + 86400000).toISOString(), tags: [] })).data;
const page = await ctx.newPage();
await page.goto(`${BASE}/clients/${client.id}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const cdp = await ctx.newCDPSession(page);
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
const card = await page.locator(`[data-rfd-draggable-id="${story.id}"]`).boundingBox();
const sx = card.x + card.width / 2, sy = card.y + card.height / 2;
await touch('touchStart', sx, sy);
await page.waitForTimeout(400); // long press
for (let i = 1; i <= 30; i++) { await touch('touchMove', sx + i * 11, sy + i * 1); await page.waitForTimeout(40); }
await page.waitForTimeout(900); // let the column auto-scroll under the finger
await touch('touchEnd');
await page.waitForTimeout(1200);
const s = (await api('GET', `/api/stories/${story.id}`)).data;
console.log('status after touch drag:', s.status);
await page.screenshot({ path: 'e2e/shots-ui/touch-drag.png' });
await browser.close();
process.exit(s.status === 'To Do' ? 1 : 0);
