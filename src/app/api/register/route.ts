import { rpc } from '@/lib/exam';
import { fail, handleError, json, readJson, sameOrigin } from '@/lib/api';
import { validateRegistration } from '@/lib/validation';
import { newSessionToken, setSessionCookie } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!sameOrigin()) return fail('FORBIDDEN', 403);
  const body = await readJson(req);
  if (!body) return fail('BAD_REQUEST');

  // Honeypot: real people never fill this hidden field
  if (typeof body.website === 'string' && body.website.length > 0) return fail('BAD_REQUEST');

  const { data, errors } = validateRegistration(body);
  if (!data) return fail('VALIDATION', 422, { fields: errors });

  const { token, hash } = newSessionToken();
  try {
    const result = await rpc<{ registration_id: string; status: string }>('register_student', {
      p_full_name: data.fullName,
      p_mobile: data.mobile,
      p_school_name: data.schoolName,
      p_district: data.district,
      p_parent_name: data.parentName,
      p_consent: data.consent,
      p_token_hash: hash,
    });
    setSessionCookie(token);
    return json({ ok: true, registrationId: result.registration_id });
  } catch (e) {
    return handleError(e);
  }
}
