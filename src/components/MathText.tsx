import { Fragment } from 'react';

/**
 * Renders question text with light maths markup:
 *   [[5/6]]                     stacked fraction
 *   [[(+6) × (−4)/(−3) × (−2)]]  stacked fraction (split at the first "/")
 *   [[√196]]                    square root with an overbar
 * Anything else is plain text (use ² ³ ° × ÷ − ≤ ≥ directly).
 */
export function MathText({ text }: { text: string }) {
  const parts = text.split(/(\[\[[^\]]+\]\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\[\[([^\]]+)\]\]$/);
        if (!m) return <Fragment key={i}>{part}</Fragment>;
        const inner = m[1].trim();

        if (inner.startsWith('√')) {
          return (
            <span key={i} className="math-sqrt" role="math" aria-label={`වර්ගමූලය ${inner.slice(1)}`}>
              <span className="math-sqrt-sign" aria-hidden>√</span>
              <span className="math-sqrt-body">{inner.slice(1).trim()}</span>
            </span>
          );
        }

        const slash = inner.indexOf('/');
        if (slash > 0) {
          const num = inner.slice(0, slash).trim();
          const den = inner.slice(slash + 1).trim();
          return (
            <span key={i} className="math-frac" role="math" aria-label={`${num} ÷ ${den}`}>
              <span className="math-frac-num">{num}</span>
              <span className="math-frac-den">{den}</span>
            </span>
          );
        }
        return <Fragment key={i}>{inner}</Fragment>;
      })}
    </>
  );
}
