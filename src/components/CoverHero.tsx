import { BRAND } from '@/lib/brand';

/**
 * The Facebook-cover look, rebuilt with live text so the batch/year can
 * change without editing an image. The right-hand photo + glow ring +
 * lightning is the original cover art (public/brand/cover-art.jpg).
 */
export function CoverHero({ compact = false, rounded = false }: { compact?: boolean; rounded?: boolean }) {
  return (
    <section
      className={`storm pt-safe relative isolate overflow-hidden text-white ${rounded ? 'lg:rounded-3xl' : ''} ${
        compact ? 'min-h-[112px] sm:min-h-[132px]' : 'min-h-[236px] xs:min-h-[250px] sm:min-h-[300px] lg:min-h-[340px]'
      }`}
    >
      {!compact && <Bolt className="absolute right-[30%] top-0 -z-10 hidden h-[90%] opacity-60 md:block lg:right-[27%]" />}

      {/* Original cover art, faded into the storm on its left edge */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BRAND.coverArt}
        alt={BRAND.teacher}
        className="cover-art-fade absolute inset-y-0 right-0 -z-10 h-full w-auto max-w-[48%] object-cover object-left sm:max-w-none"
      />

      <div className={`relative mx-auto flex h-full max-w-6xl flex-col justify-center ${compact ? 'px-4 py-3 sm:px-6' : 'px-4 py-6 sm:px-8 sm:py-8 lg:px-12'}`}>
        <div className={compact ? 'max-w-[62%]' : 'max-w-[60%] sm:max-w-[58%]'}>
          <p className={`cover-yellow font-display font-bold leading-tight ${compact ? 'text-[0.95rem] sm:text-xl' : 'text-[1.05rem] xs:text-lg sm:text-3xl lg:text-[2.6rem]'}`} lang="en">
            {BRAND.coverTitle}
          </p>
          <p className={`cover-white font-display font-bold leading-[1.05] ${compact ? 'text-[1.7rem] sm:text-4xl' : 'mt-0.5 text-[2.15rem] xs:text-[2.4rem] sm:text-6xl lg:text-7xl'}`} lang="en">
            {BRAND.name}
          </p>

          {!compact && (
            <>
              <div className="glow-rule my-3 sm:my-5" aria-hidden />
              <a
                href={BRAND.whatsappHref}
                className="flex items-center gap-2 font-display text-[0.95rem] font-semibold xs:text-base sm:text-2xl lg:text-3xl"
                lang="en"
              >
                <WhatsAppIcon className="h-5 w-5 shrink-0 sm:h-7 sm:w-7" />
                <span className="hidden sm:inline">WhatsApp / Call :</span>
                <span className="tabular">{BRAND.phone}</span>
              </a>
              <p className="mt-1.5 flex items-center gap-2 font-display text-[0.9rem] font-semibold text-white/90 xs:text-[0.95rem] sm:mt-3 sm:text-xl lg:text-2xl" lang="en">
                <ZoomIcon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
                {BRAND.mode}
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Bolt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 400" preserveAspectRatio="xMidYMin meet" className={className} aria-hidden>
      <defs>
        <filter id="bolt-glow" x="-50%" y="-10%" width="200%" height="120%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M78 0 L64 70 L80 78 L52 160 L70 166 L38 262 L58 268 L22 400 M64 70 L96 112 M52 160 L20 196 M38 262 L74 318"
        fill="none"
        stroke="#F4FFF6"
        strokeWidth="2.2"
        strokeLinejoin="round"
        filter="url(#bolt-glow)"
      />
    </svg>
  );
}

function WhatsAppIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2c0 1.3.9 2.5 1.1 2.7.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.6-.3z" />
    </svg>
  );
}

function ZoomIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#fff" />
      <path d="M6 9.2c0-.7.5-1.2 1.2-1.2h5.6c.7 0 1.2.5 1.2 1.2v5.6c0 .7-.5 1.2-1.2 1.2H7.2C6.5 16 6 15.5 6 14.8V9.2zm8.8 1.6 3.2-2.1v6.6l-3.2-2.1v-2.4z" fill="#082A1F" />
    </svg>
  );
}
