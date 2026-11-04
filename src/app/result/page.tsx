import { redirect } from 'next/navigation';
import { getCurrentState, routeForStatus } from '@/lib/exam';
import { BRAND } from '@/lib/brand';
import { BrandBand, BrandFooter, TeacherPhoto } from '@/components/Brand';

export const dynamic = 'force-dynamic';

const MESSAGES = {
  submitted: {
    title: 'ඔබගේ පිළිතුරු සාර්ථකව Submit කරන ලදී.',
    body: 'විභාගයට සහභාගී වීම ගැන ස්තූතියි!',
  },
  auto_submitted: {
    title: 'නියමිත කාලය අවසන් වූ බැවින් ඔබගේ පිළිතුරු ස්වයංක්‍රීයව Submit කරන ලදී.',
    body: 'කාලය අවසන් වීමට පෙර සුරැකුණු සියලු පිළිතුරු ලකුණු ගණනය සඳහා යොදා ගන්නා ලදී.',
  },
  expired: {
    title: 'විභාග කාලය අවසන් විය.',
    body: 'නියමිත කාලය තුළ කිසිදු පිළිතුරක් සුරැකී නොතිබුණි.',
  },
} as const;

function formatColombo(iso: string | null) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(new Date(iso));
}

export default async function ResultPage() {
  const state = await getCurrentState();
  if (!state) redirect('/');
  if (!['submitted', 'auto_submitted', 'expired'].includes(state.status)) redirect(routeForStatus(state.status));

  const msg = MESSAGES[state.status as keyof typeof MESSAGES];
  const total = state.total_questions ?? state.question_count;
  const showScore = state.show_results && state.score != null;
  const pct = showScore && total ? Math.round(((state.score ?? 0) / total) * 100) : null;

  return (
    <div className="graph-paper min-h-dvh">
      <BrandBand />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <section className="overflow-hidden rounded-3xl border border-board/10 bg-white shadow-sm">
          <div className="chalkboard px-6 py-8 text-center text-white sm:py-10">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gold text-board-deep">
              <svg viewBox="0 0 20 20" className="h-8 w-8" fill="currentColor" aria-hidden>
                <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0z" />
              </svg>
            </div>
            <h1 className="mx-auto mt-4 max-w-md text-xl font-bold leading-snug sm:text-2xl" role="status">
              {msg.title}
            </h1>
            <p className="mt-2 text-white/75">{msg.body}</p>

            {showScore ? (
              <div className="mt-8">
                <p className="text-sm text-white/70">ඔබගේ ලකුණු</p>
                <p className="tabular mt-1 font-bold leading-none text-gold">
                  <span className="text-7xl sm:text-8xl">{state.score}</span>
                  <span className="text-3xl text-gold-light/70"> / {total}</span>
                </p>
                {pct != null && <p className="tabular mt-3 text-lg text-white/85">{pct}%</p>}
              </div>
            ) : (
              <p className="mt-6 rounded-xl bg-black/20 px-4 py-3 text-sm text-white/85">
                ප්‍රතිඵල පසුව {BRAND.teacher} සර් විසින් දැනුම් දෙනු ඇත.
              </p>
            )}
          </div>

          <dl className="grid gap-px bg-board/10 sm:grid-cols-2">
            {[
              ['සිසුවාගේ නම', state.full_name],
              ['ලියාපදිංචි අංකය', state.registration_id],
              ['ආරම්භ කළ වේලාව', formatColombo(state.started_at)],
              ['Submit වූ වේලාව', formatColombo(state.submitted_at)],
            ].map(([k, v]) => (
              <div key={k} className="bg-white px-6 py-4">
                <dt className="text-xs text-slate-muted">{k}</dt>
                <dd className="tabular mt-0.5 font-semibold text-slate-text">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-6 flex items-center gap-4 rounded-3xl border border-board/10 bg-white p-5">
          <TeacherPhoto size={56} />
          <div className="text-sm leading-relaxed">
            <p className="font-semibold text-board">{BRAND.batchSi} පන්තිය – {BRAND.modeSi}</p>
            <p className="text-slate-muted">
              පන්තියට සම්බන්ධ වීමට හෝ විමසීම් සඳහා:{' '}
              <a href={BRAND.phoneHref} className="font-semibold text-board underline-offset-2 hover:underline">
                {BRAND.phone}
              </a>
            </p>
          </div>
        </section>
        <BrandFooter />
      </main>
    </div>
  );
}
