import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Cloudflare is the production adapter', async () => {
  const config = await read('astro.config.mjs');
  assert.match(config, /@astrojs\/cloudflare/);
  assert.doesNotMatch(config, /@astrojs\/node/);
  assert.doesNotMatch(config, /checkOrigin:\s*false/);
});

test('production API cannot silently serve mock data', async () => {
  const api = await read('src/pages/api/infinity.ts');
  assert.match(api, /INFINITY_USE_MOCKS/);
  assert.match(api, /BACKEND_NOT_CONFIGURED/);
  assert.match(api, /UPSTREAM_UNAVAILABLE/);
});

test('video deep links accept the Action Jobs videoId parameter', async () => {
  const videos = await read('src/pages/videos.astro');
  assert.match(videos, /params\.get\('videoId'\)/);
});

test('service worker never clones an already-consumed response', async () => {
  const worker = await read('public/sw.js');
  assert.match(worker, /!response\.bodyUsed/);
});
