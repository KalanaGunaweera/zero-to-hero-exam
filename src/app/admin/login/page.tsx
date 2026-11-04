'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserClient } from '@/lib/supabase/browser';
import { Logo } from '@/components/Brand';
import { Spinner } from '@/components/Spinner';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await browserClient().auth.signInWithPassword({ email, password });
    if (error) {
      setError('Email or password is incorrect.');
      setBusy(false);
      return;
    }
    router.replace('/admin');
    router.refresh();
  }

  const input = 'mt-1 block w-full rounded-xl border-2 border-board/15 px-4 py-3 outline-none focus:border-board';
  return (
    <div className="chalkboard grid min-h-dvh place-items-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl" lang="en">
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <div>
            <p className="font-bold text-board">Zero to Hero</p>
            <p className="text-sm text-slate-muted">Exam admin</p>
          </div>
        </div>
        <label className="mt-6 block text-sm font-semibold" htmlFor="a-email">Email</label>
        <input id="a-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={input} />
        <label className="mt-4 block text-sm font-semibold" htmlFor="a-pass">Password</label>
        <input id="a-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className={input} />
        {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
        <button type="submit" disabled={busy} className="mt-6 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-board font-bold text-white disabled:opacity-60">
          {busy && <Spinner />} Sign in
        </button>
      </form>
    </div>
  );
}
