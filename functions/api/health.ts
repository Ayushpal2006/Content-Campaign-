interface Env {
  APPS_SCRIPT_API_URL?: string;
  INFINITY_API_TOKEN?: string;
  APP_ACCESS_CODE?: string;
  SESSION_SECRET?: string;
  INFINITY_READ_CACHE_SECONDS?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const configured = {
    appsScriptUrl: Boolean(context.env.APPS_SCRIPT_API_URL?.trim()),
    apiToken: Boolean(context.env.INFINITY_API_TOKEN?.trim()),
    accessCode: Boolean(context.env.APP_ACCESS_CODE?.trim()),
    sessionSecret: Boolean(context.env.SESSION_SECRET?.trim()),
  };
  const healthy = Object.values(configured).every(Boolean);

  return new Response(
    JSON.stringify({
      ok: healthy,
      service: 'Infinity Operations Edge API',
      version: 'v1',
      cacheSeconds: Number(context.env.INFINITY_READ_CACHE_SECONDS || 30),
      configured,
      timestamp: new Date().toISOString(),
    }),
    {
      status: healthy ? 200 : 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    }
  );
};
