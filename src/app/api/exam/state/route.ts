import { rpc } from '@/lib/exam';
import { fail, handleError, json } from '@/lib/api';
import { currentTokenHash } from '@/lib/session';
import type { ExamState } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Light poll used to keep the countdown in sync with the server clock.
// Also finalizes the attempt if the deadline has passed.
export async function GET() {
  const hash = currentTokenHash();
  if (!hash) return fail('NO_SESSION', 401);
  try {
    const state = await rpc<ExamState>('get_exam_state', { p_token_hash: hash });
    return json({ ok: true, state });
  } catch (e) {
    return handleError(e);
  }
}
