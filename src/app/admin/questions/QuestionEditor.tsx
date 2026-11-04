'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserClient } from '@/lib/supabase/browser';
import { Modal } from '@/components/Modal';
import { Spinner } from '@/components/Spinner';
import { BRAND } from '@/lib/brand';
import { MathText } from '@/components/MathText';

export type AdminQuestion = {
  id: string;
  exam_id: string;
  position: number;
  question_text: string;
  image_url: string | null;
  option_1: string;
  option_2: string;
  option_3: string;
  option_4: string;
  is_published: boolean;
  correct_option: number | null;
};

type Draft = Omit<AdminQuestion, 'id' | 'exam_id'> & { id?: string };

const blank = (position: number): Draft => ({
  position,
  question_text: '',
  image_url: null,
  option_1: '',
  option_2: '',
  option_3: '',
  option_4: '',
  is_published: true,
  correct_option: null,
});

export function QuestionEditor({ examId, initial, attemptsStarted }: { examId: string; initial: AdminQuestion[]; attemptsStarted: number }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const published = initial.filter((q) => q.is_published).length;
  const missingKey = initial.filter((q) => q.is_published && !q.correct_option).length;

  const nextPos = (initial.reduce((m, q) => Math.max(m, q.position), 0) || 0) + 1;

  async function save() {
    if (!draft) return;
    setError(null);
    const opts = [draft.option_1, draft.option_2, draft.option_3, draft.option_4];
    if (!draft.question_text.trim()) return setError('Question text is required.');
    if (opts.some((o) => !o.trim())) return setError('All four options are required.');
    if (!draft.correct_option) return setError('Select the correct answer.');

    setBusy(true);
    const supabase = browserClient();
    const row = {
      exam_id: examId,
      position: Number(draft.position) || 1,
      question_text: draft.question_text.trim(),
      image_url: draft.image_url || null,
      option_1: draft.option_1.trim(),
      option_2: draft.option_2.trim(),
      option_3: draft.option_3.trim(),
      option_4: draft.option_4.trim(),
      is_published: draft.is_published,
      updated_at: new Date().toISOString(),
    };
    let id = draft.id;
    if (id) {
      const { error } = await supabase.from('questions').update(row).eq('id', id);
      if (error) return fail(error.message);
    } else {
      const { data, error } = await supabase.from('questions').insert(row).select('id').single();
      if (error) return fail(error.message);
      id = data.id;
    }
    const { error: keyErr } = await supabase.from('question_keys').upsert({ question_id: id, correct_option: draft.correct_option });
    if (keyErr) return fail(keyErr.message);
    setBusy(false);
    setDraft(null);
    router.refresh();
  }

  function fail(msg: string) {
    setError(msg);
    setBusy(false);
  }

  async function remove(q: AdminQuestion) {
    if (!confirm(`Delete question ${q.position}? Saved student answers for it will also be deleted.`)) return;
    const { error } = await browserClient().from('questions').delete().eq('id', q.id);
    if (error) alert(error.message);
    router.refresh();
  }

  async function upload(file: File) {
    if (!draft) return;
    if (!file.type.startsWith('image/')) return setError('Choose an image file.');
    if (file.size > 3 * 1024 * 1024) return setError('Image must be under 3 MB.');
    setUploading(true);
    setError(null);
    const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const path = `${examId}/${crypto.randomUUID()}.${ext}`;
    const supabase = browserClient();
    const { error } = await supabase.storage.from('question-images').upload(path, file, { contentType: file.type, cacheControl: '31536000' });
    if (error) setError(error.message);
    else setDraft({ ...draft, image_url: supabase.storage.from('question-images').getPublicUrl(path).data.publicUrl });
    setUploading(false);
  }

  const input = 'mt-1 block w-full rounded-xl border-2 border-board/15 px-3 py-2 outline-none focus:border-board';

  return (
    <section>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-board">Questions</h1>
        <span className={`text-sm font-semibold ${published === BRAND.exam.questions ? 'text-board' : 'text-danger'}`}>
          {published} published{published !== BRAND.exam.questions && ` (the paper should have ${BRAND.exam.questions})`}
        </span>
        {missingKey > 0 && <span className="text-sm font-semibold text-danger">{missingKey} without a correct answer</span>}
        <button onClick={() => { setError(null); setDraft(blank(nextPos)); }} className="ml-auto min-h-[42px] rounded-xl bg-gold px-4 font-bold text-board-deep">
          Add question
        </button>
      </div>

      {attemptsStarted > 0 && (
        <p className="mt-3 rounded-xl border border-gold bg-gold/10 p-3 text-sm">
          {attemptsStarted} student{attemptsStarted === 1 ? ' has' : 's have'} already started. Changing or removing questions now affects their papers and scores.
        </p>
      )}

      <ol className="mt-5 space-y-3">
        {initial.map((q) => (
          <li key={q.id} className={`rounded-2xl border bg-white p-4 ${q.is_published ? 'border-board/10' : 'border-dashed border-slate-muted/40 opacity-70'}`}>
            <div className="flex items-start gap-3">
              <span className="tabular grid h-9 w-9 shrink-0 place-items-center rounded-full bg-board font-bold text-gold-light">{q.position}</span>
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap break-words" lang="si"><MathText text={q.question_text} /></p>
                {q.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={q.image_url} alt="" className="mt-2 max-h-32 rounded-lg border border-board/10" />
                )}
                <ol className="mt-2 grid gap-1 text-sm sm:grid-cols-2" lang="si">
                  {[q.option_1, q.option_2, q.option_3, q.option_4].map((o, i) => (
                    <li key={i} className={`rounded-lg px-2 py-1 ${q.correct_option === i + 1 ? 'bg-board/10 font-semibold text-board' : 'text-slate-muted'}`}>
                      ({i + 1}) <MathText text={o} /> {q.correct_option === i + 1 && '✓'}
                    </li>
                  ))}
                </ol>
                {!q.is_published && <p className="mt-1 text-xs font-semibold text-slate-muted">Hidden from students</p>}
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <button onClick={() => { setError(null); setDraft({ ...q }); }} className="rounded-lg border-2 border-board/20 px-3 py-1.5 text-sm font-semibold text-board">Edit</button>
                <button onClick={() => remove(q)} className="rounded-lg border-2 border-danger/30 px-3 py-1.5 text-sm font-semibold text-danger">Delete</button>
              </div>
            </div>
          </li>
        ))}
        {initial.length === 0 && (
          <li className="rounded-2xl border-2 border-dashed border-board/20 p-10 text-center text-slate-muted">
            No questions yet. Add the questions for the paper; students can only start once at least one is published.
          </li>
        )}
      </ol>

      <Modal open={!!draft} onClose={() => !busy && setDraft(null)} labelledBy="q-title" locked={busy} wide>
        {draft && (
          <div className="max-h-[85dvh] overflow-y-auto p-5" lang="en">
            <h2 id="q-title" className="text-lg font-bold text-board">{draft.id ? 'Edit question' : 'New question'}</h2>
            <div className="mt-4 grid grid-cols-[90px_1fr] gap-3">
              <label className="text-sm font-semibold">
                Number
                <input type="number" min={1} value={draft.position} onChange={(e) => setDraft({ ...draft, position: Number(e.target.value) })} className={input} />
              </label>
              <label className="flex items-end gap-2 pb-2 text-sm font-semibold">
                <input type="checkbox" checked={draft.is_published} onChange={(e) => setDraft({ ...draft, is_published: e.target.checked })} className="h-5 w-5 accent-board" />
                Published (visible in the paper)
              </label>
            </div>
            <label className="mt-3 block text-sm font-semibold">
              Question (Sinhala)
              <textarea rows={4} lang="si" value={draft.question_text} onChange={(e) => setDraft({ ...draft, question_text: e.target.value })} className={input} />
            </label>
            <p className="mt-1 text-xs text-slate-muted">
              Maths: <code>[[5/6]]</code> fraction, <code>[[√196]]</code> square root. Type ² ³ ° × − ≤ directly. Works in options too.
            </p>
            {draft.question_text.includes('[[') && (
              <p className="mt-2 rounded-lg bg-paper px-3 py-2 text-base" lang="si">
                <MathText text={draft.question_text} />
              </p>
            )}

            <div className="mt-3 text-sm font-semibold">
              Image (optional)
              <div className="mt-1 flex items-center gap-3">
                <label className="cursor-pointer rounded-lg border-2 border-board/20 px-3 py-1.5 font-semibold text-board">
                  {uploading ? 'Uploading…' : 'Choose image'}
                  <input type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                </label>
                {draft.image_url && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={draft.image_url} alt="" className="h-12 rounded border" />
                    <button type="button" onClick={() => setDraft({ ...draft, image_url: null })} className="text-danger">Remove</button>
                  </>
                )}
              </div>
            </div>

            <fieldset className="mt-4">
              <legend className="text-sm font-semibold">Options — select the correct one</legend>
              {([1, 2, 3, 4] as const).map((n) => {
                const k = `option_${n}` as const;
                return (
                  <div key={n} className="mt-2 flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct"
                      aria-label={`Option ${n} is correct`}
                      checked={draft.correct_option === n}
                      onChange={() => setDraft({ ...draft, correct_option: n })}
                      className="h-5 w-5 shrink-0 accent-board"
                    />
                    <span className="tabular w-6 font-bold">({n})</span>
                    <input lang="si" value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} className={`${input} mt-0`} />
                  </div>
                );
              })}
            </fieldset>

            {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button data-autofocus onClick={() => setDraft(null)} disabled={busy} className="min-h-[46px] rounded-xl border-2 border-board/20 font-semibold text-board">Cancel</button>
              <button onClick={save} disabled={busy || uploading} className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-board font-bold text-white disabled:opacity-60">
                {busy && <Spinner />} Save question
              </button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
