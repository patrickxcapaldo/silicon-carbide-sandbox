import { InfoTip } from './InfoTip';
import type { ParamMeta } from './paramMeta';
import { formatQuantity } from './format';

type Props = {
  meta: ParamMeta;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  disabledHint?: string;
};

// The underlying <input type="range"> is always linear, so for a
// logScale field we drive it with an internal 0..SLIDER_RESOLUTION handle
// position and map that through a log curve to the real value, rather
// than setting min/max/step to the field's real (and, for radiator area,
// compute power etc., now up to seven-decade-wide) range directly. A
// linear slider over a range like 0.5 to 2e7 gives almost no usable
// resolution below a few thousand -- nearly the whole track would
// represent values in the millions, and every value that actually shows
// up in a realistic single-node scenario would be crushed into the first
// pixel or two.
const SLIDER_RESOLUTION = 1000;
// For fields whose true minimum is 0 (compute power, parasitic heat), the
// leftmost slice of the track is reserved as a linear ramp from 0 up to
// meta.logFloor, since log(0) is undefined; the rest of the track is a
// pure log curve from logFloor to max. For fields whose real minimum is
// already > 0 (radiator area, solar area, coolant flow -- where logFloor
// equals meta.min), there's nothing to reserve and this is unused.
const ZERO_ZONE = 30;

function toSliderT(value: number, meta: ParamMeta): number {
  if (!meta.logScale || !meta.logFloor) return value;
  const hasZero = meta.min === 0;
  const zoneOffset = hasZero ? ZERO_ZONE : 0;
  if (hasZero && value <= meta.logFloor) {
    return Math.max(0, value / meta.logFloor) * zoneOffset;
  }
  const frac = Math.log(Math.max(value, meta.logFloor) / meta.logFloor) / Math.log(meta.max / meta.logFloor);
  return zoneOffset + frac * (SLIDER_RESOLUTION - zoneOffset);
}

function fromSliderT(t: number, meta: ParamMeta): number {
  if (!meta.logScale || !meta.logFloor) return t;
  const hasZero = meta.min === 0;
  const zoneOffset = hasZero ? ZERO_ZONE : 0;
  if (hasZero && t <= zoneOffset) {
    return (t / zoneOffset) * meta.logFloor;
  }
  const frac = (t - zoneOffset) / (SLIDER_RESOLUTION - zoneOffset);
  return meta.logFloor * Math.pow(meta.max / meta.logFloor, frac);
}

function roundToStep(value: number, meta: ParamMeta): number {
  const stepped = Math.round(value / meta.step) * meta.step;
  return Math.min(meta.max, Math.max(meta.min, parseFloat(stepped.toPrecision(10))));
}

export function ParamSlider({ meta, value, onChange, disabled, disabledHint }: Props) {
  const sliderMin = meta.logScale && meta.logFloor ? 0 : meta.min;
  const sliderMax = meta.logScale && meta.logFloor ? SLIDER_RESOLUTION : meta.max;
  const sliderStep = meta.logScale && meta.logFloor ? 1 : meta.step;
  const sliderValue = toSliderT(value, meta);

  return (
    <label style={{ display: 'block', marginBottom: 11, opacity: disabled ? 0.5 : 1 }} title={disabled ? disabledHint : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 3, color: '#cfe7f7' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {meta.label}
          <InfoTip text={meta.description} />
        </span>
        <span style={{ fontVariantNumeric: 'tabular-nums', color: '#9fd2ef' }}>{formatQuantity(value, meta.unit, meta.step)}</span>
      </div>
      <input
        type="range"
        min={sliderMin}
        max={sliderMax}
        step={sliderStep}
        value={sliderValue}
        disabled={disabled}
        onChange={(e) => onChange(roundToStep(fromSliderT(parseFloat(e.target.value), meta), meta))}
        style={{ width: '100%', accentColor: '#4fb3ff', cursor: disabled ? 'not-allowed' : 'pointer' }}
      />
    </label>
  );
}
