import type { APIRoute } from 'astro';
import { createSessionCookie, getAppAccessCode, getSessionSecret } from '../../../lib/server/auth';
import { getRuntimeEnv } from '../../../lib/server/runtime-env';

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(clientIp);

  if (!record || now > record.resetAt) {
    loginAttempts.set(clientIp, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (record.count >= 20) {
    return false;
  }

  record.count += 1;
  return true;
}

export const POST: APIRoute = async (context) => {
  const { request } = context;
  const runtimeEnv = getRuntimeEnv();
  const clientIp = request.headers.get('x-forwarded-for') || 'unknown';

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
    const body = (await request.json().catch(() => ({}))) as { accessCode?: unknown };
    const accessCode = typeof body.accessCode === 'string' ? body.accessCode.trim() : '';

    const expectedCode = getAppAccessCode(runtimeEnv);
    const sessionSecret = getSessionSecret(runtimeEnv);

    if (!expectedCode) {
      return new Response(
        JSON.stringify({ ok: false, error: 'APP_ACCESS_CODE is not configured on server' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!sessionSecret) {
      return new Response(
        JSON.stringify({ ok: false, error: 'SESSION_SECRET is not configured on server' }),
        {
          status: 503,
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
    const { cookie } = await createSessionCookie(sessionSecret, request);

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
