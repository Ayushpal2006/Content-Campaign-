import type { APIRoute } from 'astro';
import { getRuntimeEnv, readRuntimeEnv } from '../../lib/server/runtime-env';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

export const POST: APIRoute = async ({ request }) => {
  const env = getRuntimeEnv();
  const read = (name: string) => readRuntimeEnv(env, name);
  const supabaseUrl = read('PUBLIC_SUPABASE_URL');
  const publishableKey = read('PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  const appsScriptUrl = read('APPS_SCRIPT_API_URL');
  const appsScriptToken = read('INFINITY_API_TOKEN');
  const authHeader = request.headers.get('authorization') || '';

  if (!supabaseUrl || !publishableKey || !appsScriptUrl || !appsScriptToken) {
    return json({ ok: false, error: 'Sheet sync is not configured on the server yet.' }, 503);
  }
  if (!authHeader.startsWith('Bearer ')) return json({ ok: false, error: 'Sign in again before syncing.' }, 401);

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: publishableKey, authorization: authHeader },
  });
  if (!userResponse.ok) return json({ ok: false, error: 'Your sign-in session has expired.' }, 401);
  const user = await userResponse.json() as { id?: string };
  if (!user.id) return json({ ok: false, error: 'Could not verify the signed-in user.' }, 401);

  const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role`, {
    headers: { apikey: publishableKey, authorization: authHeader },
  });
  const profiles = profileResponse.ok ? await profileResponse.json() as Array<{ role?: string }> : [];
  if (profiles[0]?.role !== 'manager') return json({ ok: false, error: 'Only managers can sync Sheet data.' }, 403);

  const upstream = await fetch(appsScriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ action: 'bootstrap', token: appsScriptToken, limit: 2000, requestId: crypto.randomUUID() }),
  });
  const payload = await upstream.json().catch(() => null) as { ok?: boolean; result?: { videos?: { items?: unknown[] } }; error?: { message?: string } } | null;
  if (!upstream.ok || !payload?.ok || !Array.isArray(payload.result?.videos?.items)) {
    return json({ ok: false, error: payload?.error?.message || 'Could not read the current Sheet data.' }, 502);
  }
  return json({ ok: true, videos: payload.result.videos.items });
};
