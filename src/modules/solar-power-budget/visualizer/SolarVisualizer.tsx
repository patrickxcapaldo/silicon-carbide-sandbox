import { Canvas } from '@react-three/fiber';
import { Suspense, useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { solarPowerBudget } from '../sandbox/module';
import { computeLosses } from '../challenge/losses';
import type { SolarKernelInputs } from '../sandbox/kernel';
import { SolarScene, type CameraFocus, type ViewMode } from './SolarScene';
import { SolarControlPanel } from './SolarControlPanel';
import { SolarPowerLossBars } from './SolarPowerLossBars';
import { useOrbitClock } from './useOrbitClock';
import { formatWatts, formatPercent } from './format';
import { ORBIT_PRESETS, type OrbitPreset } from './orbitPresets';
import type { ScenarioPreset } from './scenarioPresets';
import type { SolarDerived, SolarState } from './types';
import { DAWN_DUSK_SSO_ORBIT } from '../../../core/orbitalMechanics';

const INITIAL_STATE: SolarState = {
  solarArrayAreaM2: 4.0,
  baseCellEfficiency: 0.30,
  cellOperatingTempC: 65,
  tempCoefficientPwr: -0.0025,
  missionDurationYears: 5.0,
  annualDegradationRate: 0.015,
  pointingEfficiency: 0.98,
  bosEfficiency: 0.88,
  solarFluxWm2: 1361,
  ...DAWN_DUSK_SSO_ORBIT,
};

type Props = {
  initialState?: Partial<SolarState>;
  onStateChange?: (state: SolarState) => void;
  onExport?: () => void;
};

export function SolarVisualizer({ initialState = INITIAL_STATE, onStateChange, onExport }: Props) {
  const [state, setState] = useState<SolarState>({ ...INITIAL_STATE, ...initialState });
  const [viewMode, setViewMode] = useState<ViewMode>('orbit');
  const [cameraFocus, setCameraFocus] = useState<CameraFocus>('earth');

  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [selectedOrbitPresetId, setSelectedOrbitPresetId] = useState<string | null>(() => {
    const dawnDusk = ORBIT_PRESETS.find((p) => p.id === 'leo-dawn-dusk-sso');
    return dawnDusk &&
      state.orbitAltitudeKm === dawnDusk.altitudeKm &&
      state.orbitEccentricity === dawnDusk.eccentricity &&
      state.orbitInclinationDeg === dawnDusk.inclinationDeg &&
      state.orbitRaanDeg === dawnDusk.raanDeg
      ? dawnDusk.id
      : null;
  });

  const setStateWithCallback: Dispatch<SetStateAction<SolarState>> = useCallback(
    (update) =>
      setState((current) => {
        const next = typeof update === 'function' ? (update as (s: SolarState) => SolarState)(current) : update;
        onStateChange?.(next);
        return next;
      }),
    [onStateChange],
  );

  const handlePhaseChange = useCallback(
    (nextPhaseDeg: number) => {
      setStateWithCallback((s) => ({ ...s, orbitPhaseDeg: nextPhaseDeg }));
    },
    [setStateWithCallback],
  );

  const { playing, setPlaying, speed, setSpeed, periodSeconds } = useOrbitClock(
    state.orbitAltitudeKm,
    state.orbitEccentricity,
    state.orbitPhaseDeg,
    handlePhaseChange,
  );

  const handleFieldChange = useCallback(
    <K extends keyof SolarState>(field: K, value: SolarState[K]) => {
      setSelectedScenarioId(null);
      if (
        field === 'orbitAltitudeKm' ||
        field === 'orbitEccentricity' ||
        field === 'orbitInclinationDeg' ||
        field === 'orbitRaanDeg'
      ) {
        setSelectedOrbitPresetId(null);
      }
      setStateWithCallback((s) => ({ ...s, [field]: value }));
    },
    [setStateWithCallback],
  );

  const handleApplyScenario = useCallback(
    (preset: ScenarioPreset) => {
      setSelectedScenarioId(preset.id);
      setSelectedOrbitPresetId(null);
      setStateWithCallback((s) => ({ ...s, ...preset.patch }));
    },
    [setStateWithCallback],
  );

  const handleApplyOrbitPreset = useCallback(
    (preset: OrbitPreset) => {
      setSelectedOrbitPresetId(preset.id);
      setSelectedScenarioId(null);
      setStateWithCallback((s) => ({
        ...s,
        orbitAltitudeKm: preset.altitudeKm,
        orbitEccentricity: preset.eccentricity,
        orbitInclinationDeg: preset.inclinationDeg,
        orbitRaanDeg: preset.raanDeg,
        orbitArgumentDeg: preset.argumentDeg,
        orbitPhaseDeg: preset.phaseDeg,
      }));
    },
    [setStateWithCallback],
  );

  const handleReset = useCallback(() => {
    setSelectedScenarioId(null);
    setSelectedOrbitPresetId('leo-dawn-dusk-sso');
    setStateWithCallback({ ...INITIAL_STATE });
  }, [setStateWithCallback]);

  // Pure physics evaluation
  const derived: SolarDerived = useMemo(() => {
    const res = solarPowerBudget.run(state);
    const v = res.values;
    const losses = computeLosses(res.resolvedInputs as unknown as SolarKernelInputs);

    return {
      orbitAveragePowerW: v.orbitAveragePowerW,
      instantaneousSunlitPowerW: v.instantaneousSunlitPowerW,
      beginningOfLifePowerW: v.beginningOfLifePowerW,
      orbitSunlitFraction: v.orbitSunlitFraction,
      orbitEclipseDurationMin: v.orbitEclipseDurationMin,
      orbitPeriodMinutes: v.orbitPeriodMinutes,
      orbitEnergyGeneratedWh: v.orbitEnergyGeneratedWh,
      effectiveSystemEfficiency: v.effectiveSystemEfficiency,
      temperatureDerateFactor: v.temperatureDerateFactor,
      radiationDerateFactor: v.radiationDerateFactor,
      thermalLossW: losses.thermalLossW,
      radiationLossW: losses.radiationLossW,
      bosPointingLossW: losses.unconstrainedBolW * (1 - state.bosEfficiency * state.pointingEfficiency),
      eclipseLossW: losses.eclipseLossW,
      unconstrainedBolW: losses.unconstrainedBolW,
    };
  }, [state]);

  const handleViewModeChange = (nextMode: ViewMode) => {
    setViewMode(nextMode);
    if (nextMode === 'closeup') setCameraFocus('satellite');
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '75vh',
        minHeight: 520,
        maxHeight: 780,
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: '#040b16',
      }}
    >
      <Canvas
        camera={{ position: [0, -13, 14], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <SolarScene state={state} derived={derived} viewMode={viewMode} cameraFocus={cameraFocus} />
        </Suspense>
      </Canvas>

      {/* Top Left: Controls & Export */}
      <div className="solar-overlay solar-intro">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <strong style={{ fontSize: 13, color: '#9fd2ef' }}>Solar Array Budget</strong>
          {onExport && (
            <button
              type="button"
              onClick={onExport}
              style={{
                background: 'var(--accent)',
                color: '#040d1a',
                border: 0,
                borderRadius: 4,
                padding: '3px 7px',
                fontSize: 10.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Export JSON
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, margin: '6px 0' }}>
          <button
            type="button"
            onClick={() => handleViewModeChange('orbit')}
            style={{
              flex: 1,
              padding: '4px 6px',
              borderRadius: 6,
              fontSize: 10.5,
              fontWeight: viewMode === 'orbit' ? 700 : 500,
              background: viewMode === 'orbit' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255,255,255,0.06)',
              border: viewMode === 'orbit' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.15)',
              color: viewMode === 'orbit' ? '#fff' : '#94a3b8',
              cursor: 'pointer',
            }}
          >
            Orbit Scale
          </button>
          <button
            type="button"
            onClick={() => handleViewModeChange('closeup')}
            style={{
              flex: 1,
              padding: '4px 6px',
              borderRadius: 6,
              fontSize: 10.5,
              fontWeight: viewMode === 'closeup' ? 700 : 500,
              background: viewMode === 'closeup' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255,255,255,0.06)',
              border: viewMode === 'closeup' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.15)',
              color: viewMode === 'closeup' ? '#fff' : '#94a3b8',
              cursor: 'pointer',
            }}
          >
            Close-up Wing
          </button>
        </div>
        <div style={{ fontSize: 10.5, color: '#94a3b8', lineHeight: 1.4 }}>
          {viewMode === 'orbit' ? 'Earth and orbit to scale. Yellow beam shows fixed Sun vector.' : 'Detailed solar array model with cell thermal color rendering.'}
        </div>
      </div>

      {/* Top Right Sidebar: Control Panel */}
      <SolarControlPanel
        state={state}
        onChange={handleFieldChange}
        onApplyScenario={handleApplyScenario}
        onApplyOrbitPreset={handleApplyOrbitPreset}
        onReset={handleReset}
        selectedScenarioId={selectedScenarioId}
        selectedOrbitPresetId={selectedOrbitPresetId}
        playing={playing}
        onTogglePlay={() => setPlaying((v) => !v)}
        speed={speed}
        onChangeSpeed={setSpeed}
        periodSeconds={periodSeconds}
      />

      {/* Bottom Overlay: Telemetry & Loss Bars */}
      <div className="solar-overlay solar-telemetry">
        <SolarPowerLossBars derived={derived} />

        <div className="solar-telemetry-grid">
          <div>
            <div style={{ color: '#94a3b8', fontSize: 10 }}>Orbit Average</div>
            <div style={{ color: '#38bdf8', fontSize: 14, fontWeight: 700 }}>
              {formatWatts(derived.orbitAveragePowerW)}
            </div>
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: 10 }}>Sunlit Generation</div>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
              {formatWatts(derived.instantaneousSunlitPowerW)}
            </div>
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: 10 }}>Sunlit Duty Cycle</div>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
              {formatPercent(derived.orbitSunlitFraction)} ({derived.orbitEclipseDurationMin.toFixed(1)}m)
            </div>
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: 10 }}>Net Efficiency</div>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
              {formatPercent(derived.effectiveSystemEfficiency)}
            </div>
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: 10 }}>Energy / Orbit</div>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
              {Math.round(derived.orbitEnergyGeneratedWh)} W·h
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
