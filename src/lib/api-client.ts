import type { ActionType, ApiResponse } from './types';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function isLoginPath(pathname: string): boolean {
  if (!pathname) return false;
  const clean = pathname.toLowerCase().replace(/\/+$/, '').split('?')[0] || '/';
  return clean === '/login';
}

/**
 * Checks session state with /api/auth/session
 */
export async function checkAuthSession(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { authenticated?: boolean };
    return Boolean(data.authenticated);
  } catch {
    return false;
  }
}

/**
 * Authenticates with access code via /api/auth/login
 */
export async function submitLogin(accessCode: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ accessCode }),
    });

    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };

    if (res.status === 429) {
      return { ok: false, error: 'Too many login attempts. Please wait 1 minute.' };
    }

    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || 'Invalid access code' };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: 'Network error. Please try again.' };
  }
}

/**
 * Logs out and clears the session cookie
 */
export async function submitLogout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
  } finally {
    if (!isLoginPath(window.location.pathname)) {
      window.location.replace('/login');
    }
  }
}

/**
 * Central typed dispatch function for Infinity API operations.
 * Automatically enforces AbortController timeout and handles 401 unauthenticated redirect.
 */
export async function fetchInfinityAction<T = unknown>(
  action: ActionType,
  payload: Record<string, unknown> = {},
  timeoutMs = 25000
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('/api/infinity', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        action,
        ...payload,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.status === 401) {
      // Unauthorized -> redirect to login if not already there
      const currentPath = window.location.pathname + window.location.search;
      if (!isLoginPath(window.location.pathname)) {
        window.location.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
      }
      throw new ApiError('Unauthorized session', 401);
    }

    const data = (await res.json().catch(() => ({}))) as ApiResponse<T>;

    if (!res.ok) {
      throw new ApiError(data.error || `Server returned error (${res.status})`, res.status);
    }

    return data;
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof ApiError) {
      throw err;
    }

    if (err instanceof Error && (err.name === 'AbortError' || err.message?.includes('aborted'))) {
      throw new ApiError('Request timed out. Please try again.', 504);
    }

    throw new ApiError(err instanceof Error ? err.message : 'Network request failed', 500);
  }
}
