import type { ReactNode } from 'react';
import type { ThermalState } from './types';
import type { CameraFocus, ViewMode } from './ThermalScene';
import { ParamSlider } from './ParamSlider';
import { InfoTip } from './InfoTip';
import { PARAM_META } from './paramMeta';
import { ORBIT_PRESETS, type OrbitPreset } from './orbitPresets';
import { COMPUTE_REFERENCES } from './computeReference';
import { SPEED_OPTIONS, formatDuration, type SpeedMultiplier } from './useOrbitClock';

type Props = {
  state: ThermalState;
  onChange: (key: keyof ThermalState, value: number) => void;
  onApplyOrbitPreset: (preset: OrbitPreset) => void;
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

function Section({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details open={defaultOpen} style={{ marginBottom: 8, borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: 8 }}>
      <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#eaf6ff', marginBottom: 6, userSelect: 'none' }}>{title}</summary>
      <div style={{ paddingTop: 6 }}>{children}</div>
    </details>
  );
}

export function ControlPanel({
  state, onChange, onApplyOrbitPreset, viewMode, setViewMode, cameraFocus, setCameraFocus,
  playing, setPlaying, speed, setSpeed, periodSeconds, secondsPerOrbitAtSpeed,
}: Props) {
  const orbitProgress = ((state.orbitPhaseDeg % 360) + 360) % 360 / 360;

  return (
    <div style={{
      position: 'absolute', top: 16, right: 16, bottom: 16, width: 300, zIndex: 40, overflowY: 'auto',
      background: '#0b1726', border: '1px solid rgba(160,205,235,.25)', borderRadius: 12, padding: '12px 14px',
      color: '#eaf6ff', fontSize: 12, boxShadow: '0 14px 34px rgba(0,0,0,.4)',
    }}>
      <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>Controls</div>

      {/* Camera */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: '#9fb7c9', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
          View
          <InfoTip text="Orbit view shows true-to-scale altitude and orbital path, with the spacecraft drawn as a small marker (an accurately-scaled satellite would be an invisible speck, or would clip through Earth if enlarged). Close-up shows the spacecraft at full component detail, with Earth as a schematic, not-to-scale backdrop." />
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
              <button
                type="button"
                onClick={() => onApplyOrbitPreset(preset)}
                style={{
                  flex: 1, textAlign: 'left', padding: '6px 8px', borderRadius: 6, fontSize: 11,
                  border: '1px solid rgba(255,255,255,.16)', background: 'rgba(255,255,255,.04)', color: '#dff1ff', cursor: 'pointer',
                }}
              >{preset.label}</button>
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
              <button
                type="button"
                onClick={() => onChange('computeWattsRequested', ref.watts)}
                style={{
                  flex: 1, textAlign: 'left', padding: '5px 8px', borderRadius: 6, fontSize: 10.6,
                  border: '1px solid rgba(255,255,255,.14)', background: 'rgba(255,255,255,.03)', color: '#bcdcf0', cursor: 'pointer',
                }}
              >{ref.label} {'\u2014'} {ref.watts.toLocaleString()} W</button>
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
            disabledHint="Playing — pause to set the orbital phase manually."
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
    </div>
  );
}
