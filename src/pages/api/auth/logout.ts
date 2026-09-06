import type { APIRoute } from 'astro';
import { clearSessionCookie } from '../../../lib/server/auth';

export const POST: APIRoute = async ({ request }) => {
  return new Response(
    JSON.stringify({ ok: true }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': clearSessionCookie(request),
      },
    }
  );
};
