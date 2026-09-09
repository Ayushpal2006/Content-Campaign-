// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({imageService:'compile'}),
  // Authentication uses signed HttpOnly cookies, not Astro's KV sessions.
  session: false,
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
