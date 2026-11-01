import type { CSSProperties, ReactNode } from 'react';
import { SegButton, SegRow } from './controls';
import { InfoTip } from './InfoTip';

export type ParamMeta = {
  /** Title Case, e.g. "Perigee Altitude". Never camelCase or ALL-CAPS. */
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  description: string;
  /**
   * Map the handle through a logarithmic curve so a range spanning many
   * orders of magnitude keeps usable resolution at the low end. Needs logFloor.
   */
  logScale?: boolean;
  /** Smallest value the log curve treats as non-zero (> 0). For fields whose min is 0, the first slice of the track is a linear ramp from 0 to logFloor. */
  logFloor?: number;
};

// The underlying <input type="range"> is always linear, so a log field is
// driven by an internal 0..SLIDER_RESOLUTION handle position mapped through a
// log curve. A linear slider over 0.5 to 2e7 would crush every realistic value
// into the first pixel or two.
const SLIDER_RESOLUTION = 1000;
const ZERO_ZONE = 30;

function toSliderT(value: number, meta: ParamMeta): number {
  if (!meta.logScale || !meta.logFloor) return value;
  const zone = meta.min === 0 ? ZERO_ZONE : 0;
  if (meta.min === 0 && value <= meta.logFloor) return Math.max(0, value / meta.logFloor) * zone;
  const frac = Math.log(Math.max(value, meta.logFloor) / meta.logFloor) / Math.log(meta.max / meta.logFloor);
  return zone + frac * (SLIDER_RESOLUTION - zone);
}

function fromSliderT(t: number, meta: ParamMeta): number {
  if (!meta.logScale || !meta.logFloor) return t;
  const zone = meta.min === 0 ? ZERO_ZONE : 0;
  if (meta.min === 0 && t <= zone) return (t / zone) * meta.logFloor;
  const frac = (t - zone) / (SLIDER_RESOLUTION - zone);
  return meta.logFloor * Math.pow(meta.max / meta.logFloor, frac);
}

function roundToStep(value: number, meta: ParamMeta): number {
  const stepped = Math.round(value / meta.step) * meta.step;
  return Math.min(meta.max, Math.max(meta.min, parseFloat(stepped.toPrecision(10))));
}

export type SliderFieldProps = {
  label: ReactNode;
  /** Explanation shown by the (i). */
  info?: ReactNode;
  infoLabel?: string;
  /** Right-hand value text, already formatted with its unit. */
  display: string;
  value: number;
  min: number;
  max: number;
  step: number | 'any';
  onChange: (raw: number) => void;
  disabled?: boolean;
  /** Tooltip explaining why a control is disabled. */
  disabledHint?: string;
  ariaLabel?: string;
  /** Extra inline element beside the label (e.g. a "jump to view" tag). */
  tag?: ReactNode;
  /** Visually de-emphasise (a control that belongs to a different view) without disabling it. */
  dim?: boolean;
};

/** The one slider. Label + (i) left, value right, thin track, no gradients beyond a flat two-tone fill. */
export function SliderField({ label, info, infoLabel, display, value, min, max, step, onChange, disabled, disabledHint, ariaLabel, tag, dim }: SliderFieldProps) {
  const fill = max > min ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 0;
  return (
    <div className={`sci-slider${disabled ? ' is-disabled' : ''}${dim ? ' is-dim' : ''}`} title={disabled ? disabledHint : undefined}>
      <div className="sci-slider__head">
        <span className="sci-slider__name">
          {label}
          {info && <InfoTip label={infoLabel}>{info}</InfoTip>}
          {tag}
        </span>
        <span className="sci-slider__value">{display}</span>
      </div>
      <input
        type="range"
        aria-label={ariaLabel ?? (typeof label === 'string' ? label : undefined)}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        style={{ '--fill': `${fill}%` } as CSSProperties}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

/** Off / On parameter with the same label row as a slider. */
export function ToggleField({ label, info, infoLabel, on, onChange, tag, dim }: { label: ReactNode; info?: ReactNode; infoLabel?: string; on: boolean; onChange: (on: boolean) => void; tag?: ReactNode; dim?: boolean }) {
  return (
    <div className={`sci-slider${dim ? ' is-dim' : ''}`}>
      <div className="sci-slider__head">
        <span className="sci-slider__name">
          {label}
          {info && <InfoTip label={infoLabel}>{info}</InfoTip>}
          {tag}
        </span>
        <span className="sci-slider__value">{on ? 'On' : 'Off'}</span>
      </div>
      <SegRow>
        <SegButton active={!on} onClick={() => onChange(false)}>Off</SegButton>
        <SegButton active={on} onClick={() => onChange(true)}>On</SegButton>
      </SegRow>
    </div>
  );
}

const defaultFormat = (value: number, unit: string) => `${value.toLocaleString('en-GB', { maximumFractionDigits: 4 })}${unit ? ` ${unit}` : ''}`;

type ParamSliderProps = {
  meta: ParamMeta;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  disabledHint?: string;
  /** Turns a raw value into display text with units. Modules pass their own formatQuantity. */
  format?: (value: number, unit: string, step: number) => string;
};

/** A SliderField driven by a ParamMeta record (label, unit, range, description, optional log scale). */
export function ParamSlider({ meta, value, onChange, disabled, disabledHint, format = defaultFormat }: ParamSliderProps) {
  const log = Boolean(meta.logScale && meta.logFloor);
  return (
    <SliderField
      label={meta.label}
      info={meta.description}
      infoLabel={`About ${meta.label}`}
      display={format(value, meta.unit, meta.step)}
      value={toSliderT(value, meta)}
      min={log ? 0 : meta.min}
      max={log ? SLIDER_RESOLUTION : meta.max}
      step={log ? 1 : meta.step}
      disabled={disabled}
      disabledHint={disabledHint}
      onChange={(t) => onChange(roundToStep(fromSliderT(t, meta), meta))}
    />
  );
}
