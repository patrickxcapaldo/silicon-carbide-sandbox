import { useRef, useState } from 'react';
import type { SolarState } from './types';
import { PARAM_META } from './paramMeta';
import { ParamSlider } from './ParamSlider';
import { PanelBoundsProvider } from './InfoTip';
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
  playing: boolean;
  onTogglePlay: () => void;
  speed: SpeedMultiplier;
  onChangeSpeed: (s: SpeedMultiplier) => void;
  periodSeconds: number;
  onExport?: () => void;
};

export function SolarControlPanel({
  state,
  onChange,
  onApplyScenario,
  onApplyOrbitPreset,
  onReset,
  selectedScenarioId,
  selectedOrbitPresetId,
  playing,
  onTogglePlay,
  speed,
  onChangeSpeed,
  periodSeconds,
  onExport,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  return (
    <PanelBoundsProvider value={panelRef}>
      <aside
        ref={panelRef}
        className={`solar-control-panel ${collapsed ? 'is-collapsed' : ''}`}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 320,
          maxHeight: 'calc(100% - 32px)',
          overflowY: 'auto',
          background: 'rgba(8, 18, 31, 0.92)',
          border: '1px solid rgba(160, 205, 235, 0.28)',
          borderRadius: 12,
          padding: '12px 14px',
          color: '#eaf6ff',
          zIndex: 30,
          backdropFilter: 'blur(10px)',
          fontSize: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: '#eaf6ff' }}>Controls</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {onExport && !collapsed && (
              <button
                type="button"
                onClick={onExport}
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 0,
                  borderRadius: 6,
                  padding: '0.45rem 0.7rem',
                  font: 'inherit',
                  fontSize: 10.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Export
              </button>
            )}
            <button
              type="button"
              onClick={onReset}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 4,
                color: '#9fd2ef',
                fontSize: 10.5,
                padding: '4px 8px',
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
            <button
              type="button"
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Maximize controls' : 'Minimize controls'}
              onClick={() => setCollapsed((v) => !v)}
              style={{
                minWidth: 32,
                minHeight: 32,
                border: '1px solid rgba(160,205,235,.3)',
                borderRadius: 6,
                color: '#eaf6ff',
                background: 'rgba(255,255,255,.06)',
                font: 'inherit',
                cursor: 'pointer',
              }}
            >
              {collapsed ? '+' : '\u2212'}
            </button>
          </div>
        </div>

        {!collapsed && (
          <>
            {/* Mission Scenario Presets */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9fd2ef', marginBottom: 6 }}>Mission Presets</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 5 }}>
                {SCENARIO_PRESETS.map((p) => {
                  const isActive = selectedScenarioId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      title={p.blurb}
                      onClick={() => onApplyScenario(p)}
                      style={{
                        padding: '5px 6px',
                        fontSize: 10.5,
                        fontWeight: isActive ? 700 : 500,
                        textAlign: 'left',
                        background: isActive ? 'rgba(56, 189, 248, 0.28)' : 'rgba(255,255,255,0.05)',
                        border: isActive ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 6,
                        color: isActive ? '#fff' : '#cbd5e1',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Orbit Presets */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9fd2ef', marginBottom: 6 }}>Orbit Presets</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 5 }}>
                {ORBIT_PRESETS.map((p) => {
                  const isActive = selectedOrbitPresetId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      title={p.blurb}
                      onClick={() => onApplyOrbitPreset(p)}
                      style={{
                        padding: '4px 6px',
                        fontSize: 10,
                        fontWeight: isActive ? 700 : 500,
                        textAlign: 'left',
                        background: isActive ? 'rgba(56, 189, 248, 0.28)' : 'rgba(255,255,255,0.05)',
                        border: isActive ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 6,
                        color: isActive ? '#fff' : '#cbd5e1',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 1: Photovoltaic Array */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9fd2ef', marginBottom: 8 }}>Photovoltaic Array</div>
              <ParamSlider meta={PARAM_META.solarArrayAreaM2} value={state.solarArrayAreaM2} onChange={(v) => onChange('solarArrayAreaM2', v)} />
              <ParamSlider meta={PARAM_META.baseCellEfficiency} value={state.baseCellEfficiency} onChange={(v) => onChange('baseCellEfficiency', v)} />
              <ParamSlider meta={PARAM_META.cellOperatingTempC} value={state.cellOperatingTempC} onChange={(v) => onChange('cellOperatingTempC', v)} />
              <ParamSlider meta={PARAM_META.tempCoefficientPwr} value={state.tempCoefficientPwr} onChange={(v) => onChange('tempCoefficientPwr', v)} />
            </div>

            {/* Section 2: Lifetime & Degradation */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9fd2ef', marginBottom: 8 }}>Mission Radiation & Aging</div>
              <ParamSlider meta={PARAM_META.missionDurationYears} value={state.missionDurationYears} onChange={(v) => onChange('missionDurationYears', v)} />
              <ParamSlider meta={PARAM_META.annualDegradationRate} value={state.annualDegradationRate} onChange={(v) => onChange('annualDegradationRate', v)} />
            </div>

            {/* Section 3: Pointing & System Losses */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9fd2ef', marginBottom: 8 }}>Pointing & System Efficiency</div>
              <ParamSlider meta={PARAM_META.pointingEfficiency} value={state.pointingEfficiency} onChange={(v) => onChange('pointingEfficiency', v)} />
              <ParamSlider meta={PARAM_META.bosEfficiency} value={state.bosEfficiency} onChange={(v) => onChange('bosEfficiency', v)} />
              <ParamSlider meta={PARAM_META.solarFluxWm2} value={state.solarFluxWm2} onChange={(v) => onChange('solarFluxWm2', v)} />
            </div>

            {/* Section 4: Orbit Parameters & Animation */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#9fd2ef' }}>Orbital Geometry</span>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>Period: {formatDuration(periodSeconds)}</span>
              </div>
              <ParamSlider meta={PARAM_META.orbitAltitudeKm} value={state.orbitAltitudeKm} onChange={(v) => onChange('orbitAltitudeKm', v)} />
              <ParamSlider meta={PARAM_META.orbitEccentricity} value={state.orbitEccentricity} onChange={(v) => onChange('orbitEccentricity', v)} />
              <ParamSlider meta={PARAM_META.orbitInclinationDeg} value={state.orbitInclinationDeg} onChange={(v) => onChange('orbitInclinationDeg', v)} />
              <ParamSlider meta={PARAM_META.orbitRaanDeg} value={state.orbitRaanDeg} onChange={(v) => onChange('orbitRaanDeg', v)} />

              {/* Orbit Animation Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '8px 0' }}>
                <button
                  type="button"
                  onClick={onTogglePlay}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid #38bdf8',
                    background: playing ? 'rgba(56, 189, 248, 0.3)' : '#38bdf8',
                    color: playing ? '#38bdf8' : '#040d1a',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  {playing ? 'Pause ⏸' : 'Play ▶'}
                </button>
                <div style={{ display: 'flex', gap: 3 }}>
                  {SPEED_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onChangeSpeed(s)}
                      style={{
                        padding: '3px 5px',
                        borderRadius: 4,
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: speed === s ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                        color: speed === s ? '#38bdf8' : '#94a3b8',
                        fontSize: 10,
                        cursor: 'pointer',
                      }}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
              <ParamSlider meta={PARAM_META.orbitPhaseDeg} value={state.orbitPhaseDeg} onChange={(v) => onChange('orbitPhaseDeg', v)} />
            </div>
          </>
        )}
      </aside>
    </PanelBoundsProvider>
  );
}
