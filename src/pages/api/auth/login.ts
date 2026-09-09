import type { APIRoute } from 'astro';
import { createSessionCookie, getAppAccessCode, getSessionSecret } from '../../../lib/server/auth';
import { getRuntimeEnv } from '../../../lib/server/runtime-env';
import { loginUser } from '../../../lib/server/user-login';

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
    const body = (await request.json().catch(() => ({}))) as { accessCode?: unknown; username?:unknown; password?:unknown };
    const accessCode = typeof body.accessCode === 'string' ? body.accessCode.trim() : '';

    const expectedCode = getAppAccessCode(runtimeEnv);
    const sessionSecret = getSessionSecret(runtimeEnv);
    const username=typeof body.username==='string' ? body.username.trim().toLowerCase() : '';
    if(username) {
      if(!sessionSecret) return Response.json({ok:false,error:'SESSION_SECRET is not configured.'},{status:503});
      const password=typeof body.password==='string'?body.password:'';
      if(!password || username.length>100 || password.length>256) return Response.json({ok:false,error:'Invalid login ID or password.'},{status:401});
      const identity=await loginUser(username,password,String(runtimeEnv.APPS_SCRIPT_API_URL || ''),String(runtimeEnv.INFINITY_API_TOKEN || ''));
      if(!identity) return Response.json({ok:false,error:'Invalid login ID or password.'},{status:401});
      const {cookie}=await createSessionCookie(sessionSecret,request,3600,identity);
      return Response.json({ok:true,identity},{headers:{'Set-Cookie':cookie,'Cache-Control':'no-store'}});
    }
    if(runtimeEnv.INFINITY_DISABLE_SHARED_LOGIN==='true') return Response.json({ok:false,error:'Use your individual login ID and password.'},{status:401});

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
