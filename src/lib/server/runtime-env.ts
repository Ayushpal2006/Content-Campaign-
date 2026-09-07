import { env as cloudflareEnv } from 'cloudflare:workers';

export type RuntimeEnv = Record<string, string | undefined>;

export function getRuntimeEnv(): RuntimeEnv {
  return cloudflareEnv as unknown as RuntimeEnv;
}

export function readRuntimeEnv(env: RuntimeEnv, key: string): string {
  return String(env[key] || process.env[key] || import.meta.env?.[key] || '').trim();
}
