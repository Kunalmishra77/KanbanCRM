// Story window layout check with made-up data only: serves the built client and answers /api with fixtures
// (no server, no database, no real people). Run (after npm run build): node e2e/story-layout.test.mjs <outdir>
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

const iso = (d) => new Date(Date.now() + d * 86400000).toISOString();
const me = { id: 'u1', firstName: 'Test', lastName: 'Person', email: 'test@example.com', userType: 'employee', role: 'editor', team: 'Sales' };
const client = { id: 'c1', name: 'Sample Spa', ownerId: 'u1', industry: 'Spa', stage: 'Hot', averageProgress: '0', expectedRevenue: '0', revenueTotal: '0', createdAt: iso(-5), updatedAt: iso(-1) };
const desc = 'Sample GMB profile optimizations and many platform directories.\n' + ['Google Business Profile = Done', 'Bing Places = Done', 'Apple Business Connect = progress', 'Facebook Page = Done', 'Instagram Business = Done', 'LinkedIn Company Page = progress', 'Pinterest Business =', 'YouTube channel videos = Done', 'Justdial (free listing) = Done', 'Sulekha (free listing) =', 'Foursquare =', 'Yelp =', 'Cylex India =', 'Hotfrog India ='].join('\n');
const story = { id: 's1', clientId: 'c1', title: 'Sample GMB Profile', description: desc, assignedTo: 'u1', person: 'Test Person', priority: 'Medium', estimatedEffortHours: 0, actualHoursSpent: '0', dueDate: iso(1), status: 'In Progress', progressPercent: 35, tags: ['recurring', 'daily'], createdAt: iso(-1), updatedAt: iso(-1), recurringTaskId: null, occurrenceDate: null };
const comments = Array.from({ length: 6 }, (_, i) => ({ id: 'cm' + i, storyId: 's1', authorId: 'u1', authorName: 'Test Person', body: `Update ${i + 1}: listed on directory ${i + 1}, waiting for verification.`, isSystem: false, createdAt: iso(-1 + i * 0.01) }));
const api = (p) => {
  if (p === '/api/auth/user') return me;
  if (p === '/api/users') return [me];
  if (p === '/api/clients') return [client];
  if (p === '/api/stories') return [story];
  if (p === '/api/stories/s1') return story;
  if (p === '/api/stories/s1/comments') return comments;
  if (p.startsWith('/api/notifications')) return { items: [], unread: 0 };
  return [];
};

const b = await chromium.launch({ channel: 'chrome' });
for (const [name, w, h] of [['laptop', 1366, 768], ['phone', 390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  await ctx.route('**/api/**', (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p === '/api/events') return route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: 'retry: 600000\n\n' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(api(p)) });
  });
  const pg = await ctx.newPage();
  await pg.goto(BASE + '/global-kanban'); await pg.waitForTimeout(2500);
  await pg.getByText('Sample GMB Profile').first().click(); await pg.waitForTimeout(1500);
  const vis = async (loc) => { const bb = await loc.boundingBox(); return !!bb && bb.y >= 0 && bb.y + 20 <= h; };
  const first = pg.locator('[data-testid^="comment-"]').first();
  const box = pg.getByTestId('overview-comments').locator('textarea').first();
  const last = pg.locator('[data-testid^="comment-"]').last();
  console.log(name, `${w}x${h}`, '| a comment visible:', await vis(first) || await vis(last), '| newest comment visible:', await vis(last), '| comment box visible:', await vis(box), '| show-more:', await pg.getByTestId('description-toggle').isVisible().catch(() => false));
  await pg.screenshot({ path: `${out}/cview-${name}.png` });
  await ctx.close();
}
await b.close();
server.close();
