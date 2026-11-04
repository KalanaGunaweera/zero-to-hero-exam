'use client';
import { useEffect, useRef, useState } from 'react';
import { BRAND } from '@/lib/brand';
import { CoverHero } from './CoverHero';

export function Logo({ size = 44 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={BRAND.logo} width={size} height={size} alt="" className="shrink-0 rounded-[22%]" />;
}

/** Teacher photo; falls back to gold initials until /public/brand/teacher.jpg is added. */
export function TeacherPhoto({ size = 56, className = '' }: { size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // The image can fail before React hydrates (onError never fires) – check on mount
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);
  const style = { width: size, height: size };
  if (failed) {
    return (
      <div
        style={style}
        className={`grid shrink-0 place-items-center rounded-full bg-gold font-bold text-board-deep ring-2 ring-gold-light/60 ${className}`}
        aria-label={BRAND.teacher}
      >
        <span style={{ fontSize: size * 0.36 }}>KG</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={img}
      src={BRAND.teacherPhoto}
      alt={BRAND.teacher}
      style={style}
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full object-cover ring-2 ring-gold ${className}`}
    />
  );
}

/** Header used on instructions, resume and result pages: compact Facebook-cover banner */
export function BrandBand() {
  return <CoverHero compact />;
}

export function BrandFooter() {
  return (
    <footer className="mt-10 border-t border-board/10 py-6 text-center text-xs text-slate-muted">
      <p>
        <span lang="en" className="font-semibold text-board">{BRAND.name}</span> | {BRAND.teacher} | {BRAND.modeSi}
      </p>
      <p className="mt-1">
        විමසීම්: <a className="font-semibold text-board underline-offset-2 hover:underline" href={BRAND.phoneHref}>{BRAND.phone}</a>
      </p>
    </footer>
  );
}
