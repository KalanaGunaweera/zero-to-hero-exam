'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Countdown anchored to the server.
 *
 * The server sends remaining_ms = deadline − server_now. We anchor that to
 * performance.now() (monotonic: unaffected by the device clock being wrong
 * or changed), subtracting half the round-trip. The browser only displays
 * the value; every write is still checked against the deadline in the DB.
 */
export function useServerClock(initialRemainingMs: number | null) {
  const deadlinePerf = useRef<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(initialRemainingMs);

  const sync = useCallback((serverRemainingMs: number | null | undefined, rttMs = 0) => {
    if (serverRemainingMs == null) return;
    const candidate = performance.now() + serverRemainingMs - rttMs / 2;
    // Prefer the earlier estimate when two syncs disagree slightly; never extend
    // by more than network jitter.
    if (deadlinePerf.current == null || candidate < deadlinePerf.current || candidate - deadlinePerf.current > 1500) {
      deadlinePerf.current = candidate;
    }
    setRemainingMs(Math.max(0, deadlinePerf.current - performance.now()));
  }, []);

  useEffect(() => {
    if (initialRemainingMs != null && deadlinePerf.current == null) sync(initialRemainingMs);
  }, [initialRemainingMs, sync]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (deadlinePerf.current == null) return;
      setRemainingMs(Math.max(0, deadlinePerf.current - performance.now()));
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  return { remainingMs, sync };
}

export function formatClock(ms: number | null): string {
  if (ms == null) return '--:--';
  // Always MM:SS (60:00 → 00:00); never shown as hours
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
