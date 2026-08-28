import { verifySessionCookie } from '../../utils/auth';

interface Env {
  SESSION_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const sessionSecret = context.env.SESSION_SECRET || 'infinity-default-session-secret-change-me';
  const isValid = await verifySessionCookie(context.request, sessionSecret);

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
