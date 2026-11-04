import { rpc } from '@/lib/exam';
import { fail, handleError, json, sameOrigin } from '@/lib/api';
import { currentTokenHash } from '@/lib/session';
import type { ExamState } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Manual submit, or the client's call when its countdown reaches zero.
// If the deadline has passed the server records an automatic submission
// at the deadline instead. Idempotent.
export async function POST() {
  if (!sameOrigin()) return fail('FORBIDDEN', 403);
  const hash = currentTokenHash();
  if (!hash) return fail('NO_SESSION', 401);
  try {
    const state = await rpc<ExamState>('submit_exam', { p_token_hash: hash });
    return json({ ok: true, state });
  } catch (e) {
    return handleError(e);
  }
}
