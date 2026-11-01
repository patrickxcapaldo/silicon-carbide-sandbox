
export type StackSegment = {
  id: string;
  label: string;
  /** Share of the whole, 0 to 100. */
  percent: number;
  /** Formatted value with units for the legend and tooltip. */
  display: string;
  /** Marks the single dominant segment, drawn in Orchid. Others take neutral series shades in order. */
  binding?: boolean;
};

/** Stacked budget bar with a legend. Neutral series shades; the dominant item alone is Orchid. */
export function StackedBar({ segments, ariaLabel }: { segments: StackSegment[]; ariaLabel: string }) {
  const cls = (s: StackSegment, i: number) => (s.binding ? 'series-binding' : `series-${(i % 4) + 1}`);
  return (
    <div>
      <div className="sci-stack" role="img" aria-label={ariaLabel}>
        {segments.map((s, i) => (
          <i key={s.id} className={cls(s, i)} title={`${s.label}: ${s.display}`} style={{ width: `${Math.max(0, Math.min(100, s.percent))}%` }} />
        ))}
      </div>
      <ul className="sci-legend">
        {segments.map((s, i) => (
          <li key={s.id}>
            <span className={`sci-swatch ${cls(s, i)}`} aria-hidden="true" />
            {s.label}
            <b>{s.display}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
