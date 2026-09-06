import type { APIRoute } from 'astro';
import { getAppAccessCode, getSessionSecret } from '../../lib/server/auth';

export const GET: APIRoute = async () => {
  const configured = {
    appsScriptUrl: Boolean(process.env.APPS_SCRIPT_API_URL?.trim()),
    apiToken: Boolean(process.env.INFINITY_API_TOKEN?.trim()),
    accessCode: Boolean(getAppAccessCode()),
    sessionSecret: Boolean(getSessionSecret()),
  };
  const healthy = Boolean(configured.accessCode && configured.sessionSecret);

  return new Response(
    JSON.stringify({
      ok: healthy,
      service: 'Infinity Operations API',
      version: 'v1',
      cacheSeconds: Number(process.env.INFINITY_READ_CACHE_SECONDS || 30),
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
