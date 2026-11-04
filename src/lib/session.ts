import 'server-only';
import { cookies } from 'next/headers';
import { createHash, randomBytes } from 'node:crypto';

export const SESSION_COOKIE = 'zth_exam_session';

export function newSessionToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

/** httpOnly cookie: JavaScript on the page can never read the session. */
export function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 120, // 120 days
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}

/** sha256 of the session token from the cookie, or null */
export function currentTokenHash(): string | null {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token || token.length < 20 || token.length > 100) return null;
  return hashToken(token);
}
