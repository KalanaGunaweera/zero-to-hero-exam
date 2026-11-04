import { getPaper } from '@/lib/exam';
import { fail, handleError, json } from '@/lib/api';
import { currentTokenHash } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Questions (never the answer key) + this student's saved answers.
// Only returned while the attempt is in progress.
export async function GET() {
  const hash = currentTokenHash();
  if (!hash) return fail('NO_SESSION', 401);
  try {
    const paper = await getPaper(hash);
    return json({ ok: true, ...paper });
  } catch (e) {
    return handleError(e);
  }
}
