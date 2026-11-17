// Viewing and downloading files posted in a story. Made-up data only: serves the built client and answers /api with
// fixtures (no server, no database, no real people). Run (after npm run build): node e2e/attachments.test.mjs <outdir>
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] || '.';
const ROOT = path.resolve('dist/public');
const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(ROOT, 'index.html');
  res.setHeader('content-type', MIME[path.extname(p)] || 'application/octet-stream');
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const BASE = `http://localhost:${server.address().port}`;
let pass = 0; const fail = [];
const ok = (c, n, x = '') => { if (c) pass++; else fail.push(n + (x ? '  -> ' + x : '')); };

const iso = (d) => new Date(Date.now() + d * 86400000).toISOString();
const me = { id: 'u1', firstName: 'Test', lastName: 'Person', email: 'test@example.com', userType: 'employee', role: 'editor', team: 'Sales' };
const client = { id: 'c1', name: 'Sample Co', industry: 'IT', stage: 'Hot', averageProgress: '0', expectedRevenue: '0', revenueTotal: '0', createdAt: iso(-5), updatedAt: iso(-1) };
const story = { id: 's1', clientId: 'c1', title: 'Shoot photos', description: 'Product photos', assignedTo: 'u1', person: 'Test Person', priority: 'Medium', estimatedEffortHours: 0, actualHoursSpent: '0', dueDate: iso(1), status: 'In Progress', progressPercent: 40, tags: [], createdAt: iso(-1), updatedAt: iso(-1) };
const cm = (id, body, name, type, file) => ({ id, storyId: 's1', authorId: 'u1', authorName: 'Test Person', body, isSystem: false, createdAt: iso(-1 + Number(id.slice(1)) * 0.01), attachmentName: name, attachmentType: type, attachmentData: `/api/files/attachments/${file}` });
const comments = [cm('c1', 'Front shot', 'front.png', 'image/png', '111-front.png'), cm('c2', 'Back shot', 'back.png', 'image/png', '222-back.png'), cm('c3', 'Quotation attached', 'quote.pdf', 'application/pdf', '333-quote.pdf')];
// A visible 40x30 orange PNG
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'); // 1x1 orange pixel
const requests = [];

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 1366, height: 800 } });
await ctx.route('**/api/**', (route) => {
  const url = new URL(route.request().url()); const p = url.pathname;
  if (p.startsWith('/api/files/')) { requests.push(p + url.search); return route.fulfill({ status: 200, contentType: p.endsWith('.pdf') ? 'application/pdf' : 'image/png', body: p.endsWith('.pdf') ? '%PDF-1.4' : png }); }
  if (p === '/api/events') return route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: 'retry: 600000\n\n' });
  const body = p === '/api/auth/user' ? me : p === '/api/users' ? [me] : p === '/api/clients' ? [client] : p === '/api/stories' ? [story] : p === '/api/stories/s1' ? story : p === '/api/stories/s1/comments' ? comments : p.startsWith('/api/notifications') ? { items: [], unread: 0 } : [];
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
const pg = await ctx.newPage();
await pg.goto(BASE + '/global-kanban'); await pg.waitForTimeout(2200);
await pg.getByText('Shoot photos').first().click(); await pg.waitForTimeout(1500);

const strip = pg.getByTestId('attachments-strip');
ok(await strip.isVisible() && /Attachments \(3\)/i.test(await strip.innerText()), 'story shows "Attachments (3)"', await strip.innerText().catch(() => ''));
const dl = await strip.getByTestId('file-download').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
ok(dl.length === 3 && dl.every((h) => h.endsWith('?download=1')), 'every file has a Download link that saves it', JSON.stringify(dl));
const pdfView = await strip.locator('a[data-testid="file-view"]').first().getAttribute('href');
ok(pdfView === '/api/files/attachments/333-quote.pdf', 'a PDF has a View link that opens it in the browser', pdfView);
await pg.screenshot({ path: `${out}/attach-story.png` });

await pg.getByTestId('comment-image').first().click(); await pg.waitForTimeout(800);
const viewer = pg.getByTestId('image-viewer');
ok(await viewer.isVisible(), 'clicking an image opens the full-screen viewer');
ok(/front\.png/.test(await viewer.innerText()) && /1 of 2/.test(await viewer.innerText()), 'viewer shows the image name and "1 of 2"', await viewer.innerText());
ok((await pg.getByTestId('viewer-download').getAttribute('href')) === '/api/files/attachments/111-front.png?download=1', 'viewer has Download');
await pg.screenshot({ path: `${out}/attach-viewer.png` });
await pg.getByTestId('viewer-next').click(); await pg.waitForTimeout(400);
ok(/back\.png/.test(await viewer.innerText()) && /2 of 2/.test(await viewer.innerText()), 'arrow goes to the next image in the story');
await pg.keyboard.press('ArrowLeft'); await pg.waitForTimeout(300);
ok(/1 of 2/.test(await viewer.innerText()), 'keyboard arrows work too');
await pg.keyboard.press('Escape'); await pg.waitForTimeout(400);
ok(!(await viewer.isVisible().catch(() => false)), 'Escape closes the viewer');
ok(await pg.getByTestId('comment-file').getByTestId('file-download').isVisible(), 'a file in a comment has Download');

console.log(`\n${pass} passed, ${fail.length} failed`); for (const f of fail) console.log('FAIL', f);
await b.close(); server.close();
process.exit(fail.length ? 1 : 0);
