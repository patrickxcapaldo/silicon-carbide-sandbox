import type { ReactNode } from 'react';

/**
 * Below-canvas breakdown (compute ceilings, loss bars, full results). Sits
 * outside and under the Explore canvas as a sibling <details>. Follows the
 * page theme, unlike the canvas.
 */
export function DetailsPanel({ title, children, defaultOpen = true, label, prose }: { title: string; children: ReactNode; defaultOpen?: boolean; label?: string; prose?: boolean }) {
  return (
    <details className={`sci-details${prose ? ' sci-details--prose' : ''}`} open={defaultOpen} aria-label={label}>
      <summary>{title}</summary>
      {children}
    </details>
  );
}
