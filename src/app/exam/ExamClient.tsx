'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ExamPaper, Question, SavedAnswers } from '@/lib/types';
import { errorMessage } from '@/lib/messages';
import { BRAND } from '@/lib/brand';
import { Logo } from '@/components/Brand';
import { Modal } from '@/components/Modal';
import { Spinner } from '@/components/Spinner';
import { MathText } from '@/components/MathText';
import { AnswerSheet } from './AnswerSheet';
import { formatClock, useServerClock } from './useServerClock';
import { useAnswerSaver } from './useAnswerSaver';

const RESYNC_MS = 30_000;
const WARN_AT = [5 * 60_000, 60_000];

type Phase = 'loading' | 'ready' | 'finishing' | 'error';

export function ExamClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [initialAnswers, setInitialAnswers] = useState<SavedAnswers>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [initialRemaining, setInitialRemaining] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const warned = useRef(new Set<number>());
  const finishing = useRef(false);

  const { remainingMs, sync } = useServerClock(initialRemaining);

  // ------------------------------------------------------------ finish
  const goToResult = useCallback(() => {
    router.replace('/result');
    router.refresh();
  }, [router]);

  /**
   * Countdown reached zero (or the server said the exam is closed).
   * Ask the server for state until it reports a final status. The server
   * finalizes using its own clock, so a fast device clock cannot end the
   * exam early and a slow one cannot extend it.
   */
  const finishByDeadline = useCallback(async () => {
    if (finishing.current) return;
    finishing.current = true;
    setPhase('finishing');
    for (let i = 0; i < 120; i++) {
      try {
        const res = await fetch('/api/exam/state', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        const st = data?.state;
        if (st && st.status !== 'in_progress') return goToResult();
        if (st?.status === 'in_progress' && st.remaining_ms > 0) {
          // device was ahead of the server: resume until the real deadline
          sync(st.remaining_ms);
          finishing.current = false;
          setPhase('ready');
          return;
        }
        if (res.status === 401) return router.replace('/');
      } catch {
        /* offline: keep trying */
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    goToResult();
  }, [goToResult, router, sync]);

  const saver = useAnswerSaver(attemptId, initialAnswers, {
    onRemaining: (ms, rtt) => sync(ms, rtt),
    onClosed: () => finishByDeadline(),
    onSessionLost: () => router.replace('/'),
  });

  // ------------------------------------------------------------ load paper
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (let attempt = 0; attempt < 5 && !cancelled; attempt++) {
        try {
          const t0 = performance.now();
          const res = await fetch('/api/exam/paper', { cache: 'no-store' });
          const data = (await res.json().catch(() => ({}))) as Partial<ExamPaper> & { ok?: boolean; code?: string };
          if (cancelled) return;
          if (res.status === 401) return router.replace('/');
          if (data.code === 'NOT_IN_PROGRESS') return goToResult();
          if (res.ok && data.ok && data.state && data.questions) {
            setQuestions(data.questions);
            setInitialAnswers(data.answers ?? {});
            setAttemptId(data.state.attempt_id);
            sync(data.state.remaining_ms, performance.now() - t0);
            setInitialRemaining(data.state.remaining_ms);
            try {
              const saved = Number(sessionStorage.getItem(`zth_q_${data.state.attempt_id}`));
              if (saved >= 0 && saved < data.questions.length) setIndex(saved);
            } catch {}
            setPhase('ready');
            return;
          }
        } catch {
          /* retry */
        }
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
      if (!cancelled) {
        setLoadError(errorMessage('NETWORK'));
        setPhase('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [goToResult, router, sync]);

  // ------------------------------------------------------------ resync clock
  const resync = useCallback(async () => {
    try {
      const t0 = performance.now();
      const res = await fetch('/api/exam/state', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) return router.replace('/');
      const st = data?.state;
      if (!st) return;
      if (st.status !== 'in_progress') return finishByDeadline();
      sync(st.remaining_ms, performance.now() - t0);
    } catch {
      /* offline – the countdown keeps running locally */
    }
  }, [finishByDeadline, router, sync]);

  useEffect(() => {
    if (phase !== 'ready') return;
    const id = window.setInterval(resync, RESYNC_MS);
    const onVisible = () => document.visibilityState === 'visible' && resync();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', resync);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', resync);
    };
  }, [phase, resync]);

  // ------------------------------------------------------------ connectivity
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  // ------------------------------------------------------------ deadline + warnings
  useEffect(() => {
    if (phase !== 'ready' || remainingMs == null) return;
    if (remainingMs <= 0) {
      saver.close();
      finishByDeadline();
      return;
    }
    for (const t of WARN_AT) {
      if (remainingMs <= t && !warned.current.has(t)) {
        warned.current.add(t);
        setWarning(t >= 60_000 && t < 120_000 ? 'මිනිත්තු 1ක් පමණක් ඉතිරිව ඇත!' : `මිනිත්තු ${t / 60_000}ක් පමණක් ඉතිරිව ඇත.`);
        window.setTimeout(() => setWarning(null), 8000);
      }
    }
  }, [remainingMs, phase, finishByDeadline, saver]);

  // ------------------------------------------------------------ navigation
  const go = useCallback(
    (i: number) => {
      const n = Math.max(0, Math.min(questions.length - 1, i));
      setIndex(n);
      try {
        if (attemptId) sessionStorage.setItem(`zth_q_${attemptId}`, String(n));
      } catch {}
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [questions.length, attemptId],
  );

  const q = questions[index];
  const locked = phase !== 'ready';

  // Keyboard: ← → to move, 1–4 to answer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (locked || submitOpen || sheetOpen || !q) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight') go(index + 1);
      else if (e.key === 'ArrowLeft') go(index - 1);
      else if (['1', '2', '3', '4'].includes(e.key)) saver.choose(q.id, Number(e.key));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [locked, submitOpen, sheetOpen, q, index, go, saver]);

  // ------------------------------------------------------------ submit
  const answeredCount = useMemo(
    () => questions.filter((x) => saver.confirmed[x.id] != null).length,
    [questions, saver.confirmed],
  );

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    const flushed = await saver.flush(10_000);
    if (!flushed) {
      setSubmitError('සමහර පිළිතුරු තවමත් සුරැකී නැත. අන්තර්ජාල සම්බන්ධතාවය පරීක්ෂා කර නැවත උත්සාහ කරන්න.');
      setSubmitting(false);
      return;
    }
    try {
      const res = await fetch('/api/exam/submit', { method: 'POST', cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        saver.close();
        finishing.current = true;
        return goToResult();
      }
      if (res.status === 401) return router.replace('/');
      setSubmitError(errorMessage(data.code));
    } catch {
      setSubmitError(errorMessage('NETWORK'));
    }
    setSubmitting(false);
  }

  // ------------------------------------------------------------ render
  if (phase === 'loading' || phase === 'error') {
    return (
      <div className="chalkboard grid min-h-dvh place-items-center px-6 text-center text-white">
        <div>
          <Logo size={56} />
          {phase === 'loading' ? (
            <p className="mt-4 flex items-center justify-center gap-2 text-white/80">
              <Spinner /> ප්‍රශ්න පත්‍රය පූරණය වෙමින්...
            </p>
          ) : (
            <>
              <p className="mt-4 text-white/90">{loadError}</p>
              <button onClick={() => window.location.reload()} className="mt-4 min-h-[48px] rounded-xl bg-gold px-6 font-bold text-board-deep">
                නැවත උත්සාහ කරන්න
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const low = remainingMs != null && remainingMs <= 5 * 60_000;
  const isLast = index === questions.length - 1;
  const chosen = q ? saver.selected[q.id] : undefined;
  const qStatus = q ? saver.status[q.id] : undefined;
  const unanswered = questions.length - answeredCount;

  const SaveIndicator = (
    <span className="flex items-center gap-1.5" aria-live="polite">
      {saver.anyRetrying || !online ? (
        <>
          <span className="h-2 w-2 rounded-full bg-danger" aria-hidden />
          <span className="text-[#ffb4ac]">{online ? 'සුරැකීම ප්‍රමාදයි – නැවත උත්සාහ කරමින්...' : 'සම්බන්ධතාවය නැත'}</span>
        </>
      ) : saver.pendingCount > 0 ? (
        <>
          <Spinner className="h-3.5 w-3.5 text-gold-light" />
          <span>පිළිතුරු සුරැකෙමින්...</span>
        </>
      ) : saver.lastSavedAt ? (
        <>
          <svg viewBox="0 0 20 20" className="h-4 w-4 text-gold-light" fill="currentColor" aria-hidden>
            <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0z" />
          </svg>
          <span>සුරකින ලදී</span>
        </>
      ) : (
        <span className="text-white/60">පිළිතුරක් තෝරන්න</span>
      )}
    </span>
  );

  return (
    <div className="graph-paper min-h-dvh pb-28 lg:pb-10">
      {/* ===== Top bar: timer is the one loud element ===== */}
      <header className="pt-safe sticky top-0 z-30 bg-ink text-white shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2 sm:px-5">
          <Logo size={34} />
          <div className="hidden min-w-0 leading-tight sm:block">
            <p className="truncate text-sm font-bold text-gold-light" lang="en">{BRAND.name}</p>
            <p className="truncate text-xs text-white/60">{BRAND.batchSi}</p>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3" role="timer" aria-label="ඉතිරි කාලය">
            <span className="text-xs text-white/60 xs:text-sm">ඉතිරි කාලය</span>
            <span
              className={`tabular rounded-lg px-2.5 py-0.5 text-[1.9rem] font-bold leading-none sm:text-4xl ${
                low ? 'bg-danger text-white' : 'text-gold'
              }`}
            >
              {formatClock(remainingMs)}
            </span>
          </div>
        </div>
        <div className="chalkboard border-t border-white/10">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-1.5 text-xs sm:px-5 sm:text-sm">
            {SaveIndicator}
            <span className="ml-auto tabular text-white/70">
              පිළිතුරු {answeredCount}/{questions.length}
            </span>
            <button
              type="button"
              onClick={() => setSubmitOpen(true)}
              disabled={locked}
              className="min-h-[34px] rounded-lg bg-gold px-3 text-xs font-bold text-board-deep sm:text-sm lg:hidden"
            >
              Submit
            </button>
          </div>
        </div>
      </header>

      {!online && (
        <div className="sticky top-[88px] z-20 bg-danger px-4 py-2 text-center text-sm text-white sm:top-[96px]" role="alert">
          අන්තර්ජාල සම්බන්ධතාවය බිඳී ඇත. කාලය නොනැවතී ගණනය වේ. නැවත සම්බන්ධ වූ විට පිළිතුරු ස්වයංක්‍රීයව සුරැකේ.
        </div>
      )}
      {warning && (
        <div className="animate-pop fixed inset-x-3 top-28 z-40 mx-auto max-w-md rounded-xl bg-danger px-4 py-3 text-center font-semibold text-white shadow-xl" role="alert">
          {warning}
        </div>
      )}

      <div className="mx-auto grid max-w-6xl gap-6 px-3 pt-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:pt-8">
        {/* ===== Question ===== */}
        <main>
          {q && (
            <article key={q.id} className="animate-pop rounded-3xl border border-board/10 bg-white p-4 shadow-[0_20px_40px_-28px_rgba(8,42,31,0.45)] sm:p-7">
              <div className="flex items-baseline justify-between gap-3">
                <h1 className="text-base font-bold text-board sm:text-lg">
                  ප්‍රශ්නය <span className="tabular text-2xl sm:text-3xl">{q.number}</span>
                  <span className="tabular text-slate-muted"> / {questions.length}</span>
                </h1>
                <QuestionSaveState state={qStatus} answered={chosen != null} />
              </div>

              <div className="mt-3 whitespace-pre-wrap break-words text-[1.08rem] leading-[1.85] text-slate-text sm:text-xl">
                <MathText text={q.text} />
              </div>
              {q.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={q.image_url} alt={`ප්‍රශ්නය ${q.number} රූපය`} className="mt-4 max-h-[40vh] w-full max-w-xl rounded-xl border border-board/10 bg-white object-contain" />
              )}

              <div role="radiogroup" aria-label={`ප්‍රශ්නය ${q.number} පිළිතුරු`} className="mt-5 space-y-3">
                {q.options.map((text, i) => {
                  const opt = i + 1;
                  const on = chosen === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={locked}
                      onClick={() => saver.choose(q.id, opt)}
                      className={`flex min-h-[60px] w-full items-center gap-4 rounded-2xl border-2 px-4 py-3 text-left transition-colors disabled:opacity-60 ${
                        on ? 'border-board bg-board/[0.06]' : 'border-board/15 bg-white hover:border-board/50 active:bg-board/[0.04]'
                      }`}
                    >
                      <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 text-lg font-bold tabular ${
                          on ? 'animate-fill border-board bg-board text-gold-light' : 'border-board/40 text-board'
                        }`}
                        aria-hidden
                      >
                        {opt}
                      </span>
                      <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[1.05rem] leading-relaxed text-slate-text sm:text-lg">
                        <MathText text={text} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </article>
          )}

          {/* Desktop/tablet inline nav */}
          <nav className="mt-5 hidden grid-cols-2 gap-3 lg:grid" aria-label="ප්‍රශ්න අතර යාම">
            <NavButton dir="prev" disabled={index === 0} onClick={() => go(index - 1)} />
            {isLast ? (
              <button type="button" onClick={() => setSubmitOpen(true)} disabled={locked} className="min-h-[56px] rounded-2xl bg-gold text-lg font-bold text-board-deep hover:bg-gold-light">
                පිළිතුරු Submit කරන්න
              </button>
            ) : (
              <NavButton dir="next" onClick={() => go(index + 1)} />
            )}
          </nav>
          <p className="mt-3 hidden text-center text-xs text-slate-muted lg:block">
            යතුරුපුවරුව: ← → ප්‍රශ්න අතර යාමට, 1–4 පිළිතුර තේරීමට
          </p>
        </main>

        {/* ===== Desktop answer sheet ===== */}
        <aside className="hidden lg:block">
          <div className="sticky top-28 rounded-3xl border border-board/10 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold text-board">පිළිතුරු පත්‍රය</h2>
            <AnswerSheet questions={questions} current={index} selected={saver.selected} status={saver.status} onPick={go} />
            <button
              type="button"
              onClick={() => setSubmitOpen(true)}
              disabled={locked}
              className="mt-5 min-h-[52px] w-full rounded-xl bg-gold font-bold text-board-deep hover:bg-gold-light"
            >
              පිළිතුරු Submit කරන්න
            </button>
          </div>
        </aside>
      </div>

      {/* ===== Mobile bottom bar ===== */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-board/15 bg-white/95 px-3 pt-3 backdrop-blur lg:hidden" aria-label="ප්‍රශ්න අතර යාම">
        <div className="mx-auto grid max-w-2xl grid-cols-[1fr_auto_1fr] gap-2">
          <NavButton dir="prev" disabled={index === 0} onClick={() => go(index - 1)} />
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex min-h-[56px] min-w-[76px] flex-col items-center justify-center rounded-2xl border-2 border-board/20 px-2 leading-tight text-board"
            aria-label="සියලු ප්‍රශ්න පෙන්වන්න"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
              <circle cx="4" cy="4" r="2" /><circle cx="10" cy="4" r="2" /><circle cx="16" cy="4" r="2" />
              <circle cx="4" cy="10" r="2" /><circle cx="10" cy="10" r="2" /><circle cx="16" cy="10" r="2" />
              <circle cx="4" cy="16" r="2" /><circle cx="10" cy="16" r="2" /><circle cx="16" cy="16" r="2" />
            </svg>
            <span className="tabular text-sm font-bold">{index + 1}/{questions.length}</span>
          </button>
          {isLast ? (
            <button type="button" onClick={() => setSubmitOpen(true)} disabled={locked} className="min-h-[56px] rounded-2xl bg-gold font-bold text-board-deep">
              Submit
            </button>
          ) : (
            <NavButton dir="next" onClick={() => go(index + 1)} />
          )}
        </div>
      </nav>

      {/* ===== Mobile answer sheet ===== */}
      <Modal open={sheetOpen} onClose={() => setSheetOpen(false)} labelledBy="sheet-title">
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 id="sheet-title" className="text-lg font-bold text-board">පිළිතුරු පත්‍රය</h2>
          <button type="button" data-autofocus onClick={() => setSheetOpen(false)} className="min-h-[44px] min-w-[44px] rounded-full text-2xl text-slate-muted" aria-label="වසන්න">
            ×
          </button>
        </div>
        <div className="px-5 pb-5 pt-3">
          <AnswerSheet
            questions={questions}
            current={index}
            selected={saver.selected}
            status={saver.status}
            onPick={(i) => {
              go(i);
              setSheetOpen(false);
            }}
          />
          <button
            type="button"
            onClick={() => {
              setSheetOpen(false);
              setSubmitOpen(true);
            }}
            className="mt-5 min-h-[52px] w-full rounded-xl bg-gold font-bold text-board-deep"
          >
            පිළිතුරු Submit කරන්න
          </button>
        </div>
      </Modal>

      {/* ===== Submit confirmation ===== */}
      <Modal open={submitOpen} onClose={() => !submitting && setSubmitOpen(false)} labelledBy="submit-title" locked={submitting}>
        <div className="chalkboard px-6 py-5 text-white">
          <h2 id="submit-title" className="text-xl font-bold">පිළිතුරු Submit කිරීම</h2>
        </div>
        <div className="px-6 py-5">
          <dl className="grid grid-cols-3 gap-2 text-center">
            <Stat label="මුළු ප්‍රශ්න" value={questions.length} />
            <Stat label="පිළිතුරු දුන්" value={answeredCount} tone="good" />
            <Stat label="පිළිතුරු නොදුන්" value={unanswered} tone={unanswered ? 'warn' : undefined} />
          </dl>
          {unanswered > 0 && (
            <p className="mt-4 text-sm text-slate-muted">ඔබ තවමත් ප්‍රශ්න {unanswered}කට පිළිතුරු දී නැත.</p>
          )}
          {saver.pendingCount > 0 && (
            <p className="mt-3 flex items-center gap-2 text-sm text-board">
              <Spinner className="h-4 w-4" /> පිළිතුරු {saver.pendingCount}ක් සුරැකෙමින් පවතී...
            </p>
          )}
          <p className="mt-4 font-semibold text-slate-text">
            Submit කළ පසු පිළිතුරු වෙනස් කිරීමට හෝ නැවත විභාගයට පෙනී සිටීමට නොහැක. ඔබට Submit කිරීමට අවශ්‍යද?
          </p>
          {submitError && (
            <p className="mt-3 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger" role="alert">
              {submitError}
            </p>
          )}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              data-autofocus
              onClick={() => setSubmitOpen(false)}
              disabled={submitting}
              className="min-h-[52px] rounded-xl border-2 border-board/20 font-semibold text-board disabled:opacity-50"
            >
              ආපසු යන්න
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !online}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-board font-bold text-white disabled:opacity-60"
            >
              {submitting && <Spinner />}
              Submit කරන්න
            </button>
          </div>
          {!online && <p className="mt-3 text-center text-xs text-danger">Submit කිරීමට අන්තර්ජාල සම්බන්ධතාවය අවශ්‍යයි.</p>}
        </div>
      </Modal>

      {/* ===== Time is up ===== */}
      {phase === 'finishing' && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-6 text-center text-white" role="alertdialog" aria-live="assertive">
          <div>
            <p className="text-2xl font-bold text-gold-light">නියමිත කාලය අවසන්!</p>
            <p className="mt-2 flex items-center justify-center gap-2 text-white/85">
              <Spinner /> ඔබගේ පිළිතුරු ස්වයංක්‍රීයව Submit වෙමින්...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function NavButton({ dir, disabled, onClick }: { dir: 'prev' | 'next'; disabled?: boolean; onClick: () => void }) {
  const prev = dir === 'prev';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-[56px] items-center justify-center gap-2 rounded-2xl px-3 font-bold transition disabled:opacity-35 ${
        prev ? 'border-2 border-board/25 bg-white text-board hover:border-board' : 'bg-board text-white hover:bg-board-deep'
      }`}
    >
      {prev && <Chevron left />}
      {prev ? 'පෙර' : 'ඊළඟ'}
      {!prev && <Chevron />}
    </button>
  );
}

function Chevron({ left }: { left?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={`h-5 w-5 ${left ? 'rotate-180' : ''}`} fill="currentColor" aria-hidden>
      <path d="M7.3 4.3a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4-1.4L11.6 10 7.3 5.7a1 1 0 0 1 0-1.4z" />
    </svg>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'good' | 'warn' }) {
  const color = tone === 'good' ? 'text-board' : tone === 'warn' ? 'text-danger' : 'text-slate-text';
  return (
    <div className="flex flex-col-reverse rounded-xl border border-board/10 bg-paper px-1 py-3">
      <dt className="text-xs leading-snug text-slate-muted">{label}</dt>
      <dd className={`tabular text-3xl font-bold ${color}`}>{value}</dd>
    </div>
  );
}

function QuestionSaveState({ state, answered }: { state?: string; answered: boolean }) {
  if (!answered) return <span className="text-xs text-slate-muted sm:text-sm">පිළිතුරු නොදී ඇත</span>;
  if (state === 'saving')
    return (
      <span className="flex items-center gap-1 text-xs text-board sm:text-sm">
        <Spinner className="h-3.5 w-3.5" /> සුරැකෙමින්...
      </span>
    );
  if (state === 'retrying') return <span className="text-xs text-danger sm:text-sm">නැවත උත්සාහ කරමින්...</span>;
  return (
    <span className="flex items-center gap-1 text-xs font-semibold text-board sm:text-sm">
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0z" />
      </svg>
      සුරකින ලදී
    </span>
  );
}
