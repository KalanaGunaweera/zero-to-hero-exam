'use client';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/Modal';
import { Spinner } from '@/components/Spinner';
import { errorMessage } from '@/lib/messages';

export function StartExam({ examOpen, questionCount, minutes }: { examOpen: boolean; questionCount: number; minutes: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = useCallback(() => !busy && setOpen(false), [busy]);

  const notReady = !examOpen || questionCount === 0;

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/exam/start', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        router.replace('/exam');
        return;
      }
      setError(errorMessage(data.code));
    } catch {
      setError(errorMessage('NETWORK'));
    }
    setBusy(false);
  }

  return (
    <div className="mt-6">
      {notReady ? (
        <div className="rounded-2xl border-2 border-board/15 bg-white p-5 text-center">
          <p className="font-semibold text-board">{errorMessage(questionCount === 0 ? 'NO_QUESTIONS' : 'EXAM_NOT_OPEN')}</p>
          <button type="button" onClick={() => router.refresh()} className="mt-3 min-h-[48px] rounded-xl border-2 border-board/20 px-5 font-semibold text-board">
            නැවත පරීක්ෂා කරන්න
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-[60px] w-full items-center justify-center rounded-2xl bg-gold px-6 text-xl font-bold text-board-deep shadow-[inset_0_-4px_0_rgba(0,0,0,0.15)] transition hover:bg-gold-light active:translate-y-px"
        >
          විභාගය ආරම්භ කරන්න
        </button>
      )}

      <Modal open={open} onClose={close} labelledBy="start-title" locked={busy}>
        <div className="chalkboard px-6 py-5 text-white">
          <h2 id="start-title" className="text-xl font-bold">
            විභාගය ආරම්භ කිරීම
          </h2>
        </div>
        <div className="px-6 py-5">
          <p className="text-[1.05rem] leading-relaxed text-slate-text">
            ඔබ විභාගය ආරම්භ කිරීමට සූදානම්ද? Start කළ පසු මිනිත්තු {minutes}ක කාලය ආරම්භ වන අතර එය නතර කළ නොහැක.
          </p>
          {error && (
            <p className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              data-autofocus
              onClick={close}
              disabled={busy}
              className="min-h-[52px] rounded-xl border-2 border-board/20 font-semibold text-board hover:border-board disabled:opacity-50"
            >
              අවලංගු කරන්න
            </button>
            <button
              type="button"
              onClick={start}
              disabled={busy}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-board font-bold text-white hover:bg-board-deep disabled:opacity-70"
            >
              {busy && <Spinner />}
              විභාගය ආරම්භ කරන්න
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
