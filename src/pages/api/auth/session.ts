import type { APIRoute } from 'astro';
import { getSessionSecret, verifySessionCookie } from '../../../lib/server/auth';

export const GET: APIRoute = async ({ request }) => {
  const sessionSecret = getSessionSecret();
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
  const isValid = await verifySessionCookie(request, sessionSecret);

  return new Response(
    JSON.stringify({ authenticated: isValid }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
};
