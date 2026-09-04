const DEFAULT_READ_CACHE_SECONDS = 30;

const READ_ACTIONS = new Set([
  'bootstrap',
  'dashboard',
  'videos',
  'video',
  'editor_load',
  'mis_config',
  'job_status',
  'web_jobs',
]);

const CACHE_KEY_IGNORED_FIELDS = new Set(['requestId', 'refresh', 'token']);

export function isReadAction(action: string): boolean {
  return READ_ACTIONS.has(action);
}

export function readCacheSeconds(rawValue?: string): number {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return DEFAULT_READ_CACHE_SECONDS;
  return Math.max(0, Math.min(300, Math.floor(parsed)));
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;

  return Object.keys(value as Record<string, unknown>)
    .filter((key) => !CACHE_KEY_IGNORED_FIELDS.has(key))
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = stableValue((value as Record<string, unknown>)[key]);
      return result;
    }, {});
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function createReadCacheKey(
  request: Request,
  payload: Record<string, unknown>
): Promise<Request> {
  const url = new URL(request.url);
  const fingerprint = await sha256(JSON.stringify(stableValue(payload)));
  return new Request(`${url.origin}/__infinity_api_cache/${fingerprint}`, { method: 'GET' });
}

export function getDefaultCache(): Cache {
  return (caches as CacheStorage & { default: Cache }).default;
}

export function responseForBrowser(response: Response, cacheState: 'HIT' | 'MISS'): Response {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  headers.set('X-Infinity-Cache', cacheState);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function responseForEdgeCache(response: Response, ttlSeconds: number): Response {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', `public, max-age=0, s-maxage=${ttlSeconds}`);
  headers.delete('Set-Cookie');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function purgeRelatedReadCaches(
  request: Request,
  payload: Record<string, unknown>
): Promise<void> {
  const cache = getDefaultCache();
  const commonPayloads: Array<Record<string, unknown>> = [
    { action: 'bootstrap' },
    { action: 'dashboard' },
    { action: 'videos' },
    { action: 'editor_load' },
  ];

  const videoId = typeof payload.videoId === 'string' ? payload.videoId.trim() : '';
  if (videoId) commonPayloads.push({ action: 'video', videoId });

  await Promise.all(
    commonPayloads.map(async (readPayload) => {
      const key = await createReadCacheKey(request, readPayload);
      await cache.delete(key);
    })
  );
}
