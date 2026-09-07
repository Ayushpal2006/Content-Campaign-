import type { APIRoute } from 'astro';
import { getAppAccessCode, getSessionSecret } from '../../lib/server/auth';

export const GET: APIRoute = async (context) => {
  const { locals } = context;
  const runtimeEnv = ((locals as unknown as { runtime?: { env?: Record<string, string> } })?.runtime?.env) || {};
  const getEnv = (key: string): string => {
    return String(runtimeEnv[key] || process.env[key] || (import.meta as any).env?.[key] || '').trim();
  };

  const configured = {
    appsScriptUrl: Boolean(getEnv('APPS_SCRIPT_API_URL')),
    apiToken: Boolean(getEnv('INFINITY_API_TOKEN')),
    accessCode: Boolean(getAppAccessCode(runtimeEnv)),
    sessionSecret: Boolean(getSessionSecret(runtimeEnv)),
  };
  const healthy = Boolean(configured.accessCode && configured.sessionSecret);

  return new Response(
    JSON.stringify({
      ok: healthy,
      service: 'Infinity Operations API',
      version: 'v1',
      cacheSeconds: Number(getEnv('INFINITY_READ_CACHE_SECONDS') || 30),
      configured,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    }
  );
};
