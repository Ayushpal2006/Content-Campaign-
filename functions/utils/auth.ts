// Helper for HMAC-SHA256 session signature & verification using Web Crypto API

interface SessionPayload {
  iat: number;
  exp: number;
  sid: string;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function signHmac(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return base64UrlEncode(new Uint8Array(signature));
}

function parseCookies(header: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  const pairs = header.split(';');
  for (const pair of pairs) {
    const [name, ...rest] = pair.trim().split('=');
    if (name) {
      cookies[name] = decodeURIComponent(rest.join('='));
    }
  }
  return cookies;
}

export async function createSessionCookie(secret: string, maxAgeSeconds = 7 * 24 * 3600): Promise<{ cookie: string; token: string }> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    iat: now,
    exp: now + maxAgeSeconds,
    sid: crypto.randomUUID(),
  };

  const payloadStr = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await signHmac(payloadStr, secret);
  const token = `${payloadStr}.${signature}`;
  const cookie = `infinity_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`;
  return { cookie, token };
}

export async function verifySessionCookie(request: Request, secret: string): Promise<boolean> {
  if (!secret) return false;
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return false;

  const cookies = parseCookies(cookieHeader);
  const token = cookies['infinity_session'];
  if (!token) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payloadStr, signature] = parts;
  try {
    const expectedSig = await signHmac(payloadStr, secret);
    if (signature !== expectedSig) return false;

    const payloadBytes = base64UrlDecode(payloadStr);
    const payload: SessionPayload = JSON.parse(new TextDecoder().decode(payloadBytes));

    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function clearSessionCookie(): string {
  return 'infinity_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
}
