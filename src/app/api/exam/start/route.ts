import { rpc } from '@/lib/exam';
import { fail, handleError, json, sameOrigin } from '@/lib/api';
import { currentTokenHash } from '@/lib/session';
import type { ExamState } from '@/lib/types';

export const dynamic = 'force-dynamic';

// One-time, server-side start. Calling it again returns the existing
// attempt with its original deadline.
export async function POST() {
  if (!sameOrigin()) return fail('FORBIDDEN', 403);
  const hash = currentTokenHash();
  if (!hash) return fail('NO_SESSION', 401);
  try {
    const state = await rpc<ExamState>('start_exam', { p_token_hash: hash });
    return json({ ok: true, state });
  } catch (e) {
    return handleError(e);
  }
}
