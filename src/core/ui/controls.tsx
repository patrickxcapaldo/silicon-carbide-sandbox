import type { CSSProperties, ReactNode } from 'react';
import { InfoTip } from './InfoTip';

/** Collapsible titled group inside the Controls panel. Titles are Title Case. */
export function Section({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details className="sci-section" open={defaultOpen}>
      <summary>{title}</summary>
      <div className="sci-section__body">{children}</div>
    </details>
  );
}

/** Small uncollapsible label above a control or button list, with an optional (i). */
export function Group({ label, info, children }: { label: string; info?: string; children: ReactNode }) {
  return (
    <div className="sci-group">
      <div className="sci-label">
        {label}
        {info && <InfoTip text={info} />}
      </div>
      {children}
    </div>
  );
}

/** A row of SegButtons. */
export function SegRow({ children, wrap, tight }: { children: ReactNode; wrap?: boolean; tight?: boolean }) {
  return <div className={`sci-seg-row${wrap ? ' sci-seg-row--wrap' : ''}${tight ? ' sci-seg-row--tight' : ''}`}>{children}</div>;
}

/**
 * Binary / ternary toggle button (Orbit | Close-up, Off | On, tabs).
 * Selected = Orchid outline + soft fill + semibold.
 */
export function SegButton({ active, onClick, children, disabled, title }: { active: boolean; onClick: () => void; children: ReactNode; disabled?: boolean; title?: string }) {
  return (
    <button type="button" className="sci-seg" aria-pressed={active} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  );
}

/**
 * Left-aligned list item for scenario / orbit / reference presets. Selected
 * shows an Orchid outline, soft fill, bold text and a leading ✓, so selection
 * never relies on colour alone. `active` must be true only when the current
 * state matches exactly, so at most one button in a list is highlighted.
 */
export function PresetButton({ active, onClick, children, style }: { active: boolean; onClick: () => void; children: ReactNode; style?: CSSProperties }) {
  return (
    <button type="button" className="sci-preset" aria-pressed={active} onClick={onClick} style={style}>
      <span className="sci-preset__tick" aria-hidden="true">
        {'\u2713'}
      </span>
      <span>{children}</span>
    </button>
  );
}

/** A preset button with its explanatory (i) beside it. */
export function PresetRow({ active, onClick, children, info, infoWidth = 250 }: { active: boolean; onClick: () => void; children: ReactNode; info?: string; infoWidth?: number }) {
  return (
    <div className="sci-row">
      <PresetButton active={active} onClick={onClick}>
        {children}
      </PresetButton>
      {info && <InfoTip text={info} width={infoWidth} />}
    </div>
  );
}

export function PresetList({ children }: { children: ReactNode }) {
  return <div className="sci-preset-list">{children}</div>;
}

/** Shaded sub-card inside the panel (used for playback). */
export function PanelCard({ children }: { children: ReactNode }) {
  return <div className="sci-card">{children}</div>;
}
