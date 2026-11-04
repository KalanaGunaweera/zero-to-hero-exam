'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DISTRICTS } from '@/lib/districts';
import { errorMessage } from '@/lib/messages';
import { Spinner } from '@/components/Spinner';
import { validateRegistration, type FieldErrors, type RegistrationInput } from '@/lib/validation';

type Values = Omit<RegistrationInput, 'consent'> & { consent: boolean; website: string };

const FIELDS: { key: keyof Omit<RegistrationInput, 'district' | 'consent'>; label: string; hint?: string; type?: string; autoComplete: string; inputMode?: 'tel' | 'text' }[] = [
  { key: 'fullName', label: 'සිසුවාගේ සම්පූර්ණ නම', autoComplete: 'name' },
  { key: 'mobile', label: 'සිසුවාගේ ජංගම දුරකථන අංකය', hint: 'උදා: 0771234567', type: 'tel', inputMode: 'tel', autoComplete: 'tel-national' },
  { key: 'schoolName', label: 'පාසලේ නම', autoComplete: 'organization' },
];

export function RegisterForm() {
  const router = useRouter();
  const [v, setV] = useState<Values>({ fullName: '', mobile: '', schoolName: '', district: '', parentName: '', consent: false, website: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<{ msg: string; resume?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Values>(k: K, val: Values[K]) => {
    setV((s) => ({ ...s, [k]: val }));
    if (errors[k as keyof FieldErrors]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const { errors: errs } = validateRegistration(v);
    if (Object.keys(errs).length) {
      setErrors(errs);
      const first = Object.keys(errs)[0];
      document.getElementById(`f-${first}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        sessionStorage.setItem('zth_new_reg', data.registrationId);
        router.replace('/instructions');
        router.refresh();
        return;
      }
      if (data.code === 'VALIDATION' && data.fields) setErrors(data.fields);
      else setFormError({ msg: errorMessage(data.code), resume: data.code === 'DUPLICATE_MOBILE' });
    } catch {
      setFormError({ msg: errorMessage('NETWORK') });
    }
    setBusy(false);
  }

  const inputCls = (bad?: string) =>
    `mt-1.5 block w-full rounded-xl border-2 bg-white px-4 py-3 text-base text-slate-text outline-none transition-colors placeholder:text-slate-muted/60 focus:border-board ${
      bad ? 'border-danger' : 'border-board/15'
    }`;

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-3xl border border-board/10 bg-white p-5 shadow-[0_1px_0_rgba(15,61,46,0.08),0_20px_40px_-24px_rgba(8,42,31,0.35)] sm:p-8">
      <h2 className="text-2xl font-bold text-board">විභාගය සඳහා ලියාපදිංචි වන්න</h2>
      <p className="mt-1 text-sm text-slate-muted">සියලු තොරතුරු අනිවාර්යයි. ලියාපදිංචි වූ පසු විභාග උපදෙස් පෙන්වනු ඇත.</p>

      <div className="mt-6 space-y-5">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={`f-${f.key}`} className="block font-semibold text-slate-text">
              {f.label} <span className="text-danger" aria-hidden>*</span>
            </label>
            <input
              id={`f-${f.key}`}
              type={f.type ?? 'text'}
              inputMode={f.inputMode}
              autoComplete={f.autoComplete}
              placeholder={f.hint}
              value={v[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
              aria-invalid={!!errors[f.key]}
              aria-describedby={errors[f.key] ? `e-${f.key}` : undefined}
              required
              maxLength={f.key === 'mobile' ? 16 : 150}
              className={inputCls(errors[f.key])}
            />
            {errors[f.key] && (
              <p id={`e-${f.key}`} className="mt-1 text-sm text-danger" role="alert">
                {errors[f.key]}
              </p>
            )}
          </div>
        ))}

        <div>
          <label htmlFor="f-district" className="block font-semibold text-slate-text">
            දිස්ත්‍රික්කය <span className="text-danger" aria-hidden>*</span>
          </label>
          <select
            id="f-district"
            value={v.district}
            onChange={(e) => set('district', e.target.value)}
            aria-invalid={!!errors.district}
            aria-describedby={errors.district ? 'e-district' : undefined}
            required
            className={`${inputCls(errors.district)} appearance-none bg-[length:20px] bg-[right_1rem_center] bg-no-repeat pr-12`}
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%230F3D2E'%3E%3Cpath d='M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z'/%3E%3C/svg%3E\")" }}
          >
            <option value="">දිස්ත්‍රික්කය තෝරන්න</option>
            {DISTRICTS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.si} ({d.value})
              </option>
            ))}
          </select>
          {errors.district && (
            <p id="e-district" className="mt-1 text-sm text-danger" role="alert">
              {errors.district}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="f-parentName" className="block font-semibold text-slate-text">
            දෙමාපියන්ගේ / භාරකරුගේ නම <span className="text-danger" aria-hidden>*</span>
          </label>
          <input
            id="f-parentName"
            autoComplete="off"
            value={v.parentName}
            onChange={(e) => set('parentName', e.target.value)}
            aria-invalid={!!errors.parentName}
            aria-describedby={errors.parentName ? 'e-parentName' : undefined}
            maxLength={120}
            className={inputCls(errors.parentName)}
          />
          {errors.parentName && (
            <p id="e-parentName" className="mt-1 text-sm text-danger" role="alert">
              {errors.parentName}
            </p>
          )}
        </div>

        {/* Honeypot (hidden from people and screen readers) */}
        <div className="absolute -left-[9999px]" aria-hidden>
          <label>
            Website
            <input tabIndex={-1} autoComplete="off" value={v.website} onChange={(e) => set('website', e.target.value)} />
          </label>
        </div>

        <fieldset className={`rounded-2xl border-2 p-4 ${errors.consent ? 'border-danger bg-danger/5' : 'border-gold/50 bg-gold/5'}`}>
          <legend className="px-1 text-sm font-semibold text-board">දෙමාපිය / භාරකරු කැමැත්ත</legend>
          <label htmlFor="f-consent" className="flex cursor-pointer gap-3">
            <input
              id="f-consent"
              type="checkbox"
              checked={v.consent}
              onChange={(e) => set('consent', e.target.checked)}
              aria-describedby="consent-text"
              className="mt-1 h-6 w-6 shrink-0 cursor-pointer accent-board"
            />
            <span id="consent-text" className="text-sm leading-relaxed text-slate-text">
              මම මෙම සිසුවාගේ මව / පියා / නීත්‍යානුකූල භාරකරු වෙමි. මෙම විභාගය පැවැත්වීම, ලකුණු ගණනය කිරීම සහ ප්‍රතිඵල
              දැනුම් දීම සඳහා පමණක් ඉහත තොරතුරු Zero to Hero ආයතනය විසින් රැස් කර ගැනීමට සහ භාවිත කිරීමට කැමැත්ත ලබා
              දෙමි. මෙම තොරතුරු තෙවන පාර්ශ්වයන් සමඟ බෙදා නොගනු ලැබේ.
            </span>
          </label>
          {errors.consent && (
            <p className="mt-2 text-sm text-danger" role="alert">
              {errors.consent}
            </p>
          )}
        </fieldset>
      </div>

      {formError && (
        <div className="mt-5 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger" role="alert">
          {formError.msg}
          {formError.resume && (
            <Link href="/resume" className="mt-2 block font-semibold text-board underline">
              ලියාපදිංචි අංකයෙන් නැවත පිවිසෙන්න
            </Link>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-gold px-6 text-lg font-bold text-board-deep shadow-[inset_0_-3px_0_rgba(0,0,0,0.15)] transition hover:bg-gold-light active:translate-y-px disabled:opacity-60"
      >
        {busy && <Spinner />}
        {busy ? 'ලියාපදිංචි වෙමින්...' : 'ලියාපදිංචි වන්න'}
      </button>

      <p className="mt-5 text-center text-sm text-slate-muted">
        මීට පෙර ලියාපදිංචි වී ඇත්ද?{' '}
        <Link href="/resume" className="font-semibold text-board underline underline-offset-2">
          ලියාපදිංචි අංකයෙන් නැවත පිවිසෙන්න
        </Link>
      </p>
    </form>
  );
}
