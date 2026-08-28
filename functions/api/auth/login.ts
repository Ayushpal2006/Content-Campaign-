import { createSessionCookie } from '../../utils/auth';

interface Env {
  APP_ACCESS_CODE?: string;
  SESSION_SECRET?: string;
}

// In-memory rate limiting map (per worker isolate)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(clientIp);

  if (!record || now > record.resetAt) {
    loginAttempts.set(clientIp, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (record.count >= 10) {
    return false;
  }

  record.count += 1;
  return true;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const clientIp = context.request.headers.get('CF-Connecting-IP') || 'unknown';

  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Too many login attempts. Please wait a minute.' }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const body = (await context.request.json().catch(() => ({}))) as { accessCode?: unknown };
    const accessCode = typeof body.accessCode === 'string' ? body.accessCode.trim() : '';

    const expectedCode = context.env.APP_ACCESS_CODE?.trim();
    const sessionSecret = context.env.SESSION_SECRET || 'infinity-default-session-secret-change-me';

    if (!expectedCode) {
      return new Response(
        JSON.stringify({ ok: false, error: 'APP_ACCESS_CODE is not configured on server' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!accessCode || accessCode !== expectedCode) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid access code' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Access code is valid -> create signed session cookie
    const { cookie } = await createSessionCookie(sessionSecret);

    return new Response(
      JSON.stringify({ ok: true }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookie,
        },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'Authentication failed' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
