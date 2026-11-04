'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrandBand, BrandFooter } from '@/components/Brand';
import { Spinner } from '@/components/Spinner';
import { errorMessage } from '@/lib/messages';

export default function ResumePage() {
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [regId, setRegId] = useState('ZTH27-');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, registrationId: regId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        router.replace('/');
        router.refresh();
        return;
      }
      setError(errorMessage(data.code));
    } catch {
      setError(errorMessage('NETWORK'));
    }
    setBusy(false);
  }

  const input =
    'mt-1.5 block w-full rounded-xl border-2 border-board/15 bg-white px-4 py-3 text-base outline-none focus:border-board';

  return (
    <div className="graph-paper min-h-dvh">
      <BrandBand />
      <main className="mx-auto max-w-md px-4 py-8">
        <form onSubmit={onSubmit} className="rounded-3xl border border-board/10 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-board">නැවත පිවිසීම</h1>
          <p className="mt-1 text-sm text-slate-muted">
            ලියාපදිංචි වූ දුරකථන අංකය සහ ලියාපදිංචි අංකය ඇතුළත් කරන්න. ඔබගේ විභාගය නැවැත්වූ තැන සිට දිගටම කරගෙන යා හැක.
          </p>

          <label htmlFor="r-mobile" className="mt-6 block font-semibold">
            ජංගම දුරකථන අංකය
          </label>
          <input id="r-mobile" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="0771234567" value={mobile} onChange={(e) => setMobile(e.target.value)} required className={input} />

          <label htmlFor="r-reg" className="mt-5 block font-semibold">
            ලියාපදිංචි අංකය
          </label>
          <input
            id="r-reg"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            value={regId}
            onChange={(e) => setRegId(e.target.value.toUpperCase())}
            required
            maxLength={12}
            className={`${input} tabular tracking-wider`}
            lang="en"
          />

          {error && (
            <p className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="mt-6 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-board px-6 text-lg font-bold text-white transition hover:bg-board-deep disabled:opacity-60">
            {busy && <Spinner />}
            පිවිසෙන්න
          </button>
          <p className="mt-5 text-center text-sm">
            <Link href="/" className="font-semibold text-board underline underline-offset-2">
              නව ලියාපදිංචියක්
            </Link>
          </p>
        </form>
        <BrandFooter />
      </main>
    </div>
  );
}
