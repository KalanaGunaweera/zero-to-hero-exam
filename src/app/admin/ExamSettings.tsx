'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserClient } from '@/lib/supabase/browser';
import { BRAND } from '@/lib/brand';

export type ExamRow = {
  id: string;
  title: string;
  duration_minutes: number;
  registration_open: boolean;
  exam_open: boolean;
  show_results: boolean;
};

const TOGGLES: { key: 'registration_open' | 'exam_open' | 'show_results'; label: string; help: string }[] = [
  { key: 'registration_open', label: 'Registration open', help: 'New students can register' },
  { key: 'exam_open', label: 'Exam open', help: 'Registered students can press Start' },
  { key: 'show_results', label: 'Show marks to students', help: 'Score appears on the result page' },
];

export function ExamSettings({ exam, questionCount }: { exam: ExamRow; questionCount: number }) {
  const router = useRouter();
  const [state, setState] = useState(exam);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(key: (typeof TOGGLES)[number]['key']) {
    setSaving(key);
    setError(null);
    const next = !state[key];
    const { error } = await browserClient().from('exams').update({ [key]: next, updated_at: new Date().toISOString() }).eq('id', exam.id);
    if (error) setError(error.message);
    else {
      setState((s) => ({ ...s, [key]: next }));
      router.refresh();
    }
    setSaving(null);
  }

  return (
    <section className="mb-6 rounded-2xl border border-board/10 bg-white p-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-xl font-bold text-board">{state.title}</h1>
        <span className="text-sm text-slate-muted">{state.duration_minutes} minutes</span>
        <span className={`text-sm font-semibold ${questionCount === BRAND.exam.questions ? 'text-board' : 'text-danger'}`}>
          {questionCount} published question{questionCount === 1 ? '' : 's'}
          {questionCount !== BRAND.exam.questions && ` (expected ${BRAND.exam.questions})`}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {TOGGLES.map((t) => (
          <label key={t.key} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-board/10 px-4 py-3">
            <span>
              <span className="block font-semibold">{t.label}</span>
              <span className="block text-xs text-slate-muted">{t.help}</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={state[t.key]}
              disabled={saving === t.key}
              onChange={() => toggle(t.key)}
              className="h-6 w-6 accent-board"
            />
          </label>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </section>
  );
}
