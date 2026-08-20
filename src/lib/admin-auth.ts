export const ADMIN_COOKIE = 'oze_admin';
const COOKIE_MAX_AGE = 60 * 60 * 24;

function encoder() {
  return new TextEncoder();
}

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const raw = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  raw.forEach((byte) => {
    bin += String.fromCharCode(byte);
  });
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function fromB64url(value: string): Uint8Array {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '==='.slice((value.length + 3) % 4);
  const bin = atob(padded);
  return Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const sig = await crypto.subtle.sign('HMAC', key, encoder().encode(data));
  return b64url(sig);
}

export function adminEmails(env: Env): string[] {
  return (env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((item: string) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedAdmin(env: Env, email: string): boolean {
  return adminEmails(env).includes(email.trim().toLowerCase());
}

export async function hashCode(email: string, code: string): Promise<string> {
  const bytes = encoder().encode(`${email.toLowerCase()}:${code}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function randomCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const n = ((bytes[0]! << 16) | (bytes[1]! << 8) | bytes[2]!) % 1_000_000;
  return String(n).padStart(6, '0');
}

export async function mintSession(env: Env, email: string): Promise<string> {
  const secret = env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not set');
  const exp = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE;
  const payload = b64url(encoder().encode(JSON.stringify({ email: email.toLowerCase(), exp })));
  const sig = await hmac(secret, payload);
  return `${payload}.${sig}`;
}

export async function readSession(env: Env, cookieHeader: string | null): Promise<string | null> {
  const secret = env.ADMIN_SESSION_SECRET;
  if (!secret || !cookieHeader) return null;
  const match = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${ADMIN_COOKIE}=`));
  if (!match) return null;
  const token = match.slice(ADMIN_COOKIE.length + 1);
  const dot = token.indexOf('.');
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(secret, payload);
  if (sig.length !== expected.length) return null;
  let ok = 0;
  for (let i = 0; i < sig.length; i += 1) ok |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (ok !== 0) return null;
  try {
    const json = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as { email?: string; exp?: number };
    if (!json.email || !json.exp || json.exp * 1000 < Date.now()) return null;
    if (!isAllowedAdmin(env, json.email)) return null;
    return json.email;
  } catch {
    return null;
  }
}

export function sessionCookie(token: string, secure: boolean): string {
  return `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}${secure ? '; Secure' : ''}`;
}

export function clearCookie(secure: boolean): string {
  return `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
}
