
export type ValueBar = {
  id: string;
  label: string;
  /** Raw value, used for the bar length. Negative values draw as empty. */
  value: number;
  /** Formatted value with units, shown in the label. */
  display: string;
};

type Props = {
  bars: ValueBar[];
  /** Id of the single binding bar (lowest ceiling, dominant loss). It is the one Orchid bar. */
  bindingId?: string;
  /** Visible tag appended to the binding bar's label, e.g. "lowest ceiling". */
  bindingLabel?: string;
  /** A reference line drawn across every bar (e.g. requested compute). */
  marker?: { value: number; legend: string };
  ariaLabel: string;
};

/**
 * Horizontal comparison bars used by Explore (below the canvas), Challenge
 * reveals and Play. Neutral fills; the binding constraint is the one Orchid
 * highlight, flagged in words as well as colour. Flat, no glow, no animation.
 */
export function ValueBars({ bars, bindingId, bindingLabel, marker, ariaLabel }: Props) {
  const maximum = Math.max(marker?.value ?? 0, ...bars.map((b) => b.value), 1);
  const markerLeft = marker ? Math.min(100, Math.max(0, (marker.value / maximum) * 100)) : 0;
  return (
    <>
      <div className="sci-bars" aria-label={ariaLabel}>
        {bars.map((bar) => {
          const binding = bar.id === bindingId;
          const width = Math.max(1.5, (Math.max(0, bar.value) / maximum) * 100);
          return (
            <div className={`sci-bar-row${binding ? ' is-binding' : ''}`} key={bar.id}>
              <div className="sci-bar-label">
                {bar.label}: {bar.display}
                {binding && bindingLabel && <small>{bindingLabel}</small>}
              </div>
              <div className="sci-bar-track" role="img" aria-label={`${bar.label} ${bar.display}${binding && bindingLabel ? `, ${bindingLabel}` : ''}`}>
                <div className="sci-bar-fill" style={{ width: `${width}%` }} />
                {marker && <div className="sci-bar-marker" style={{ left: `${markerLeft}%` }} />}
              </div>
            </div>
          );
        })}
      </div>
      {marker && <p className="sci-bar-legend">Marker: {marker.legend}</p>}
    </>
  );
}
