import { redirect } from 'next/navigation';
import { getCurrentState, routeForStatus, rpc } from '@/lib/exam';
import { currentTokenHash } from '@/lib/session';
import { BrandBand, BrandFooter } from '@/components/Brand';
import { StartExam } from './StartExam';
import { RegistrationNotice } from './RegistrationNotice';

export const dynamic = 'force-dynamic';

const rules = (minutes: number) => [
  `විභාග කාලය මිනිත්තු ${minutes}කි.`,
  'විභාගය ආරම්භ කළ පසු කාලය නතර කළ නොහැක.',
  'පිළිතුරු ලබා දුන් පසු නැවත වෙනස් කළ හැකිය.',
  'සියලු ප්‍රශ්න පරීක්ෂා කර අවසානයේ Submit කළ හැකිය.',
  'නියමිත කාලය අවසන් වූ විට පිළිතුරු ස්වයංක්‍රීයව Submit වේ.',
];

const extra = (questions: number) => [
  `ප්‍රශ්න ${questions}ක් ඇත. සෑම ප්‍රශ්නයකටම පිළිතුරු 4ක් ඇති අතර නිවැරදි පිළිතුර එකක් පමණි.`,
  'ඔබ තෝරන සෑම පිළිතුරක්ම ස්වයංක්‍රීයව සුරැකේ. "සුරකින ලදී" පෙන්වන තුරු රැඳී සිටින්න.',
  'පිටුව refresh කළත්, සම්බන්ධතාවය බිඳී නැවත සම්බන්ධ වුවත් සුරැකි පිළිතුරු නැති නොවේ. නමුත් කාලය නොනැවතී ගණනය වේ.',
  'විභාගය අතරතුර ස්ථාවර අන්තර්ජාල සම්බන්ධතාවයක් අවශ්‍යයි.',
  'එක් සිසුවෙකුට විභාගයට පෙනී සිටිය හැක්කේ එක් වරක් පමණි.',
];

export default async function InstructionsPage() {
  const hash = currentTokenHash();
  let state = await getCurrentState();
  if (!state || !hash) redirect('/');
  if (state.status !== 'registered' && state.status !== 'ready_to_start') redirect(routeForStatus(state.status));
  if (state.status === 'registered') state = await rpc('mark_ready', { p_token_hash: hash });

  return (
    <div className="graph-paper min-h-dvh">
      <BrandBand />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <RegistrationNotice registrationId={state!.registration_id} name={state!.full_name} />

        <section className="mt-6 overflow-hidden rounded-3xl border border-board/10 bg-white shadow-sm">
          <div className="chalkboard px-5 py-5 text-white sm:px-8">
            <h1 className="text-2xl font-bold sm:text-3xl">විභාග උපදෙස්</h1>
            <p className="mt-1 text-sm text-white/75">ආරම්භ කිරීමට පෙර කරුණාකර සියල්ල සැලකිල්ලෙන් කියවන්න.</p>
          </div>

          <ul className="space-y-3 px-5 py-6 sm:px-8">
            {rules(state!.duration_minutes).map((r) => (
              <li key={r} className="flex gap-3 text-[1.05rem] font-semibold leading-relaxed text-slate-text">
                <span className="mt-2.5 h-2.5 w-2.5 shrink-0 rotate-45 bg-gold" aria-hidden />
                {r}
              </li>
            ))}
          </ul>

          <div className="border-t border-board/10 bg-paper/60 px-5 py-5 sm:px-8">
            <h2 className="font-bold text-board">තවත් වැදගත් කරුණු</h2>
            <ul className="mt-3 space-y-2">
              {extra(state!.question_count).map((r) => (
                <li key={r} className="flex gap-3 text-sm leading-relaxed text-slate-muted">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-board/50" aria-hidden />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <StartExam examOpen={state!.exam_open} questionCount={state!.question_count} minutes={state!.duration_minutes} />
        <BrandFooter />
      </main>
    </div>
  );
}
