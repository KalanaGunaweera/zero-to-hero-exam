'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SavedAnswers } from '@/lib/types';

export type SaveState = 'saving' | 'saved' | 'retrying';

type Entry = { option: number; seq: number; inFlight: boolean; tries: number; timer?: number };

type Callbacks = {
  onRemaining: (ms: number, rtt: number) => void;
  onClosed: (code: string) => void; // deadline passed / already submitted
  onSessionLost: () => void;
};

const REQUEST_TIMEOUT = 10_000;
const MAX_BACKOFF = 15_000;

/**
 * Auto-save engine.
 *  - Every selection gets a strictly increasing sequence number. The DB only
 *    accepts a write whose seq is ≥ the stored one, so a slow retry of an
 *    older choice can never overwrite a newer choice.
 *  - Only one request per question is in flight; the newest choice is sent
 *    as soon as the previous request settles.
 *  - A question is shown as saved only after the server confirms it holds
 *    exactly the latest choice.
 *  - Network/5xx failures retry with backoff (and instantly on reconnect).
 *  - Unconfirmed choices are mirrored to localStorage and replayed after a
 *    refresh, but only while the server still accepts answers.
 */
export function useAnswerSaver(attemptId: string | null, initial: SavedAnswers, cb: Callbacks) {
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [confirmed, setConfirmed] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<Record<string, SaveState>>({});
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const entries = useRef(new Map<string, Entry>());
  const confirmedRef = useRef<Record<string, number>>({});
  const lastSeq = useRef(0);
  const closed = useRef(false);
  const cbRef = useRef(cb);
  cbRef.current = cb;
  const storageKey = attemptId ? `zth_pending_${attemptId}` : null;

  const persist = useCallback(() => {
    if (!storageKey) return;
    try {
      const obj: Record<string, { option: number; seq: number }> = {};
      entries.current.forEach((e, q) => (obj[q] = { option: e.option, seq: e.seq }));
      if (Object.keys(obj).length) localStorage.setItem(storageKey, JSON.stringify(obj));
      else localStorage.removeItem(storageKey);
    } catch {
      /* storage unavailable: saving still works, just no replay after refresh */
    }
  }, [storageKey]);

  const nextSeq = () => {
    lastSeq.current = Math.max(Date.now() * 1000, lastSeq.current + 1);
    return lastSeq.current;
  };

  const send = useCallback(
    async (qid: string) => {
      const e = entries.current.get(qid);
      if (!e || e.inFlight || closed.current) return;
      if (e.timer) window.clearTimeout(e.timer);
      e.inFlight = true;
      const { option, seq } = e;
      const t0 = performance.now();
      const ctrl = new AbortController();
      const killer = window.setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT);

      let res: Response | null = null;
      let data: Record<string, unknown> = {};
      try {
        res = await fetch('/api/exam/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId: qid, option, seq }),
          signal: ctrl.signal,
          cache: 'no-store',
        });
        data = await res.json().catch(() => ({}));
      } catch {
        res = null;
      } finally {
        window.clearTimeout(killer);
      }
      e.inFlight = false;
      const rtt = performance.now() - t0;

      // ---- confirmed by the server
      if (res?.ok && data.ok) {
        const dbOption = Number(data.option);
        const dbSeq = Number(data.seq);
        if (typeof data.remaining_ms === 'number') cbRef.current.onRemaining(data.remaining_ms, rtt);
        confirmedRef.current = { ...confirmedRef.current, [qid]: dbOption };
        setConfirmed(confirmedRef.current);
        const current = entries.current.get(qid);
        if (current && current.seq > dbSeq) {
          send(qid); // a newer choice was made while this one was in flight
          return;
        }
        if (current && dbSeq > current.seq) {
          // Another tab saved something newer: show what the database holds
          setSelected((s) => ({ ...s, [qid]: dbOption }));
        }
        entries.current.delete(qid);
        persist();
        setStatus((s) => ({ ...s, [qid]: 'saved' }));
        setLastSavedAt(Date.now());
        return;
      }

      // ---- the exam is over: stop everything
      const code = typeof data.code === 'string' ? data.code : '';
      if (res && (code === 'DEADLINE_PASSED' || code === 'NOT_IN_PROGRESS')) {
        closed.current = true;
        cbRef.current.onClosed(code);
        return;
      }
      if (res && (res.status === 401 || code === 'INVALID_SESSION' || code === 'NO_SESSION')) {
        closed.current = true;
        cbRef.current.onSessionLost();
        return;
      }
      if (res && res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
        // Validation error: this choice can never be saved. Drop it and show
        // what the database actually holds.
        entries.current.delete(qid);
        persist();
        const held = confirmedRef.current[qid];
        setSelected((s) => {
          const n = { ...s };
          if (held) n[qid] = held;
          else delete n[qid];
          return n;
        });
        setStatus((s) => {
          const n = { ...s };
          if (held) n[qid] = 'saved';
          else delete n[qid];
          return n;
        });
        return;
      }

      // ---- network / server error: retry with backoff
      e.tries += 1;
      setStatus((s) => ({ ...s, [qid]: 'retrying' }));
      const delay = Math.min(MAX_BACKOFF, 1000 * 2 ** (e.tries - 1)) + Math.random() * 400;
      e.timer = window.setTimeout(() => send(qid), delay);
    },
    [persist],
  );

  /** Student picks an option */
  const choose = useCallback(
    (qid: string, option: number) => {
      if (closed.current) return;
      setSelected((s) => ({ ...s, [qid]: option }));
      setStatus((s) => ({ ...s, [qid]: 'saving' }));
      const prev = entries.current.get(qid);
      const entry: Entry = { option, seq: nextSeq(), inFlight: prev?.inFlight ?? false, tries: 0, timer: prev?.timer };
      entries.current.set(qid, entry);
      persist();
      if (!entry.inFlight) send(qid);
    },
    [persist, send],
  );

  /** Load server answers, then replay anything newer that never reached the server */
  const hydrate = useCallback(
    (server: SavedAnswers) => {
      const sel: Record<string, number> = {};
      const conf: Record<string, number> = {};
      const st: Record<string, SaveState> = {};
      for (const [q, a] of Object.entries(server)) {
        sel[q] = a.option;
        conf[q] = a.option;
        st[q] = 'saved';
        lastSeq.current = Math.max(lastSeq.current, a.seq);
      }
      let replay: Record<string, { option: number; seq: number }> = {};
      if (storageKey) {
        try {
          replay = JSON.parse(localStorage.getItem(storageKey) || '{}');
        } catch {}
      }
      for (const [q, p] of Object.entries(replay)) {
        if (typeof p?.option !== 'number' || typeof p?.seq !== 'number') continue;
        if (server[q] && server[q].seq >= p.seq) continue;
        sel[q] = p.option;
        st[q] = 'saving';
        lastSeq.current = Math.max(lastSeq.current, p.seq);
        entries.current.set(q, { option: p.option, seq: p.seq, inFlight: false, tries: 0 });
      }
      setSelected(sel);
      confirmedRef.current = conf;
      setConfirmed(conf);
      setStatus(st);
      persist();
      entries.current.forEach((_, q) => send(q));
    },
    [persist, send, storageKey],
  );

  useEffect(() => {
    if (attemptId) hydrate(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  // Reconnected: retry everything now
  useEffect(() => {
    const retryAll = () =>
      entries.current.forEach((e, q) => {
        if (!e.inFlight) {
          e.tries = 0;
          send(q);
        }
      });
    window.addEventListener('online', retryAll);
    return () => window.removeEventListener('online', retryAll);
  }, [send]);

  // Warn before leaving with unsaved answers
  useEffect(() => {
    const warn = (ev: BeforeUnloadEvent) => {
      if (entries.current.size > 0 && !closed.current) {
        ev.preventDefault();
        ev.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const pendingCount = Object.values(status).filter((s) => s !== 'saved').length;
  const anyRetrying = Object.values(status).some((s) => s === 'retrying');

  /** Resolve when every choice is confirmed (or time runs out) */
  const flush = useCallback(async (timeoutMs = 8000) => {
    const start = Date.now();
    while (entries.current.size > 0 && Date.now() - start < timeoutMs && !closed.current) {
      entries.current.forEach((e, q) => {
        if (!e.inFlight) {
          e.tries = 0;
          send(q);
        }
      });
      await new Promise((r) => setTimeout(r, 300));
    }
    return entries.current.size === 0;
  }, [send]);

  const close = useCallback(() => {
    closed.current = true;
    entries.current.forEach((e) => e.timer && window.clearTimeout(e.timer));
  }, []);

  return { selected, confirmed, status, pendingCount, anyRetrying, lastSavedAt, choose, flush, close };
}
