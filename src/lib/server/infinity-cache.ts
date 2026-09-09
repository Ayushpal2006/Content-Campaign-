const DEFAULT_READ_CACHE_SECONDS = 30;

const READ_ACTIONS = new Set([
  'activity_today',
  'channels',
  'mis_preview',
  'bootstrap',
  'dashboard',
  'videos',
  'video',
  'editor_load',
  'mis_config',
  'job_status',
  'web_jobs',
  'snapshot',
]);

const CACHE_KEY_IGNORED_FIELDS = new Set(['requestId', 'refresh', 'token']);

export function isReadAction(action: string): boolean {
  return READ_ACTIONS.has(action);
}

export function readCacheSeconds(rawValue?: string): number {
  const parsed = Number(rawValue || process.env.INFINITY_READ_CACHE_SECONDS || 30);
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
  _request: Request,
  payload: Record<string, unknown>
): Promise<string> {
  const fingerprint = await sha256(JSON.stringify(stableValue(payload)));
  return `read_cache_${fingerprint}`;
}

interface CacheItem {
  body: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheItem>();

export async function getCachedResponse(cacheKey: string): Promise<Response | null> {
  const item = memoryCache.get(cacheKey);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    memoryCache.delete(cacheKey);
    return null;
  }
  return new Response(item.body, {
    status: item.status,
    statusText: item.statusText,
    headers: item.headers,
  });
}

export async function putCachedResponse(
  cacheKey: string,
  response: Response,
  ttlSeconds: number
): Promise<void> {
  const text = await response.clone().text();
  const headers: Record<string, string> = {};
  response.headers.forEach((val, key) => {
    headers[key] = val;
  });
  memoryCache.set(cacheKey, {
    body: text,
    status: response.status,
    statusText: response.statusText,
    headers,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
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

export async function purgeRelatedReadCaches(
  request: Request,
  payload: Record<string, unknown>
): Promise<void> {
  const commonPayloads: Array<Record<string, unknown>> = [
    { action: 'bootstrap' },
    { action: 'dashboard' },
    { action: 'videos' },
    { action: 'editor_load' },
  ];

  const videoId = typeof payload.videoId === 'string' ? payload.videoId.trim() : '';
  if (videoId) commonPayloads.push({ action: 'video', videoId });

  for (const readPayload of commonPayloads) {
    const key = await createReadCacheKey(request, readPayload);
    memoryCache.delete(key);
  }
}
