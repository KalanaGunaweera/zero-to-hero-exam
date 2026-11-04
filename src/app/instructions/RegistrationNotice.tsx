'use client';
import { useEffect, useState } from 'react';

export function RegistrationNotice({ registrationId, name }: { registrationId: string; name: string }) {
  const [fresh, setFresh] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('zth_new_reg')) {
        setFresh(true);
        sessionStorage.removeItem('zth_new_reg');
      }
    } catch {}
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(registrationId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <section
      className={`rounded-3xl border-2 p-5 sm:p-6 ${fresh ? 'border-gold bg-gold/10' : 'border-board/10 bg-white'}`}
      aria-live="polite"
    >
      {fresh && <p className="font-bold text-board">ලියාපදිංචිය සාර්ථකයි!</p>}
      <p className="text-slate-text">
        ආයුබෝවන්, <span className="font-semibold">{name}</span>
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div>
          <p className="text-sm text-slate-muted">ඔබගේ ලියාපදිංචි අංකය</p>
          <p className="tabular text-2xl font-bold tracking-wider text-board sm:text-3xl" lang="en">
            {registrationId}
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="ml-auto min-h-[44px] rounded-xl border-2 border-board/20 px-4 text-sm font-semibold text-board hover:border-board"
        >
          {copied ? 'පිටපත් විය' : 'පිටපත් කරන්න'}
        </button>
      </div>
      <p className="mt-3 text-sm text-slate-muted">
        මෙම අංකය සටහන් කර තබා ගන්න. වෙනත් උපාංගයකින් හෝ නැවත පිවිසීමට එය අවශ්‍ය වේ.
      </p>
    </section>
  );
}
