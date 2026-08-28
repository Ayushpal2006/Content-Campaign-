import { verifySessionCookie } from '../utils/auth';

interface Env {
  APPS_SCRIPT_API_URL?: string;
  INFINITY_API_TOKEN?: string;
  SESSION_SECRET?: string;
}

const ALLOWED_ACTIONS = new Set([
  'bootstrap',
  'dashboard',
  'videos',
  'video',
  'editor_load',
  'detect_raw',
]);

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const sessionSecret = context.env.SESSION_SECRET || 'infinity-default-session-secret-change-me';

  // 1. Session verification
  const isAuthorized = await verifySessionCookie(context.request, sessionSecret);
  if (!isAuthorized) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Unauthorized session. Please log in.' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 2. Validate request payload
  let body: Record<string, unknown>;
  try {
    body = (await context.request.json()) as Record<string, unknown>;
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid JSON payload' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const action = typeof body.action === 'string' ? body.action.trim() : '';
  if (!action || !ALLOWED_ACTIONS.has(action)) {
    return new Response(
      JSON.stringify({ ok: false, error: `Unsupported or missing action: ${action || 'none'}` }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 3. Validate upstream configuration
  const apiUrl = context.env.APPS_SCRIPT_API_URL?.trim();
  const apiToken = context.env.INFINITY_API_TOKEN?.trim();

  if (!apiUrl || !apiToken) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Backend API is not fully configured. Missing APPS_SCRIPT_API_URL or INFINITY_API_TOKEN.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 4. Forward to Google Apps Script Web App
  try {
    const upstreamPayload = {
      ...body,
      action,
      token: apiToken,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const upstreamResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(upstreamPayload),
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await upstreamResponse.text();
    let data: unknown;

    try {
      data = JSON.parse(responseText);
    } catch {
      // If Apps Script returned HTML (e.g. error page or authorization challenge)
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Upstream returned an invalid response format.',
        }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify(data), {
      status: upstreamResponse.status >= 200 && upstreamResponse.status < 300 ? 200 : upstreamResponse.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: unknown) {
    const isAbort = err instanceof Error && (err.name === 'AbortError' || err.message?.includes('aborted'));
    return new Response(
      JSON.stringify({
        ok: false,
        error: isAbort ? 'Request to backend timed out (25s limit).' : 'Failed to reach operations backend.',
      }),
      {
        status: isAbort ? 504 : 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
