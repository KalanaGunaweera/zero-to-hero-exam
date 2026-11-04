import { rpc } from '@/lib/exam';
import { fail, handleError, json, readJson, sameOrigin } from '@/lib/api';
import { currentTokenHash } from '@/lib/session';
import { isUuid } from '@/lib/validation';

export const dynamic = 'force-dynamic';

type Saved = { question_id: string; option: number; seq: number; saved_at: string; remaining_ms: number };

export async function POST(req: Request) {
  if (!sameOrigin()) return fail('FORBIDDEN', 403);
  const hash = currentTokenHash();
  if (!hash) return fail('NO_SESSION', 401);

  const body = await readJson(req);
  const questionId = body?.questionId;
  const option = Number(body?.option);
  const seq = Number(body?.seq);
  if (!isUuid(questionId)) return fail('INVALID_QUESTION');
  if (!Number.isInteger(option) || option < 1 || option > 4) return fail('INVALID_OPTION');
  if (!Number.isSafeInteger(seq) || seq < 0) return fail('BAD_REQUEST');

  try {
    // Deadline, status and question ownership are all checked inside the DB function
    const saved = await rpc<Saved>('save_answer', {
      p_token_hash: hash,
      p_question_id: questionId,
      p_option: option,
      p_client_seq: seq,
    });
    return json({ ok: true, ...saved });
  } catch (e) {
    return handleError(e);
  }
}
