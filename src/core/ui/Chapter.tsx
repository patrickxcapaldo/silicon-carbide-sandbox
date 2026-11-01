import { useEffect, useRef, type ReactNode } from 'react';
import katex from 'katex';

/**
 * The textbook half of a module page, in the order the North Star fixes:
 * the question, concepts and equations, a worked example, then limits.
 * Constrained to ~780px and centred. Put an `id="module-tool"` target after it
 * (ModuleModes does) so the skip link has somewhere to go.
 */
export function Chapter({ children }: { children: ReactNode }) {
  return (
    <article className="sci-chapter">
      <a className="sci-chapter__skip" href="#module-tool">
        Skip to tool
      </a>
      {children}
    </article>
  );
}

/** Display-mode KaTeX equation. */
export function Equation({ latex }: { latex: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) katex.render(latex, ref.current, { throwOnError: false, displayMode: true });
  }, [latex]);
  return <div className="sci-equation" ref={ref} />;
}

/** "Show the working" disclosure. */
export function Working({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="sci-working">
      <summary>{summary}</summary>
      {children}
    </details>
  );
}

/** Labelled values for a worked example. Values must carry units. */
export function Facts({ items }: { items: [label: string, value: ReactNode][] }) {
  return (
    <dl className="sci-facts">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Grid of small titled cards (e.g. the three ceilings, the three losses). */
export function CardGrid({ children, columns = 3 }: { children: ReactNode; columns?: 2 | 3 }) {
  return <div className={`sci-cards${columns === 3 ? ' sci-cards--3' : ''}`}>{children}</div>;
}

/** The one sentence the reader should leave with. Orchid rule on the left. */
export function Callout({ children }: { children: ReactNode }) {
  return <p className="sci-callout">{children}</p>;
}
