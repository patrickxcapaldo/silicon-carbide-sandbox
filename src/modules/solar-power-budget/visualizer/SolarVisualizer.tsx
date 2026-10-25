import { Canvas } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { solarPowerBudget } from '../sandbox/module';
import { computeLosses } from '../challenge/losses';
import type { SolarKernelInputs } from '../sandbox/kernel';
import { SolarScene, type CameraFocus, type ViewMode } from './SolarScene';
import { SolarControlPanel } from './SolarControlPanel';
import { SolarPowerLossBars } from './SolarPowerLossBars';
import { InfoTip } from './InfoTip';
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

  const lastSyncRef = useRef(0);
  const handlePhaseChange = useCallback(
    (nextPhaseDeg: number) => {
      setState((current) => {
        const next = { ...current, orbitPhaseDeg: nextPhaseDeg };
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (now - lastSyncRef.current > 350) {
          lastSyncRef.current = now;
          onStateChange?.(next);
        }
        return next;
      });
    },
    [onStateChange],
  );

  const { playing, setPlaying, speed, setSpeed, periodSeconds, secondsPerOrbitAtSpeed } = useOrbitClock(
    state.orbitAltitudeKm,
    state.orbitEccentricity,
    state.orbitPhaseDeg,
    handlePhaseChange,
  );

  const wasPlayingRef = useRef(playing);
  useEffect(() => {
    if (wasPlayingRef.current && !playing) onStateChange?.(state);
    wasPlayingRef.current = playing;
  }, [playing, state, onStateChange]);

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
      setPlaying(false);
      setSelectedScenarioId(preset.id);
      setSelectedOrbitPresetId(null);
      setStateWithCallback((s) => ({ ...s, ...preset.patch }));
    },
    [setPlaying, setStateWithCallback],
  );

  const handleApplyOrbitPreset = useCallback(
    (preset: OrbitPreset) => {
      setPlaying(false);
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
    [setPlaying, setStateWithCallback],
  );

  const handleReset = useCallback(() => {
    setPlaying(false);
    setSelectedScenarioId(null);
    setSelectedOrbitPresetId('leo-dawn-dusk-sso');
    setStateWithCallback({ ...INITIAL_STATE, ...initialState });
  }, [setPlaying, setStateWithCallback, initialState]);

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
    <>
      <section
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          height: '760px',
          minHeight: 600,
          border: '1px solid rgba(150,190,220,.28)',
          borderRadius: 16,
          overflow: 'hidden',
          background: '#07111e',
          boxShadow: '0 18px 50px rgba(0,0,0,.28)',
        }}
      >
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [8.4, 6.4, 9.2], fov: 45, near: 0.05, far: 120 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <Suspense fallback={null}>
            <SolarScene state={state} derived={derived} viewMode={viewMode} cameraFocus={cameraFocus} />
          </Suspense>
        </Canvas>

        {/* Top Left: Intro */}
        <details open className="solar-overlay solar-intro">
          <summary>Solar Array Power Budget</summary>
          <div>
            {viewMode === 'orbit'
              ? 'Earth and orbit are drawn to scale, with eclipse shadow geometry shown. Switch to Close-up to inspect the solar array wing.'
              : 'Close-up view showing the solar array wing with cell thermal color rendering. Earth is not positioned to scale.'}
          </div>
        </details>

        {/* Top Right Sidebar: Control Panel */}
        <SolarControlPanel
          state={state}
          onChange={handleFieldChange}
          onApplyScenario={handleApplyScenario}
          onApplyOrbitPreset={handleApplyOrbitPreset}
          onReset={handleReset}
          selectedScenarioId={selectedScenarioId}
          selectedOrbitPresetId={selectedOrbitPresetId}
          viewMode={viewMode}
          setViewMode={handleViewModeChange}
          cameraFocus={cameraFocus}
          setCameraFocus={setCameraFocus}
          playing={playing}
          setPlaying={setPlaying}
          speed={speed}
          setSpeed={setSpeed}
          periodSeconds={periodSeconds}
          secondsPerOrbitAtSpeed={secondsPerOrbitAtSpeed}
          onExport={onExport}
        />

        {/* Bottom Overlay: Telemetry */}
        <details open className="solar-overlay solar-telemetry" aria-label="Solar telemetry">
          <summary>Solar Telemetry</summary>
          <div className="solar-telemetry-grid">
            <div>
              <small>
                Orbit Average{' '}
                <InfoTip
                  text="Average electrical power generated across the full orbit, accounting for daylight, eclipse shadow, temperature, radiation, and system losses."
                  placement="above"
                />
              </small>
              <br />
              <strong>{formatWatts(derived.orbitAveragePowerW)}</strong>
            </div>
            <div>
              <small>
                Sunlit Generation{' '}
                <InfoTip
                  text="Instantaneous power generated while the satellite is in direct sunlight."
                  placement="above"
                />
              </small>
              <br />
              <strong>{formatWatts(derived.instantaneousSunlitPowerW)}</strong>
            </div>
            <div>
              <small>
                Sunlit Duty Cycle{' '}
                <InfoTip
                  text="Fraction and duration of the orbit spent in direct sunlight versus Earth's shadow."
                  placement="above"
                />
              </small>
              <br />
              <strong>
                {formatPercent(derived.orbitSunlitFraction)} ({derived.orbitEclipseDurationMin.toFixed(1)}m)
              </strong>
            </div>
            <div>
              <small>
                Net Efficiency{' '}
                <InfoTip
                  text="System-level end-to-end efficiency derated from baseline cell efficiency."
                  placement="above"
                />
              </small>
              <br />
              <strong>{formatPercent(derived.effectiveSystemEfficiency)}</strong>
            </div>
            <div>
              <small>
                Energy / Orbit{' '}
                <InfoTip text="Total electrical energy generated per completed orbit." placement="above" />
              </small>
              <br />
              <strong>{Math.round(derived.orbitEnergyGeneratedWh)} W·h</strong>
            </div>
            <div>
              <small>
                Beginning of Life{' '}
                <InfoTip
                  text="Initial un-derated array generation before radiation and temperature losses."
                  placement="above"
                />
              </small>
              <br />
              <strong>{formatWatts(derived.beginningOfLifePowerW)}</strong>
            </div>
          </div>
        </details>
      </section>

      {/* Loss Bars Breakdown below the canvas */}
      <details open className="challenge-explorer-limits solar-losses" aria-label="Power budget breakdown">
        <summary>Power Budget Breakdown</summary>
        <p>Stacked losses derating beginning-of-life array output down to orbit-averaged power.</p>
        <SolarPowerLossBars derived={derived} />
      </details>
    </>
  );
}
