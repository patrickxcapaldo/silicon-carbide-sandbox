import { InfoTip } from './InfoTip';
import type { ParamMeta } from './paramMeta';

type Props = {
  meta: ParamMeta;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  disabledHint?: string;
};

function formatValue(value: number, step: number, unit: string) {
  const decimals = step >= 1 ? 0 : Math.min(2, (String(step).split('.')[1] || '').length);
  const num = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
  return unit ? `${num} ${unit}` : num;
}

export function ParamSlider({ meta, value, onChange, disabled, disabledHint }: Props) {
  return (
    <label style={{ display: 'block', marginBottom: 11, opacity: disabled ? 0.5 : 1 }} title={disabled ? disabledHint : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 3, color: '#cfe7f7' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {meta.label}
          <InfoTip text={meta.description} />
        </span>
        <span style={{ fontVariantNumeric: 'tabular-nums', color: '#9fd2ef' }}>{formatValue(value, meta.step, meta.unit)}</span>
      </div>
      <input
        type="range"
        min={meta.min}
        max={meta.max}
        step={meta.step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#4fb3ff', cursor: disabled ? 'not-allowed' : 'pointer' }}
      />
    </label>
  );
}
