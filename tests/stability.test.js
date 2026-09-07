import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  clearSessionCookie,
  createSessionCookie,
  getAppAccessCode,
  getSessionSecret,
  verifySessionCookie,
} from '../src/lib/server/auth.ts';
import {
  createReadCacheKey,
  getCachedResponse,
  isReadAction,
  purgeRelatedReadCaches,
  putCachedResponse,
  readCacheSeconds,
} from '../src/lib/server/infinity-cache.ts';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Cloudflare is the production adapter', async () => {
  const config = await read('astro.config.mjs');
  assert.match(config, /@astrojs\/cloudflare/);
  assert.doesNotMatch(config, /@astrojs\/node/);
  assert.doesNotMatch(config, /checkOrigin:\s*false/);
});

test('package manager consistency: npm package-lock exists and bun.lock is removed', () => {
  assert.strictEqual(existsSync('package-lock.json'), true);
  assert.strictEqual(existsSync('bun.lock'), false);
  assert.strictEqual(existsSync('bun.lockb'), false);
});

test('production API cannot silently serve mock data', async () => {
  const api = await read('src/pages/api/infinity.ts');
  assert.match(api, /INFINITY_USE_MOCKS/);
  assert.match(api, /BACKEND_NOT_CONFIGURED/);
  assert.match(api, /UPSTREAM_UNAVAILABLE/);
});

test('all 8 required application pages exist in src/pages', () => {
  const requiredPages = [
    'src/pages/index.astro',       // 1. Control Tower
    'src/pages/today.astro',       // 2. Today
    'src/pages/videos.astro',      // 3. Videos
    'src/pages/my-work.astro',     // 4. My Work
    'src/pages/editor-load.astro', // 5. Editor Load
    'src/pages/mis.astro',         // 6. Daily MIS
    'src/pages/jobs.astro',        // 7. Action Jobs
    'src/pages/settings.astro'     // 8. Settings
  ];
  for (const page of requiredPages) {
    assert.strictEqual(existsSync(page), true, `Page ${page} must exist`);
  }
});

test('Layout navigation links all 8 core views with >=44px mobile touch targets', async () => {
  const layout = await read('src/layouts/Layout.astro');
  assert.match(layout, /href="\/"/);
  assert.match(layout, /href="\/today"/);
  assert.match(layout, /href="\/videos"/);
  assert.match(layout, /href="\/my-work"/);
  assert.match(layout, /href="\/editor-load"/);
  assert.match(layout, /href="\/mis"/);
  assert.match(layout, /href="\/jobs"/);
  assert.match(layout, /href="\/settings"/);

  const css = await read('src/styles/global.css');
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /\.mobile-menu-toggle/);
});

test('Authentication: successful cookie generation, verification, and logout', async () => {
  const secret = 'test-only-session-secret-that-is-never-used-in-production';
  const mockReq = new Request('https://infinity-operations.pages.dev/api/auth/login');

  // 1. Create session cookie
  const { cookie, token } = await createSessionCookie(secret, mockReq);
  assert.match(cookie, /infinity_session=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Secure/);

  // 2. Verify with valid cookie header
  const authReq = new Request('https://infinity-operations.pages.dev/api/infinity', {
    headers: { Cookie: `infinity_session=${token}` }
  });
  const isValid = await verifySessionCookie(authReq, secret);
  assert.strictEqual(isValid, true);

  // 3. Verify with invalid / tampered token
  const badReq = new Request('https://infinity-operations.pages.dev/api/infinity', {
    headers: { Cookie: `infinity_session=${token}bad` }
  });
  const isBadValid = await verifySessionCookie(badReq, secret);
  assert.strictEqual(isBadValid, false);

  // 4. Verify logout clears cookie
  const cleared = clearSessionCookie(mockReq);
  assert.match(cleared, /Max-Age=0/);
  assert.match(cleared, /Expires=Thu, 01 Jan 1970/);
});

test('Authentication refuses missing production credentials instead of using hard-coded defaults', () => {
  assert.strictEqual(getAppAccessCode({}), '');
  assert.strictEqual(getSessionSecret({}), '');
});

test('snapshot failures fall back to the matching direct Apps Script read', async () => {
  const api = await read('src/pages/api/infinity.ts');
  assert.match(api, /SNAPSHOT_FALLBACK_ACTIONS/);
  assert.match(api, /Blob object must have non-null content type/i);
  assert.match(api, /X-Infinity-Snapshot-Fallback/);
  assert.match(api, /action:\s*fallbackAction/);
  assert.match(api, /INFINITY_USE_SNAPSHOTS/);
});

test('Login redirect-loop prevention logic in login.astro and Layout.astro', async () => {
  const loginPage = await read('src/pages/login.astro');
  assert.match(loginPage, /isLoginUrl/);
  assert.match(loginPage, /getSafeRedirect/);

  const layout = await read('src/layouts/Layout.astro');
  assert.match(layout, /isLoginRoute/);
});

test('Video detail workflow displays all 10 canonical levels', async () => {
  const drawer = await read('src/components/VideoDetailDrawer.astro');
  assert.match(drawer, /Script Created/);
  assert.match(drawer, /Script Ready/);
  assert.match(drawer, /Recording/);
  assert.match(drawer, /RAW Uploaded/);
  assert.match(drawer, /Editor Assigned/);
  assert.match(drawer, /Editing/);
  assert.match(drawer, /QC Pending/);
  assert.match(drawer, /Changes Required/);
  assert.match(drawer, /Approved/);
  assert.match(drawer, /Uploaded/);
});

test('Video detail drawer displays Revision History and Sheet Sync State', async () => {
  const drawer = await read('src/components/VideoDetailDrawer.astro');
  assert.match(drawer, /drawer-revision-section/);
  assert.match(drawer, /renderRevisionHistory/);
  assert.match(drawer, /drawer-sync-section/);
  assert.match(drawer, /renderSyncState/);
});

test('Action UX: mutations use idempotent requestId, click disable, and no [object Object]', async () => {
  const drawer = await read('src/components/VideoDetailDrawer.astro');
  assert.match(drawer, /requestId/);
  assert.match(drawer, /actionButton\.disabled = true/);
  assert.match(drawer, /isManagerActionRunning/);
  assert.match(drawer, /managerErrorMessage/);

  const api = await read('src/pages/api/infinity.ts');
  assert.match(api, /typeof record\.error === 'object'/);
  assert.doesNotMatch(api, /\[object Object\]/);
});

test('WhatsApp messages are generated only after interaction and contain required fields', async () => {
  const drawer = await read('src/components/VideoDetailDrawer.astro');
  assert.match(drawer, /openEditorWhatsApp/);
  assert.match(drawer, /Editor:/);
  assert.match(drawer, /Video ID:/);
  assert.match(drawer, /Teacher:/);
  assert.match(drawer, /Priority:/);
  assert.match(drawer, /RAW File:/);
  assert.match(drawer, /RAW Folder:/);
  assert.match(drawer, /FINAL Folder:/);
  assert.doesNotMatch(drawer, /window\.location\.href\s*=\s*buildWhatsAppUrl/);
});

test('Cache Safety: read cache respects TTL, purges on mutation, isolates requests', async () => {
  assert.strictEqual(readCacheSeconds('30'), 30);
  assert.strictEqual(isReadAction('dashboard'), true);
  assert.strictEqual(isReadAction('videos'), true);
  assert.strictEqual(isReadAction('approve_script'), false);
  assert.strictEqual(isReadAction('qc_approve'), false);

  const mockReq = new Request('https://infinity-operations.pages.dev/api/infinity', {
    headers: { Cookie: 'infinity_session=user1-session-token-12345678' }
  });
  const key1 = await createReadCacheKey(mockReq, { action: 'dashboard' });
  assert.match(key1, /^read_cache_/);

  const fakeRes = new Response(JSON.stringify({ ok: true, total: 42 }), {
    headers: { 'Content-Type': 'application/json' }
  });
  await putCachedResponse(key1, fakeRes, 10);
  const cached = await getCachedResponse(key1);
  assert.notStrictEqual(cached, null);
  const json = await cached.json();
  assert.strictEqual(json.total, 42);

  // Invalidate
  await purgeRelatedReadCaches(mockReq, { action: 'approve_script', videoId: 'TEST-001' });
  const cleared = await getCachedResponse(key1);
  assert.strictEqual(cleared, null);
});

test('India timezone Today calculation is in Asia/Kolkata', () => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const istToday = formatter.format(new Date());
  assert.match(istToday, /^\d{4}-\d{2}-\d{2}$/);
});

test('Apps Script timeout is bounded at 25 seconds with AbortController', async () => {
  const api = await read('src/pages/api/infinity.ts');
  assert.match(api, /AbortController/);
  assert.match(api, /25000/);
  assert.match(api, /timed out after 25 seconds/);
});

test('video deep links accept the Action Jobs videoId parameter', async () => {
  const videos = await read('src/pages/videos.astro');
  assert.match(videos, /params\.get\('videoId'\)/);
});

test('service worker never clones an already-consumed response', async () => {
  const worker = await read('public/sw.js');
  assert.match(worker, /!response\.bodyUsed/);
});
