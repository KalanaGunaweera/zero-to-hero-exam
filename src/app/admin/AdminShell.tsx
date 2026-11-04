'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { browserClient } from '@/lib/supabase/browser';
import { Logo } from '@/components/Brand';

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const tab = (href: string, label: string) => (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm font-semibold ${path === href ? 'bg-gold text-board-deep' : 'text-white/80 hover:text-white'}`}
    >
      {label}
    </Link>
  );
  return (
    <div className="min-h-dvh bg-paper" lang="en">
      <header className="chalkboard text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <Logo size={34} />
          <p className="font-bold text-gold-light">Zero to Hero</p>
          <span className="text-sm text-white/60">Exam admin</span>
          <nav className="ml-2 flex gap-1">
            {tab('/admin', 'Results')}
            {tab('/admin/questions', 'Questions')}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-white/60 sm:inline">{email}</span>
            <button
              onClick={async () => {
                await browserClient().auth.signOut();
                router.replace('/admin/login');
                router.refresh();
              }}
              className="rounded-lg border border-white/20 px-3 py-1.5 hover:border-white/50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}

export function NotAdmin({ email }: { email: string }) {
  const router = useRouter();
  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center" lang="en">
      <div>
        <p className="font-bold text-board">{email} is not an admin.</p>
        <p className="mt-2 text-sm text-slate-muted">Add this user to the admins table in Supabase (see README).</p>
        <button
          onClick={async () => {
            await browserClient().auth.signOut();
            router.replace('/admin/login');
          }}
          className="mt-4 rounded-xl border-2 border-board/20 px-4 py-2 font-semibold text-board"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
