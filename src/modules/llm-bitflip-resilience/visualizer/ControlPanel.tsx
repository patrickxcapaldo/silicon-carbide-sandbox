import { INPUT_SPECS } from '../sandbox/module';
import { ALPHA_PRESETS, CRUISE_RATE_RANGE_FLIPS_PER_GB_MONTH } from '../sandbox/kernel';
import { alphaDataRange } from './series';
import { MODELS } from '../data/radiai-measured';
import { ControlsPanel, Group, PresetButton, PresetList, Section, SliderField, ToggleField } from '../../../core/ui';
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


function Slider({ k, value, onChange, jump }: { k: string; value: number; onChange: (v: number) => void; jump: { label: string; go: () => void } | null }) {
  const spec = INPUT_SPECS.find((s) => s.key === k)!;
  const scale = SLIDER_SCALE[k] ?? 'linear';
  const curved = scale !== 'linear';
  const isToggle = spec.max === 1 && spec.min === 0 && (k === 'eccEnabled' || k === 'assumeCleanAtZero');
  const min = spec.min!;
  const max = spec.max!;
  const tag = jump ? (
    <button type="button" className="sci-tag-btn" onClick={jump.go}>
      {'\u2192'} {jump.label}
    </button>
  ) : undefined;
  if (isToggle) {
    return <ToggleField label={TITLE[k]} info={spec.description} infoLabel={`About ${TITLE[k]}`} on={value >= 0.5} onChange={(on) => onChange(on ? 1 : 0)} tag={tag} dim={Boolean(jump)} />;
  }
  return (
    <SliderField
      label={TITLE[k]}
      info={spec.description}
      infoLabel={`About ${TITLE[k]}`}
      tag={tag}
      dim={Boolean(jump)}
      display={`${fmtNumber(value, 4)} ${spec.unit}`}
      value={curved ? valueToSlider(value, min, max, scale) : value}
      min={curved ? 0 : min}
      max={curved ? 1 : max}
      step={curved ? 0.001 : (SLIDER_STEP[k] ?? (max - min) / 400)}
      onChange={(p) => onChange(curved ? sliderToValue(p, min, max, scale, SLIDER_STEP[k]) : p)}
    />
  );
}

export function ControlPanel({ inputs, view, onChange, onJump, viewLabel, onReset, onExport }: { inputs: Record<string, number>; view: string; onChange: (k: string, v: number) => void; onJump: (view: string) => void; viewLabel: (view: string) => string; onReset: () => void; onExport: () => void }) {
  const rate = inputs.upsetRateFlipsPerGbMonth;
  const [rLo, rHi] = CRUISE_RATE_RANGE_FLIPS_PER_GB_MONTH;
  const rateInside = rate >= rLo && rate <= rHi;
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-3;
  const [aLo, aHi] = alphaDataRange();
  const alphaInside = inputs.toleranceExponent >= aLo - 1e-9 && inputs.toleranceExponent <= aHi + 1e-9;
  const jumpFor = (k: string) => { const home = CONTROL_HOME_VIEW[k]; return home && home !== view ? { label: viewLabel(home), go: () => onJump(home) } : null; };
  return (
    <ControlsPanel onExport={onExport} onReset={onReset}>
      <Group label="Presets" info="Presets are shortcuts that set one slider each. The three groups below set three different sliders (model size, tolerance exponent α, upset rate), so you can pick one from each group and they combine. A tick marks the preset that matches the slider’s current value; moving the slider by hand clears it.">
        <p className="sci-hint">One choice per group. Groups are independent and combine.</p>
        <p className="sci-hint">Model size {'\u2192'} sets Model Parameters</p>
        <PresetList>
          <PresetButton active={near(inputs.modelParamsBillions, MODELS.A.paramsBillions)} onClick={() => onChange('modelParamsBillions', MODELS.A.paramsBillions)}>{MODELS.A.uiName}</PresetButton>
          <PresetButton active={near(inputs.modelParamsBillions, MODELS.B.paramsBillions)} onClick={() => onChange('modelParamsBillions', MODELS.B.paramsBillions)}>{MODELS.B.uiName}</PresetButton>
        </PresetList>
        <p className="sci-hint" style={{ marginTop: 8 }}>Tolerance exponent {'\u2192'} sets α</p>
        <PresetList>
          {ALPHA_PRESETS.map((p) => <PresetButton key={p.id} active={near(inputs.toleranceExponent, p.alpha)} onClick={() => onChange('toleranceExponent', p.alpha)}>α = {p.alpha}: {p.label}</PresetButton>)}
        </PresetList>
        <p className="sci-hint" style={{ marginTop: 8 }}>Upset rate {'\u2192'} sets flips/GB/month</p>
        <PresetList>
          {[0.01, 0.1, 1, 10].map((r) => <PresetButton key={r} active={near(rate, r)} onClick={() => onChange('upsetRateFlipsPerGbMonth', r)}>{r} flips/GB/month (illustrative cruise range)</PresetButton>)}
        </PresetList>
      </Group>
      {GROUPS.map((g) => (
        <Section key={g.title} title={g.title} defaultOpen>
          {g.keys.map((k) => (
            <div key={k}>
              <Slider k={k} value={inputs[k]} onChange={(v) => onChange(k, v)} jump={jumpFor(k)} />
              {k === 'toleranceExponent' && <div className={alphaInside ? 'bfr-region ok' : 'bfr-region warn'}>{alphaInside ? `Inside the range the two measured models imply, ${aLo.toFixed(2)}–${aHi.toFixed(2)}.` : `Outside the range the two measured models imply (${aLo.toFixed(2)}–${aHi.toFixed(2)}): a hypothesis, not a fit.`}</div>}
              {k === 'bytesPerParam' && inputs.bytesPerParam !== 2 && <div className="bfr-region warn">Not FP16. Only the exposed memory changes, so time to tolerance scales as 1 / bytes. This is not a quantisation result.</div>}
              {k === 'upsetRateFlipsPerGbMonth' && <div className={rateInside ? 'bfr-region ok' : 'bfr-region warn'}>{rateInside ? `Inside the paper’s illustrative range, ${rLo}–${rHi} flips/GB/month (citing JESD89A).` : 'User-defined, unvalidated: outside the paper’s illustrative range.'}</div>}
            </div>
          ))}
        </Section>
      ))}
    </ControlsPanel>
  );
}
