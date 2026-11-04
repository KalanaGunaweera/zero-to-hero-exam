import 'server-only';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { ExamError } from './exam';

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function fail(code: string, status = 400, extra: Record<string, unknown> = {}) {
  return json({ ok: false, code, ...extra }, status);
}

/** Reject cross-site POSTs (cookie is SameSite=Lax; this is a second check). */
export function sameOrigin(): boolean {
  const h = headers();
  const origin = h.get('origin');
  if (!origin) return true; // same-origin fetches from older Safari may omit it
  const host = h.get('x-forwarded-host') ?? h.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const text = await req.text();
    if (text.length > 4096) return null;
    const v = JSON.parse(text);
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
}

export function handleError(e: unknown) {
  if (e instanceof ExamError) {
    const payload = (e as ExamError & { payload?: Record<string, unknown> }).payload ?? {};
    return fail(e.code, e.status, payload);
  }
  console.error(e);
  return fail('SERVER_ERROR', 500);
}
