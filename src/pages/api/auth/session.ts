import type { APIRoute } from 'astro';
import { getSessionSecret, readSessionIdentity } from '../../../lib/server/auth';
import { getRuntimeEnv } from '../../../lib/server/runtime-env';

export const GET: APIRoute = async (context) => {
  const { request } = context;
  const runtimeEnv = getRuntimeEnv();
  const sessionSecret = getSessionSecret(runtimeEnv);
  if (!sessionSecret) {
    return new Response(
      JSON.stringify({ authenticated: false, error: 'SESSION_SECRET is not configured on server' }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
  const identity = await readSessionIdentity(request, sessionSecret);

  return new Response(
    JSON.stringify({ authenticated: Boolean(identity), identity }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
};
