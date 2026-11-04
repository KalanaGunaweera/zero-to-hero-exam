'use client';
import type { Question } from '@/lib/types';
import type { SaveState } from './useAnswerSaver';

/** Question navigator styled like an OMR answer sheet: bubbles fill when answered. */
export function AnswerSheet({
  questions,
  current,
  selected,
  status,
  onPick,
}: {
  questions: Question[];
  current: number;
  selected: Record<string, number>;
  status: Record<string, SaveState>;
  onPick: (index: number) => void;
}) {
  return (
    <div>
      <ol className="grid grid-cols-5 gap-2 sm:gap-2.5" aria-label="ප්‍රශ්න ලැයිස්තුව">
        {questions.map((q, i) => {
          const answered = selected[q.id] != null;
          const st = status[q.id];
          const isCurrent = i === current;
          const label = `ප්‍රශ්නය ${q.number}${answered ? ' – පිළිතුරු දී ඇත' : ' – පිළිතුරු නොදී ඇත'}`;
          return (
            <li key={q.id}>
              <button
                type="button"
                onClick={() => onPick(i)}
                aria-label={label}
                aria-current={isCurrent ? 'step' : undefined}
                className={[
                  'relative grid aspect-square w-full min-h-[44px] place-items-center rounded-full border-2 text-base font-bold tabular transition-colors',
                  answered
                    ? 'border-board bg-board text-gold-light'
                    : 'border-board/30 bg-white text-board hover:border-board',
                  isCurrent ? 'ring-[3px] ring-gold ring-offset-2 ring-offset-white' : '',
                ].join(' ')}
              >
                {q.number}
                {answered && st && st !== 'saved' && (
                  <span
                    className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white ${st === 'retrying' ? 'bg-danger' : 'bg-gold animate-pulse'}`}
                    aria-hidden
                  />
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-muted">
        <li className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded-full border-2 border-board bg-board" aria-hidden />
          පිළිතුරු දී ඇත
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded-full border-2 border-board/30 bg-white" aria-hidden />
          පිළිතුරු නොදී ඇත
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded-full border-2 border-board/30 bg-white ring-2 ring-gold ring-offset-1" aria-hidden />
          වත්මන් ප්‍රශ්නය
        </li>
      </ul>
    </div>
  );
}
