import type { APIRoute } from 'astro';
import { getSessionSecret, verifySessionCookie } from '../../lib/server/auth';
import {
  createReadCacheKey,
  getCachedResponse,
  isReadAction,
  purgeRelatedReadCaches,
  putCachedResponse,
  readCacheSeconds,
  responseForBrowser,
} from '../../lib/server/infinity-cache';
import { handleMockAction } from '../../lib/server/mock-data';

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    if (error.name === 'AbortError') return 'Google Apps Script timed out after 25 seconds.';
    if (error.message.trim()) return error.message;
  }
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

function jsonError(message: string, status: number, code: string): Response {
  return new Response(JSON.stringify({ ok: false, error: { code, message } }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
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

export const POST: APIRoute = async ({ request }) => {
  const sessionSecret = getSessionSecret();
  if (!sessionSecret) {
    return new Response(
      JSON.stringify({ ok: false, error: 'SESSION_SECRET is not configured on server.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 1. Session verification
  const isAuthorized = await verifySessionCookie(request, sessionSecret);
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
    body = (await request.json()) as Record<string, unknown>;
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

  const cacheTtl = readCacheSeconds(process.env.INFINITY_READ_CACHE_SECONDS);
  const canUseReadCache = isReadAction(action) && body.refresh !== true && cacheTtl > 0;
  const cacheKey = canUseReadCache
    ? await createReadCacheKey(request, { ...body, action })
    : null;

  if (cacheKey) {
    const cached = await getCachedResponse(cacheKey);
    if (cached) return responseForBrowser(cached, 'HIT');
  }

  // 3. Upstream configuration check
  const apiUrl = process.env.APPS_SCRIPT_API_URL?.trim();
  const apiToken = process.env.INFINITY_API_TOKEN?.trim();

  // If upstream is configured, forward to Google Apps Script
  if (apiUrl && apiToken) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const upstreamPayload = {
        ...body,
        action,
        token: apiToken,
      };

      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 25000);

      const upstreamStartedAt = Date.now();
      let upstreamResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(upstreamPayload),
        redirect: 'follow',
        signal: controller.signal,
      });

      let responseText = await upstreamResponse.text();
      let data: unknown;

      try {
        data = JSON.parse(responseText);
      } catch {
        data = null;
      }

      clearTimeout(timeoutId);

      if (data && typeof data === 'object') {
        if (
          'error' in data &&
          data.error &&
          typeof data.error === 'object' &&
          'message' in data.error &&
          typeof data.error.message === 'string'
        ) {
          data = { ...data, error: data.error.message };
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
          await putCachedResponse(cacheKey, upstreamResult.clone(), cacheTtl);
        } else if (!isReadAction(action) && upstreamSucceeded) {
          await purgeRelatedReadCaches(request, { ...body, action });
        }

        return responseForBrowser(upstreamResult, 'MISS');
      }

      return jsonError('Google Apps Script returned a non-JSON response.', 502, 'UPSTREAM_INVALID_RESPONSE');
    } catch (error) {
      return jsonError(errorMessage(error, 'Could not reach Google Apps Script.'), 502, 'UPSTREAM_UNAVAILABLE');
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  // Mock data must be an explicit local-development choice. Never silently
  // report fake success when production configuration or Google is unavailable.
  if (process.env.INFINITY_USE_MOCKS !== 'true') {
    return jsonError(
      'Operations backend is not configured. Set APPS_SCRIPT_API_URL and INFINITY_API_TOKEN.',
      503,
      'BACKEND_NOT_CONFIGURED'
    );
  }

  const mockResult = handleMockAction(action, body);
  const mockResponse = new Response(JSON.stringify(mockResult), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });

  if (cacheKey) {
    await putCachedResponse(cacheKey, mockResponse.clone(), cacheTtl);
  } else if (!isReadAction(action)) {
    await purgeRelatedReadCaches(request, { ...body, action });
  }

  return responseForBrowser(mockResponse, 'MISS');
};
