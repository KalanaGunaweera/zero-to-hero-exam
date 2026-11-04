import { redirect } from 'next/navigation';
import { getCurrentState, routeForStatus } from '@/lib/exam';
import { BRAND } from '@/lib/brand';
import { BrandFooter, TeacherPhoto } from '@/components/Brand';
import { CoverHero } from '@/components/CoverHero';
import { RegisterForm } from './RegisterForm';

export const dynamic = 'force-dynamic';

const FACTS = [
  [String(BRAND.exam.minutes), 'මිනිත්තු'],
  [String(BRAND.exam.questions), 'ප්‍රශ්න'],
  ['1', 'උත්සාහය'],
] as const;

export default async function Home() {
  // Already registered on this device → continue where they left off
  const state = await getCurrentState().catch(() => null);
  if (state) redirect(routeForStatus(state.status));

  return (
    <div className="graph-paper min-h-dvh">
      <div className="mx-auto max-w-6xl lg:px-6 lg:pt-8">
        <CoverHero rounded />
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-8 lg:py-8">
        {/* Exam facts: above the form on phones, beside it on desktop */}
        <aside className="lg:order-2">
          <div className="lg:sticky lg:top-8">
            <div className="rounded-3xl bg-ink p-5 text-white">
              <h1 className="text-lg font-bold leading-snug text-gold-light sm:text-xl">
                {BRAND.batchSi}
                <span className="block text-base font-medium text-white/80">Online විභාගය</span>
              </h1>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                {FACTS.map(([value, label]) => (
                  <div key={label} className="flex flex-col-reverse rounded-xl border border-white/15 bg-white/[0.04] px-1 py-2.5">
                    <dt className="text-xs text-white/70">{label}</dt>
                    <dd className="tabular font-display text-3xl font-bold text-gold">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="mt-4 hidden items-center gap-4 rounded-3xl border border-board/10 bg-white p-5 lg:flex">
              <TeacherPhoto size={64} />
              <div className="leading-snug">
                <p className="font-semibold text-slate-text" lang="en">{BRAND.teacher}</p>
                <p className="text-sm text-slate-muted">ගණිතය – {BRAND.modeSi}</p>
                <a href={BRAND.whatsappHref} className="mt-1 inline-block text-sm font-semibold text-board hover:underline">
                  WhatsApp: {BRAND.phone}
                </a>
              </div>
            </div>
          </div>
        </aside>

        <section className="lg:order-1">
          <RegisterForm />
          <BrandFooter />
        </section>
      </div>
    </div>
  );
}
