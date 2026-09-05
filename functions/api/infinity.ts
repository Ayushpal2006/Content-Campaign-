import { verifySessionCookie } from '../utils/auth';
import {
  createReadCacheKey,
  getDefaultCache,
  isReadAction,
  purgeRelatedReadCaches,
  readCacheSeconds,
  responseForBrowser,
  responseForEdgeCache,
} from '../utils/infinity-cache';

interface Env {
  APPS_SCRIPT_API_URL?: string;
  INFINITY_API_TOKEN?: string;
  SESSION_SECRET?: string;
  INFINITY_READ_CACHE_SECONDS?: string;
}

const ALLOWED_ACTIONS = new Set([
  'bootstrap',
  'dashboard',
  'videos',
  'video',
  'editor_load',
  'detect_raw',
  'create_video',
  'update_script',
  'approve_script',
  'assign_editor',
  'detect_final',
  'qc_approve',
  'qc_changes',
  'mark_uploaded',
  'mis_config',
  'save_mis_config',
  'send_mis_test',
  'setup_mis_trigger',
  'queue_action',
  'job_status',
  'web_jobs',
  'retry_job',
  'snapshot',
]);

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const sessionSecret = context.env.SESSION_SECRET?.trim();
  if (!sessionSecret) {
    return new Response(
      JSON.stringify({ ok: false, error: 'SESSION_SECRET is not configured on server.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

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

  const cacheTtl = readCacheSeconds(context.env.INFINITY_READ_CACHE_SECONDS);
  const canUseReadCache = isReadAction(action) && body.refresh !== true && cacheTtl > 0;
  const cacheKey = canUseReadCache
    ? await createReadCacheKey(context.request, { ...body, action })
    : null;

  if (cacheKey) {
    const cached = await getDefaultCache().match(cacheKey);
    if (cached) return responseForBrowser(cached, 'HIT');
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

    const upstreamStartedAt = Date.now();
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

    const upstreamResult = new Response(JSON.stringify(data), {
      status: upstreamResponse.status >= 200 && upstreamResponse.status < 300 ? 200 : upstreamResponse.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Server-Timing': `apps-script;dur=${Date.now() - upstreamStartedAt}`,
      },
    });

    const upstreamSucceeded =
      upstreamResult.status >= 200 &&
      upstreamResult.status < 300 &&
      !(data && typeof data === 'object' && 'ok' in data && data.ok === false);
    if (cacheKey && upstreamSucceeded) {
      const edgeResponse = responseForEdgeCache(upstreamResult.clone(), cacheTtl);
      context.waitUntil(getDefaultCache().put(cacheKey, edgeResponse));
    } else if (!isReadAction(action) && upstreamSucceeded) {
      context.waitUntil(purgeRelatedReadCaches(context.request, { ...body, action }));
    }

    return responseForBrowser(upstreamResult, 'MISS');
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
