/**
 * fix-pages-config.js
 *
 * Strips Workers-only fields from the Astro-generated dist/server/wrangler.json
 * so that `wrangler pages deploy` succeeds on Cloudflare Pages.
 *
 * The @astrojs/cloudflare adapter emits fields like "main", "rules", "assets",
 * "images", "previews", and "no_bundle" that are valid for Workers but rejected
 * by Pages validation in wrangler >= 4.98.0.
 *
 * This script runs automatically via the "postbuild" npm script.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const CFG_PATH = 'dist/server/wrangler.json';

if (!existsSync(CFG_PATH)) {
  console.log('[fix-pages-config] No generated wrangler.json found — skipping.');
  process.exit(0);
}

const WORKERS_ONLY_FIELDS = [
  'assets',
  'main',
  'rules',
  'images',
  'previews',
  'no_bundle',
];

try {
  const cfg = JSON.parse(readFileSync(CFG_PATH, 'utf8'));
  let removed = [];

  for (const field of WORKERS_ONLY_FIELDS) {
    if (field in cfg) {
      delete cfg[field];
      removed.push(field);
    }
  }

  if (removed.length > 0) {
    writeFileSync(CFG_PATH, JSON.stringify(cfg));
    console.log(`[fix-pages-config] Removed Workers-only fields: ${removed.join(', ')}`);
  } else {
    console.log('[fix-pages-config] No Workers-only fields found — nothing to do.');
  }
} catch (err) {
  console.error(`[fix-pages-config] Error: ${err.message}`);
  process.exit(1);
}
