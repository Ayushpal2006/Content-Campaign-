import type { APIRoute } from 'astro';
import { getAppAccessCode, getSessionSecret } from '../../lib/server/auth';
import { getRuntimeEnv, readRuntimeEnv } from '../../lib/server/runtime-env';

export const GET: APIRoute = async () => {
  const runtimeEnv = getRuntimeEnv();
  const getEnv = (key: string): string => readRuntimeEnv(runtimeEnv, key);

  const configured = {
    appsScriptUrl: Boolean(getEnv('APPS_SCRIPT_API_URL')),
    apiToken: Boolean(getEnv('INFINITY_API_TOKEN')),
    accessCode: Boolean(getAppAccessCode(runtimeEnv)),
    sessionSecret: Boolean(getSessionSecret(runtimeEnv)),
  };
  // This route can only verify edge configuration. It deliberately does not
  // claim that Apps Script is reachable without making a real upstream call.
  const healthy = Boolean(
    configured.appsScriptUrl &&
    configured.apiToken &&
    configured.accessCode &&
    configured.sessionSecret
  );

  return new Response(
    JSON.stringify({
      ok: healthy,
      service: 'Infinity Operations API',
      version: 'operations-v4',
      cacheSeconds: Number(getEnv('INFINITY_READ_CACHE_SECONDS') || 30),
      configured,
      connectivityVerified: false,
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
