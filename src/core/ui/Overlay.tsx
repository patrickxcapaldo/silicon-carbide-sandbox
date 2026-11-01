import type { ReactNode } from 'react';
import { InfoTip } from './InfoTip';

export type StatusTone = 'safe' | 'margin' | 'limit' | 'fail';

/**
 * Collapsible panel floating over the canvas so people can always get to the
 * unobstructed scene. 'intro' sits top-left, 'telemetry' along the bottom.
 */
export function Overlay({ variant, title, children, label }: { variant: 'intro' | 'telemetry'; title: string; children: ReactNode; label?: string }) {
  return (
    <details open className={`sci-overlay sci-overlay--${variant}`} aria-label={label}>
      <summary>{title}</summary>
      {variant === 'intro' ? <div>{children}</div> : children}
    </details>
  );
}

export function MetricGrid({ children, variant = 'telemetry' }: { children: ReactNode; variant?: 'telemetry' | 'readouts' }) {
  return <div className={variant === 'telemetry' ? 'sci-telemetry-grid' : 'sci-metrics'}>{children}</div>;
}

/** One number with its label. Values carry units. `status` colours the value with a model-status colour only. `highlight` outlines the one card that applies right now (the single Orchid item in a group). */
export function Metric({ label, value, info, note, status, infoPlacement = 'above', highlight, children }: { label: ReactNode; value: ReactNode; info?: string; note?: ReactNode; status?: StatusTone; infoPlacement?: 'above' | 'below'; highlight?: boolean; children?: ReactNode }) {
  return (
    <div className={`sci-metric${highlight ? ' is-highlight' : ''}`}>
      <span className="sci-metric__label">
        {label}
        {info && <InfoTip text={info} placement={infoPlacement} />}
      </span>
      <strong className="sci-metric__value" data-status={status}>
        {value}
      </strong>
      {children}
      {note && <span className="sci-metric__note">{note}</span>}
    </div>
  );
}

/** Model status: flat dot and label in the matching status colour, with its explanation. */
export function StatusBadge({ tone, label, info }: { tone: StatusTone; label: string; info?: string }) {
  return (
    <span className="sci-status" data-status={tone}>
      <span className="sci-status__dot" aria-hidden="true" />
      {label}
      {info && <InfoTip text={info} width={240} placement="above" />}
    </span>
  );
}
