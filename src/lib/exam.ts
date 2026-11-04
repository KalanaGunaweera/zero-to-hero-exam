import 'server-only';
import { serviceClient } from './supabase/service';
import { currentTokenHash } from './session';
import type { ExamState, ExamPaper } from './types';

const KNOWN = new Set([
  'DUPLICATE_MOBILE', 'INVALID_MOBILE', 'INVALID_DISTRICT', 'INVALID_INPUT', 'CONSENT_REQUIRED',
  'REGISTRATION_CLOSED', 'NO_ACTIVE_EXAM', 'INVALID_SESSION', 'RESUME_NOT_FOUND', 'RESUME_LOCKED', 'EXAM_NOT_OPEN',
  'NO_QUESTIONS', 'NOT_STARTED', 'NOT_IN_PROGRESS', 'DEADLINE_PASSED', 'INVALID_OPTION', 'INVALID_QUESTION',
]);

export class ExamError extends Error {
  constructor(public code: string, public status = 400) {
    super(code);
  }
}

/** Call one of the SECURITY DEFINER exam functions. Errors become ExamError codes. */
export async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await serviceClient().rpc(fn, args);
  if (error) {
    const code = (error.message || '').trim();
    if (KNOWN.has(code)) {
      throw new ExamError(code, code === 'INVALID_SESSION' ? 401 : code === 'DUPLICATE_MOBILE' ? 409 : 400);
    }
    console.error(`[rpc ${fn}]`, error);
    throw new ExamError('SERVER_ERROR', 500);
  }
  const obj = data as { error?: string } | null;
  if (obj && typeof obj === 'object' && typeof obj.error === 'string') {
    throw Object.assign(new ExamError(obj.error, 409), { payload: obj });
  }
  return data as T;
}

/** State for the current cookie's attempt; null if no / invalid session. Finalizes expired attempts. */
export async function getCurrentState(): Promise<ExamState | null> {
  const hash = currentTokenHash();
  if (!hash) return null;
  try {
    return await rpc<ExamState>('get_exam_state', { p_token_hash: hash });
  } catch (e) {
    if (e instanceof ExamError && e.code === 'INVALID_SESSION') return null;
    throw e;
  }
}

export async function getPaper(hash: string): Promise<ExamPaper> {
  return rpc<ExamPaper>('get_exam_paper', { p_token_hash: hash });
}

export const FINAL_STATUSES = ['submitted', 'auto_submitted', 'expired'] as const;

/** Which page a student with this status belongs on */
export function routeForStatus(status: string | undefined | null): string {
  switch (status) {
    case 'registered':
    case 'ready_to_start':
      return '/instructions';
    case 'in_progress':
      return '/exam';
    case 'submitted':
    case 'auto_submitted':
    case 'expired':
      return '/result';
    default:
      return '/';
  }
}
