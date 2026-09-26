import { useRef } from 'react';
import type { ReactNode } from 'react';
import type { ThermalState } from './types';
import type { CameraFocus, ViewMode } from './ThermalScene';
import { ParamSlider } from './ParamSlider';
import { InfoTip, PanelBoundsProvider } from './InfoTip';
import { PARAM_META } from './paramMeta';
import { ORBIT_PRESETS, type OrbitPreset } from './orbitPresets';
import { SCENARIO_PRESETS, type ScenarioPreset } from './scenarioPresets';
import { COMPUTE_REFERENCES } from './computeReference';
import { SPEED_OPTIONS, formatDuration, type SpeedMultiplier } from './useOrbitClock';

type Props = {
  state: ThermalState;
  onChange: (key: keyof ThermalState, value: number) => void;
  onApplyOrbitPreset: (preset: OrbitPreset) => void;
  onApplyScenario: (scenario: ScenarioPreset) => void;
  /** Id of the scenario preset that produced the current state exactly, or null if none does (including after any manual edit). */
  selectedScenarioId: string | null;
  /** Id of the orbit preset whose fields the current state still matches exactly, or null if none does. */
  selectedOrbitPresetId: string | null;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  cameraFocus: CameraFocus;
  setCameraFocus: (f: CameraFocus) => void;
  playing: boolean;
  setPlaying: (p: boolean) => void;
  speed: SpeedMultiplier;
  setSpeed: (s: SpeedMultiplier) => void;
  periodSeconds: number;
  secondsPerOrbitAtSpeed: number;
};

const ORBIT_KEYS: (keyof ThermalState)[] = ['orbitAltitudeKm', 'orbitEccentricity', 'orbitInclinationDeg', 'orbitRaanDeg', 'orbitArgumentDeg', 'orbitPhaseDeg'];
const RADIATOR_KEYS: (keyof ThermalState)[] = ['radiatorArea', 'operatingTempC', 'emissivity', 'solarAbsorptivity', 'sinkTempK', 'earthIrTempK', 'earthAlbedo', 'earthViewFactor', 'coolantDeltaT', 'flowRateKgS', 'parasiticHeatW'];
const SOLAR_KEYS: (keyof ThermalState)[] = ['solarPanelAreaM2', 'solarPanelEfficiency', 'solarPanelPointingFactor'];
const ENV_KEYS: (keyof ThermalState)[] = ['solarLoadWm2', 'sunIncidence'];
const SPACECRAFT_KEYS: (keyof ThermalState)[] = ['satelliteTempC'];

function SegButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1, padding: '5px 8px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
        border: `1px solid ${active ? '#4fb3ff' : 'rgba(255,255,255,.18)'}`,
        background: active ? 'rgba(79,179,255,.22)' : 'transparent',
        color: active ? '#eaf6ff' : '#9fb7c9', fontWeight: active ? 600 : 400,
      }}
    >{children}</button>
  );
}

/**
 * A left-aligned, full-width button for an item in a preset/reference list
 * (scenario presets, orbit presets, compute references), with a visibly
 * distinct selected state: a brighter border, a tinted background, a
 * checkmark, and bold text, rather than relying on border colour alone.
 * `active` should be true only when the current state exactly matches what
 * this button would set, so at most one button in a given list is
 * highlighted at a time.
 */
function PresetButton({ active, onClick, children, fontSize = 11 }: { active: boolean; onClick: () => void; children: ReactNode; fontSize?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        flex: 1, textAlign: 'left', padding: '6px 8px', borderRadius: 6, fontSize,
        display: 'flex', alignItems: 'center', gap: 6,
        border: `1px solid ${active ? '#4fb3ff' : 'rgba(255,255,255,.2)'}`,
        background: active ? 'rgba(79,179,255,.28)' : 'rgba(79,179,255,.08)',
        color: active ? '#ffffff' : '#dff1ff',
        fontWeight: active ? 700 : 400,
        boxShadow: active ? '0 0 0 1px rgba(79,179,255,.35)' : 'none',
        cursor: 'pointer',
      }}
    >
      <span style={{ width: 12, flexShrink: 0, opacity: active ? 1 : 0, color: '#4fb3ff' }}>{'\u2713'}</span>
      <span>{children}</span>
    </button>
  );
}

function Section({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details open={defaultOpen} style={{ marginBottom: 8, borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: 8 }}>
      <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#eaf6ff', marginBottom: 6, userSelect: 'none' }}>{title}</summary>
      <div style={{ paddingTop: 6 }}>{children}</div>
    </details>
  );
}

export function ControlPanel({
  state, onChange, onApplyOrbitPreset, onApplyScenario, selectedScenarioId, selectedOrbitPresetId,
  viewMode, setViewMode, cameraFocus, setCameraFocus,
  playing, setPlaying, speed, setSpeed, periodSeconds, secondsPerOrbitAtSpeed,
}: Props) {
  const orbitProgress = ((state.orbitPhaseDeg % 360) + 360) % 360 / 360;
  const panelRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={panelRef} style={{
      position: 'absolute', top: 16, right: 16, bottom: 16, width: 300, zIndex: 40, overflowY: 'auto',
      background: '#0b1726', border: '1px solid rgba(160,205,235,.25)', borderRadius: 12, padding: '12px 14px',
      color: '#eaf6ff', fontSize: 12, boxShadow: '0 14px 34px rgba(0,0,0,.4)',
    }}>
      <PanelBoundsProvider value={panelRef}>
      <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>Controls</div>

      {/* Scenario presets */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: '#9fb7c9', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
          Scenario presets
          <InfoTip text="Each one sets every parameter at once to a complete, verified configuration that illustrates a specific outcome. The explainer above the simulation describes each of them in more detail." />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {SCENARIO_PRESETS.map((scenario) => (
            <div key={scenario.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <PresetButton active={selectedScenarioId === scenario.id} onClick={() => onApplyScenario(scenario)}>
                {scenario.label}
              </PresetButton>
              <InfoTip text={scenario.explanation} width={260} />
            </div>
          ))}
        </div>
      </div>

      {/* Camera */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: '#9fb7c9', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
          View
          <InfoTip text="Orbit view shows the altitude and orbital path to scale, with the spacecraft drawn as a small marker. An accurately scaled satellite would either be an invisible speck or, if enlarged enough to see, would pass straight through the Earth. Close-up view shows the spacecraft at full component detail, with Earth as a schematic backdrop that is not to scale." />
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <SegButton active={viewMode === 'orbit'} onClick={() => setViewMode('orbit')}>Orbit</SegButton>
          <SegButton active={viewMode === 'closeup'} onClick={() => setViewMode('closeup')}>Close-up</SegButton>
        </div>
        <div style={{ fontSize: 11, color: '#9fb7c9', marginBottom: 4, opacity: viewMode === 'closeup' ? 0.4 : 1 }}>Camera focus</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <SegButton active={cameraFocus === 'earth' || viewMode === 'closeup'} onClick={() => setCameraFocus('earth')}>Earth</SegButton>
          <SegButton active={cameraFocus === 'satellite' && viewMode === 'orbit'} onClick={() => setCameraFocus('satellite')}>Satellite</SegButton>
        </div>
      </div>

      {/* Playback */}
      <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: 'rgba(255,255,255,.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <button
            type="button"
            onClick={() => setPlaying(!playing)}
            style={{
              width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(255,255,255,.3)',
              background: playing ? 'rgba(255,157,61,.25)' : 'rgba(79,179,255,.25)', color: '#eaf6ff', cursor: 'pointer', fontSize: 13,
            }}
          >{playing ? '\u23F8' : '\u25B6'}</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#9fb7c9' }}>Orbital period</div>
            <div style={{ fontWeight: 600 }}>{formatDuration(periodSeconds)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {SPEED_OPTIONS.map((s) => (
            <SegButton key={s} active={speed === s} onClick={() => setSpeed(s as SpeedMultiplier)}>{s.toLocaleString()}{'\u00d7'}</SegButton>
          ))}
        </div>
        <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,.12)', overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ height: '100%', width: `${orbitProgress * 100}%`, background: '#4fb3ff' }} />
        </div>
        <div style={{ fontSize: 10.5, color: '#8fa8ba' }}>
          At {speed.toLocaleString()}{'\u00d7'}: one orbit completes in {'\u2248'}{formatDuration(secondsPerOrbitAtSpeed)} of real time.
        </div>
      </div>

      {/* Orbit presets */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: '#9fb7c9', marginBottom: 4 }}>Orbit presets</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {ORBIT_PRESETS.map((preset) => (
            <div key={preset.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <PresetButton active={selectedOrbitPresetId === preset.id} onClick={() => onApplyOrbitPreset(preset)}>
                {preset.label}
              </PresetButton>
              <InfoTip text={preset.blurb} width={250} />
            </div>
          ))}
        </div>
      </div>

      {/* AI compute */}
      <Section title="AI compute load" defaultOpen>
        <ParamSlider meta={PARAM_META.computeWattsRequested} value={state.computeWattsRequested} onChange={(v) => onChange('computeWattsRequested', v)} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 2 }}>
          {COMPUTE_REFERENCES.map((ref) => (
            <div key={ref.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <PresetButton active={state.computeWattsRequested === ref.watts} onClick={() => onChange('computeWattsRequested', ref.watts)} fontSize={10.6}>
                {ref.label} {'\u2014'} {ref.watts.toLocaleString()} W
              </PresetButton>
              <InfoTip text={ref.note} width={240} />
            </div>
          ))}
        </div>
      </Section>

      {/* Orbit params */}
      <Section title="Orbit">
        {ORBIT_KEYS.map((key) => (
          <ParamSlider
            key={key}
            meta={PARAM_META[key]}
            value={state[key]}
            onChange={(v) => onChange(key, v)}
            disabled={key === 'orbitPhaseDeg' && playing}
            disabledHint="Playing. Pause to set the orbital phase manually."
          />
        ))}
      </Section>

      {/* Solar array / power */}
      <Section title="Solar array / power">
        {SOLAR_KEYS.map((key) => (
          <ParamSlider key={key} meta={PARAM_META[key]} value={state[key]} onChange={(v) => onChange(key, v)} />
        ))}
      </Section>

      {/* Radiator / loop */}
      <Section title="Radiator / coolant loop">
        {RADIATOR_KEYS.map((key) => (
          <ParamSlider key={key} meta={PARAM_META[key]} value={state[key]} onChange={(v) => onChange(key, v)} />
        ))}
      </Section>

      {/* Solar environment */}
      <Section title="Solar environment">
        {ENV_KEYS.map((key) => (
          <ParamSlider key={key} meta={PARAM_META[key]} value={state[key]} onChange={(v) => onChange(key, v)} />
        ))}
      </Section>

      {/* Spacecraft */}
      <Section title="Spacecraft">
        {SPACECRAFT_KEYS.map((key) => (
          <ParamSlider key={key} meta={PARAM_META[key]} value={state[key]} onChange={(v) => onChange(key, v)} />
        ))}
      </Section>
      </PanelBoundsProvider>
    </div>
  );
}
