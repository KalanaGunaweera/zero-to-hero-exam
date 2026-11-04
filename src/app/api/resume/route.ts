import { rpc } from '@/lib/exam';
import { fail, handleError, json, readJson, sameOrigin } from '@/lib/api';
import { normalizeMobile } from '@/lib/validation';
import { newSessionToken, setSessionCookie } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!sameOrigin()) return fail('FORBIDDEN', 403);
  const body = await readJson(req);
  const mobile = normalizeMobile(String(body?.mobile ?? ''));
  const regId = String(body?.registrationId ?? '').trim().toUpperCase();
  if (!mobile) return fail('INVALID_MOBILE', 422);
  if (!/^ZTH27-[A-Z2-9]{6}$/.test(regId)) return fail('RESUME_NOT_FOUND', 404);

  // Small fixed delay blunts guessing
  await new Promise((r) => setTimeout(r, 400));

  const { token, hash } = newSessionToken();
  try {
    await rpc('resume_session', { p_mobile: mobile, p_registration_id: regId, p_new_token_hash: hash });
    setSessionCookie(token);
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
