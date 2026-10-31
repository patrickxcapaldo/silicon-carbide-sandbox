import { useState, type ReactNode } from 'react';
import { INPUT_SPECS } from '../sandbox/module';
import { ALPHA_PRESETS, CRUISE_RATE_RANGE_FLIPS_PER_GB_MONTH } from '../sandbox/kernel';
import { MODELS } from '../data/radiai-measured';
import { fmtNumber } from './format';
import { CONTROL_HOME_VIEW, SLIDER_SCALE, SLIDER_STEP, sliderToValue, valueToSlider } from './series';

const TITLE: Record<string, string> = {
  modelParamsBillions: 'Model Parameters', bytesPerParam: 'Bytes Per Parameter', upsetRateFlipsPerGbMonth: 'Upset Rate',
  scrubIntervalDays: 'Scrub Or Reload Interval', toleranceExponent: 'Tolerance Exponent α', weightMagnitude: 'Weight Magnitude',
  injectedFlips: 'Injected Flips', eccEnabled: 'SECDED ECC (Analytic)', mbuFraction: 'Multi-Bit Upset Fraction',
  memoryWPerGb: 'Memory Power', assumeCleanAtZero: 'Assume Clean At Zero',
};
const GROUPS: { title: string; keys: string[] }[] = [
  { title: 'Weight Store', keys: ['modelParamsBillions', 'bytesPerParam', 'memoryWPerGb'] },
  { title: 'Exposure (User-Set, Not A Flux Model)', keys: ['upsetRateFlipsPerGbMonth', 'scrubIntervalDays', 'eccEnabled', 'mbuFraction'] },
  { title: 'Tolerance (Assumed)', keys: ['toleranceExponent', 'assumeCleanAtZero'] },
  { title: 'Dose View', keys: ['injectedFlips', 'weightMagnitude'] },
];

const btn: React.CSSProperties = { height: 32, minHeight: 32, boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, cursor: 'pointer', fontSize: 12, padding: '0 12px' };

export function SegButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} style={{ ...btn, height: 28, minHeight: 28, border: active ? '1px solid #4fb3ff' : '1px solid rgba(255,255,255,.18)', background: active ? 'rgba(79,179,255,.22)' : 'transparent', color: active ? '#eaf6ff' : '#9fb7c9', fontWeight: active ? 600 : 400 }}>{children}</button>
  );
}

function PresetButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{ ...btn, justifyContent: 'flex-start', textAlign: 'left', width: '100%', border: active ? '1px solid #4fb3ff' : '1px solid rgba(255,255,255,.2)', background: active ? 'rgba(79,179,255,.28)' : 'rgba(79,179,255,.08)', color: active ? '#fff' : '#dff1ff', fontWeight: active ? 700 : 400, boxShadow: active ? '0 0 0 1px rgba(79,179,255,.35)' : undefined, minHeight: 28, height: 'auto', padding: '5px 10px' }}>{active ? '✓ ' : ''}{children}</button>
  );
}

function Slider({ k, value, onChange, jump }: { k: string; value: number; onChange: (v: number) => void; jump: { label: string; go: () => void } | null }) {
  const spec = INPUT_SPECS.find((s) => s.key === k)!;
  const scale = SLIDER_SCALE[k] ?? 'linear';
  const curved = scale !== 'linear';
  const isToggle = spec.max === 1 && spec.min === 0 && (k === 'eccEnabled' || k === 'assumeCleanAtZero');
  const min = spec.min!;
  const max = spec.max!;
  return (
    <div className={jump ? 'bfr-ctl bfr-dim' : 'bfr-ctl'}>
      <div className="bfr-ctl-head"><span title={spec.description}>{TITLE[k]}{jump && <button type="button" className="bfr-ctl-tag" onClick={jump.go}>→ {jump.label}</button>}</span><span className="bfr-ctl-val">{isToggle ? (value >= 0.5 ? 'On' : 'Off') : `${fmtNumber(value, 4)} ${spec.unit}`}</span></div>
      {isToggle ? (
        <div style={{ display: 'flex', gap: 6 }}><SegButton active={value < 0.5} onClick={() => onChange(0)}>Off</SegButton><SegButton active={value >= 0.5} onClick={() => onChange(1)}>On</SegButton></div>
      ) : (
        <input type="range" aria-label={TITLE[k]} min={curved ? 0 : min} max={curved ? 1 : max} step={curved ? 0.001 : (SLIDER_STEP[k] ?? (max - min) / 400)}
          value={curved ? valueToSlider(value, min, max, scale) : value}
          onChange={(e) => { const p = parseFloat(e.target.value); onChange(curved ? sliderToValue(p, min, max, scale, SLIDER_STEP[k]) : p); }} />
      )}
      <div className="bfr-ctl-desc">{spec.description}</div>
    </div>
  );
}

export function ControlPanel({ inputs, view, onChange, onJump, viewLabel, onReset, onExport }: { inputs: Record<string, number>; view: string; onChange: (k: string, v: number) => void; onJump: (view: string) => void; viewLabel: (view: string) => string; onReset: () => void; onExport: () => void }) {
  const [open, setOpen] = useState(true);
  const rate = inputs.upsetRateFlipsPerGbMonth;
  const [rLo, rHi] = CRUISE_RATE_RANGE_FLIPS_PER_GB_MONTH;
  const rateInside = rate >= rLo && rate <= rHi;
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-3;
  const jumpFor = (k: string) => { const home = CONTROL_HOME_VIEW[k]; return home && home !== view ? { label: viewLabel(home), go: () => onJump(home) } : null; };
  return (
    <aside className="bfr-controls" aria-label="Controls">
      <div className="bfr-controls-head">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Collapse controls' : 'Expand controls'} style={{ ...btn, width: 32, padding: 0, border: '1px solid rgba(255,255,255,.2)', background: 'transparent', color: '#cbd9e8' }}>{open ? '▼' : '▶'}</button>
        <h3>Controls</h3>
      </div>
      {open && (
        <div className="bfr-controls-body">
          <div className="bfr-ctl-group"><h4>Presets</h4>
            <PresetButton active={near(inputs.modelParamsBillions, MODELS.A.paramsBillions)} onClick={() => onChange('modelParamsBillions', MODELS.A.paramsBillions)}>{MODELS.A.uiName}</PresetButton>
            <PresetButton active={near(inputs.modelParamsBillions, MODELS.B.paramsBillions)} onClick={() => onChange('modelParamsBillions', MODELS.B.paramsBillions)}>{MODELS.B.uiName}</PresetButton>
            {ALPHA_PRESETS.map((p) => <PresetButton key={p.id} active={near(inputs.toleranceExponent, p.alpha)} onClick={() => onChange('toleranceExponent', p.alpha)}>α = {p.alpha}: {p.label}</PresetButton>)}
            {[0.01, 0.1, 1, 10].map((r) => <PresetButton key={r} active={near(rate, r)} onClick={() => onChange('upsetRateFlipsPerGbMonth', r)}>{r} flips/GB/month (illustrative cruise range)</PresetButton>)}
          </div>
          {GROUPS.map((g) => (
            <div key={g.title} className="bfr-ctl-group"><h4>{g.title}</h4>
              {g.keys.map((k) => (
                <div key={k}>
                  <Slider k={k} value={inputs[k]} onChange={(v) => onChange(k, v)} jump={jumpFor(k)} />
                  {k === 'upsetRateFlipsPerGbMonth' && <div className={rateInside ? 'bfr-region ok' : 'bfr-region warn'}>{rateInside ? `Inside the paper’s illustrative range, ${rLo}–${rHi} flips/GB/month (citing JESD89A).` : 'User-defined, unvalidated: outside the paper’s illustrative range.'}</div>}
                </div>
              ))}
            </div>
          ))}
          <div className="bfr-ctl-actions">
            <button type="button" onClick={onExport} style={{ ...btn, border: 0, background: 'var(--accent)', color: '#ffffff', fontWeight: 600 }}>Export</button>
            <button type="button" onClick={onReset} style={{ ...btn, background: 'transparent', border: '1px solid rgba(255,255,255,.2)', color: '#cbd9e8' }}>Reset</button>
          </div>
        </div>
      )}
    </aside>
  );
}
