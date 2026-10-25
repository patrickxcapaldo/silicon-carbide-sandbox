import { useRef, useState, type ReactNode } from 'react';
import type { SolarState } from './types';
import type { CameraFocus, ViewMode } from './SolarScene';
import { PARAM_META } from './paramMeta';
import { ParamSlider } from './ParamSlider';
import { InfoTip, PanelBoundsProvider } from './InfoTip';
import { SCENARIO_PRESETS, type ScenarioPreset } from './scenarioPresets';
import { ORBIT_PRESETS, type OrbitPreset } from './orbitPresets';
import { SPEED_OPTIONS, formatDuration, type SpeedMultiplier } from './useOrbitClock';

type Props = {
  state: SolarState;
  onChange: <K extends keyof SolarState>(key: K, value: SolarState[K]) => void;
  onApplyScenario: (preset: ScenarioPreset) => void;
  onApplyOrbitPreset: (preset: OrbitPreset) => void;
  onReset: () => void;
  selectedScenarioId: string | null;
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
  onExport?: () => void;
};

const ORBIT_KEYS: (keyof SolarState)[] = [
  'orbitAltitudeKm',
  'orbitEccentricity',
  'orbitInclinationDeg',
  'orbitRaanDeg',
  'orbitArgumentDeg',
  'orbitPhaseDeg',
];

function SegButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '5px 8px',
        fontSize: 11,
        borderRadius: 6,
        cursor: 'pointer',
        border: `1px solid ${active ? '#4fb3ff' : 'rgba(255,255,255,.18)'}`,
        background: active ? 'rgba(79,179,255,.22)' : 'transparent',
        color: active ? '#eaf6ff' : '#9fb7c9',
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </button>
  );
}

function PresetButton({
  active,
  onClick,
  children,
  fontSize = 11,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  fontSize?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        flex: 1,
        textAlign: 'left',
        padding: '6px 8px',
        borderRadius: 6,
        fontSize,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
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
      <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#eaf6ff', marginBottom: 6, userSelect: 'none' }}>
        {title}
      </summary>
      <div style={{ paddingTop: 6 }}>{children}</div>
    </details>
  );
}

export function SolarControlPanel({
  state,
  onChange,
  onApplyScenario,
  onApplyOrbitPreset,
  onReset,
  selectedScenarioId,
  selectedOrbitPresetId,
  viewMode,
  setViewMode,
  cameraFocus,
  setCameraFocus,
  playing,
  setPlaying,
  speed,
  setSpeed,
  periodSeconds,
  secondsPerOrbitAtSpeed,
  onExport,
}: Props) {
  const orbitProgress = (((state.orbitPhaseDeg % 360) + 360) % 360) / 360;
  const panelRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 680px)').matches,
  );

  return (
    <div
      ref={panelRef}
      className={`solar-control-panel${collapsed ? ' is-collapsed' : ''}`}
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        bottom: collapsed ? 'auto' : 16,
        width: 300,
        zIndex: 40,
        overflowY: 'auto',
        background: '#0b1726',
        border: '1px solid rgba(160,205,235,.25)',
        borderRadius: 12,
        padding: '12px 14px',
        color: '#eaf6ff',
        fontSize: 12,
        boxShadow: '0 14px 34px rgba(0,0,0,.4)',
      }}
    >
      <PanelBoundsProvider value={panelRef}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>Controls</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {onExport && !collapsed && (
              <button
                type="button"
                onClick={onExport}
                style={{
                  height: 32,
                  minHeight: 32,
                  boxSizing: 'border-box',
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 0,
                  borderRadius: 6,
                  padding: '0 12px',
                  font: 'inherit',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                Export
              </button>
            )}
            {!collapsed && (
              <button
                type="button"
                onClick={onReset}
                style={{
                  height: 32,
                  minHeight: 32,
                  boxSizing: 'border-box',
                  background: 'rgba(255,255,255,.06)',
                  border: '1px solid rgba(160,205,235,.3)',
                  borderRadius: 6,
                  color: '#eaf6ff',
                  font: 'inherit',
                  fontSize: 11,
                  fontWeight: 500,
                  padding: '0 12px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                Reset
              </button>
            )}
            <button
              type="button"
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Maximize controls' : 'Minimize controls'}
              onClick={() => setCollapsed((v) => !v)}
              style={{
                width: 32,
                height: 32,
                minWidth: 32,
                minHeight: 32,
                boxSizing: 'border-box',
                border: '1px solid rgba(160,205,235,.3)',
                borderRadius: 6,
                color: '#eaf6ff',
                background: 'rgba(255,255,255,.06)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                cursor: 'pointer',
              }}
            >
              {collapsed ? '\u25B6' : '\u25BC'}
            </button>
          </div>
        </div>

        {!collapsed && (
          <div>
            {/* Scenario Presets */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#9fb7c9', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                Mission Presets
                <InfoTip text="Predefined mission scenarios setting array sizing, cell technology, operational conditions, and orbit parameters." />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {SCENARIO_PRESETS.map((scenario) => (
                  <div key={scenario.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <PresetButton
                      active={selectedScenarioId === scenario.id}
                      onClick={() => onApplyScenario(scenario)}
                    >
                      {scenario.name}
                    </PresetButton>
                    <InfoTip text={scenario.blurb} width={260} />
                  </div>
                ))}
              </div>
            </div>

            {/* View */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#9fb7c9', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                View
                <InfoTip text="Orbit view shows the orbit and Earth to scale with eclipse shadow geometry. Close-up view shows the detailed solar array wing with cell thermal color rendering." />
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <SegButton active={viewMode === 'orbit'} onClick={() => setViewMode('orbit')}>
                  Orbit
                </SegButton>
                <SegButton active={viewMode === 'closeup'} onClick={() => setViewMode('closeup')}>
                  Close-up
                </SegButton>
              </div>
              <div style={{ fontSize: 11, color: '#9fb7c9', marginBottom: 4 }}>Camera Focus</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {viewMode === 'orbit' && (
                  <SegButton active={cameraFocus === 'earth'} onClick={() => setCameraFocus('earth')}>
                    Earth
                  </SegButton>
                )}
                <SegButton
                  active={viewMode === 'closeup' || cameraFocus === 'satellite'}
                  onClick={() => setCameraFocus('satellite')}
                >
                  Satellite
                </SegButton>
              </div>
            </div>

            {/* Playback */}
            <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: 'rgba(255,255,255,.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <button
                  type="button"
                  onClick={() => setPlaying(!playing)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,.3)',
                    background: playing ? 'rgba(255,157,61,.25)' : 'rgba(79,179,255,.25)',
                    color: '#eaf6ff',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  {playing ? '\u23F8' : '\u25B6'}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#9fb7c9' }}>Orbital Period</div>
                  <div style={{ fontWeight: 600 }}>{formatDuration(periodSeconds)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                {SPEED_OPTIONS.map((s) => (
                  <SegButton key={s} active={speed === s} onClick={() => setSpeed(s as SpeedMultiplier)}>
                    {s.toLocaleString()}
                    {'\u00d7'}
                  </SegButton>
                ))}
              </div>
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,.12)',
                  overflow: 'hidden',
                  marginBottom: 6,
                }}
              >
                <div style={{ height: '100%', width: `${orbitProgress * 100}%`, background: '#4fb3ff' }} />
              </div>
              <div style={{ fontSize: 10.5, color: '#8fa8ba' }}>
                At {speed.toLocaleString()}
                {'\u00d7'}: one orbit completes in {'\u2248'}
                {formatDuration(secondsPerOrbitAtSpeed)} of real time.
              </div>
            </div>

            {/* Section 1: Photovoltaic Array */}
            <Section title="Photovoltaic Array" defaultOpen>
              <ParamSlider
                meta={PARAM_META.solarArrayAreaM2}
                value={state.solarArrayAreaM2}
                onChange={(v) => onChange('solarArrayAreaM2', v)}
              />
              <ParamSlider
                meta={PARAM_META.baseCellEfficiency}
                value={state.baseCellEfficiency}
                onChange={(v) => onChange('baseCellEfficiency', v)}
              />
              <ParamSlider
                meta={PARAM_META.cellOperatingTempC}
                value={state.cellOperatingTempC}
                onChange={(v) => onChange('cellOperatingTempC', v)}
              />
              <ParamSlider
                meta={PARAM_META.tempCoefficientPwr}
                value={state.tempCoefficientPwr}
                onChange={(v) => onChange('tempCoefficientPwr', v)}
              />
            </Section>

            {/* Section 2: Lifetime & Degradation */}
            <Section title="Mission Radiation & Aging">
              <ParamSlider
                meta={PARAM_META.missionDurationYears}
                value={state.missionDurationYears}
                onChange={(v) => onChange('missionDurationYears', v)}
              />
              <ParamSlider
                meta={PARAM_META.annualDegradationRate}
                value={state.annualDegradationRate}
                onChange={(v) => onChange('annualDegradationRate', v)}
              />
            </Section>

            {/* Section 3: Pointing & System Losses */}
            <Section title="Pointing & System Efficiency">
              <ParamSlider
                meta={PARAM_META.pointingEfficiency}
                value={state.pointingEfficiency}
                onChange={(v) => onChange('pointingEfficiency', v)}
              />
              <ParamSlider
                meta={PARAM_META.bosEfficiency}
                value={state.bosEfficiency}
                onChange={(v) => onChange('bosEfficiency', v)}
              />
              <ParamSlider
                meta={PARAM_META.solarFluxWm2}
                value={state.solarFluxWm2}
                onChange={(v) => onChange('solarFluxWm2', v)}
              />
            </Section>

            {/* Section 4: Orbit */}
            <Section title="Orbit">
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#9fb7c9', marginBottom: 4 }}>Orbit Presets</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {ORBIT_PRESETS.map((preset) => (
                    <div key={preset.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <PresetButton
                        active={selectedOrbitPresetId === preset.id}
                        onClick={() => onApplyOrbitPreset(preset)}
                      >
                        {preset.label}
                      </PresetButton>
                      <InfoTip text={preset.blurb} width={250} />
                    </div>
                  ))}
                </div>
              </div>
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
          </div>
        )}
      </PanelBoundsProvider>
    </div>
  );
}
