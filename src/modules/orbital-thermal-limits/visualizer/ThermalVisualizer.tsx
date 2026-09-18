import { Canvas } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { orbitalThermalLimits } from '../sandbox/module';
import { ThermalScene, type CameraFocus, type ViewMode } from './ThermalScene';
import { ControlPanel } from './ControlPanel';
import { StatusBadge } from './StatusBadge';
import { InfoTip } from './InfoTip';
import { useOrbitClock } from './useOrbitClock';
import { nadirEarthViewFactor } from './orbit';
import type { OrbitPreset } from './orbitPresets';
import type { ScenarioPreset } from './scenarioPresets';
import type { ThermalDerived, ThermalState } from './types';

const INITIAL_STATE: ThermalState = {
  satelliteTempC: 45, operatingTempC: 70, radiatorArea: 2, emissivity: 0.9, solarAbsorptivity: 0.12,
  sinkTempK: 180, earthIrTempK: 255, earthViewFactor: 0.35, earthAlbedo: 0.30,
  solarLoadWm2: 700, sunIncidence: 0.75, flowRateKgS: 0.35, coolantDeltaT: 10, parasiticHeatW: 40,
  computeWattsRequested: 300, solarPanelAreaM2: 4, solarPanelEfficiency: 0.29, solarPanelPointingFactor: 0.95,
  orbitAltitudeKm: 550, orbitEccentricity: 0.01, orbitInclinationDeg: 51.6, orbitRaanDeg: 25, orbitArgumentDeg: 0, orbitPhaseDeg: 35,
};

type ThermalVisualizerProps = { initialState?: Partial<ThermalState>; onStateChange?: (state: ThermalState) => void; };

export function ThermalVisualizer({ initialState = INITIAL_STATE, onStateChange }: ThermalVisualizerProps) {
  const [state, setState] = useState<ThermalState>({ ...INITIAL_STATE, ...initialState });
  const [viewMode, setViewMode] = useState<ViewMode>('orbit');
  const [cameraFocus, setCameraFocus] = useState<CameraFocus>('earth');

  const setStateWithCallback: Dispatch<SetStateAction<ThermalState>> = useCallback((update) => setState(current => {
    const next = typeof update === 'function' ? (update as (s: ThermalState) => ThermalState)(current) : update;
    onStateChange?.(next); return next;
  }), [onStateChange]);

  const handleChange = useCallback((key: keyof ThermalState, value: number) => {
    setStateWithCallback(current => ({ ...current, [key]: value }));
  }, [setStateWithCallback]);

  const lastSyncRef = useRef(0);
  const handlePhaseChange = useCallback((nextPhaseDeg: number) => {
    // The animation drives this at up to 60 updates/sec. Update the local,
    // visual copy of state every frame (cheap, keeps motion smooth), but
    // only forward it to the host's onStateChange/onChange a few times a
    // second -- flooding the host callback at 60Hz was the root cause of
    // playback randomly stalling (whatever the host does in response --
    // re-render, persist, recompute -- was racing the animation loop).
    setState(current => {
      const next = { ...current, orbitPhaseDeg: nextPhaseDeg };
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (now - lastSyncRef.current > 350) {
        lastSyncRef.current = now;
        onStateChange?.(next);
      }
      return next;
    });
  }, [onStateChange]);

  const { playing, setPlaying, speed, setSpeed, periodSeconds, secondsPerOrbitAtSpeed } =
    useOrbitClock(state.orbitAltitudeKm, state.orbitEccentricity, state.orbitPhaseDeg, handlePhaseChange);

  // Give the host one authoritative, un-throttled update whenever playback
  // stops, so it's never left holding a stale mid-orbit phase from the
  // throttling above.
  const wasPlayingRef = useRef(playing);
  useEffect(() => {
    if (wasPlayingRef.current && !playing) onStateChange?.(state);
    wasPlayingRef.current = playing;
  }, [playing, state, onStateChange]);

  const applyOrbitPreset = useCallback((preset: OrbitPreset) => {
    setPlaying(false);
    setStateWithCallback(current => ({
      ...current,
      orbitAltitudeKm: preset.altitudeKm,
      orbitEccentricity: preset.eccentricity,
      orbitInclinationDeg: preset.inclinationDeg,
      orbitRaanDeg: preset.raanDeg,
      orbitArgumentDeg: preset.argumentDeg,
      orbitPhaseDeg: preset.phaseDeg,
      // Seed a geometrically-consistent Earth view factor for a nadir-pointing
      // radiator at this altitude; still manually adjustable afterward.
      earthViewFactor: parseFloat(nadirEarthViewFactor(preset.altitudeKm).toFixed(2)),
    }));
  }, [setPlaying, setStateWithCallback]);

  const applyScenario = useCallback((scenario: ScenarioPreset) => {
    setPlaying(false);
    setStateWithCallback(() => ({ ...scenario.state }));
  }, [setPlaying, setStateWithCallback]);

  const derived = useMemo<ThermalDerived>(() => {
    // Single source of truth: the same kernel the headless module and the
    // host adapter use, at full precision. Nothing here recomputes physics,
    // and the status thresholds live in the kernel rather than the UI.
    const result = orbitalThermalLimits.run(state as unknown as Record<string, number>);
    const v = result.values;
    return {
      radiatorPowerW: v.radiativeRejectionW,
      radiatorFluxWm2: v.radiatorFluxWm2,
      absorbedSolarW: v.absorbedSolarW,
      absorbedAlbedoW: v.absorbedAlbedoW,
      absorbedEarthIrW: v.absorbedEarthIrW,
      externalHeatW: v.externalHeatW,
      transportCapacityW: v.transportCapacityW,
      netCapacityW: v.maxComputeHeatW,
      computeWattsRequested: result.resolvedInputs.computeWattsRequested,
      computeDeficitW: v.computeDeficitW,
      computeUtilization: v.computeUtilisation,
      generatedPowerW: v.generatedPowerW,
      instantaneousGeneratedPowerW: v.instantaneousGeneratedPowerW,
      orbitSunlitFraction: v.orbitSunlitFraction,
      powerDeficitW: v.powerDeficitW,
      powerUtilization: v.powerUtilisation,
      status: result.status,
    };
  }, [state]);

  const metric = (value: number, unit = 'W') => `${Math.abs(value) >= 1000 ? (value / 1000).toFixed(2) + ' kW' : Math.round(value) + ' ' + unit}`;

  const TELEMETRY_INFO = {
    requestedCompute: 'The AI compute electrical power set with the "Requested compute power" slider. Almost all of it ultimately has to leave the spacecraft as heat.',
    heatLimit: 'The most heat the radiator and coolant loop can currently reject, given the environment and settings. This is the thermal ceiling for requested compute power.',
    thermalMargin: 'How much spare heat-rejection capacity is left (headroom), or by how much the requested compute would exceed the thermal ceiling (deficit).',
    arrayPower: 'Electrical power the solar array generates, averaged over the whole orbit including the fraction spent in Earth\u2019s shadow. This, not the instantaneous full-sun figure, is what a continuous compute load is actually checked against.',
    sunlitFraction: 'Percentage of the orbit, by time, spent in sunlight rather than Earth\u2019s shadow, computed from the orbit\u2019s altitude, eccentricity, inclination and orientation against a fixed Sun direction. Changing the orbit sliders changes this, and so changes the power budget.',
    powerMargin: 'How much spare electrical generation is left (headroom), or by how much the requested load would exceed what the array can generate on average across the orbit (deficit). No battery is modelled, so this does not mean the load can run through eclipse itself.',
    coolantCapacity: 'The maximum heat the coolant loop can physically move from the compute payload to the radiator, based on flow rate and allowed temperature rise. The lower of this and the heat limit above sets the actual ceiling.',
  };

  return <section style={{ position: 'relative', width: '100%', maxWidth: '1200px', margin: '0 auto', height: '760px', minHeight: 600, border: '1px solid rgba(150,190,220,.28)', borderRadius: 16, overflow: 'hidden', background: '#07111e', boxShadow: '0 18px 50px rgba(0,0,0,.28)' }}>
    <Canvas shadows dpr={[1, 2]} camera={{ position: [8.4, 6.4, 9.2], fov: 45, near: 0.05, far: 120 }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <Suspense fallback={null}><ThermalScene state={state} derived={derived} viewMode={viewMode} cameraFocus={cameraFocus} /></Suspense>
    </Canvas>

    <div style={{ position: 'absolute', left: 16, top: 16, zIndex: 20, padding: '9px 12px', borderRadius: 10, background: 'rgba(8,18,31,.82)', border: '1px solid rgba(160,205,235,.25)', color: '#eaf6ff', backdropFilter: 'blur(8px)', fontSize: 12, maxWidth: 260 }}>
      <strong>Orbital thermal balance</strong><br />
      <span style={{ opacity: .72 }}>
        {viewMode === 'orbit'
          ? 'Earth and the orbit are drawn to scale, and the spacecraft is shown as a small marker so that it does not pass through the surface. Switch to Close-up to inspect it.'
          : 'Close-up view showing the spacecraft at full detail. Earth is a schematic backdrop and is not positioned to scale.'}
      </span>
    </div>

    <ControlPanel
      state={state}
      onChange={handleChange}
      onApplyOrbitPreset={applyOrbitPreset}
      onApplyScenario={applyScenario}
      viewMode={viewMode}
      setViewMode={setViewMode}
      cameraFocus={cameraFocus}
      setCameraFocus={setCameraFocus}
      playing={playing}
      setPlaying={setPlaying}
      speed={speed}
      setSpeed={setSpeed}
      periodSeconds={periodSeconds}
      secondsPerOrbitAtSpeed={secondsPerOrbitAtSpeed}
    />

    <section aria-label="thermal telemetry" style={{ position: 'absolute', left: 16, right: 332, bottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px,1fr))', gap: 8, padding: 10, background: 'rgba(5,12,22,.88)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 12, color: '#fff', backdropFilter: 'blur(10px)', zIndex: 20 }}>
      <div><small>Requested compute <InfoTip text={TELEMETRY_INFO.requestedCompute} placement="above" /></small><br /><strong>{metric(derived.computeWattsRequested)}</strong></div>
      <div><small>Compute heat limit <InfoTip text={TELEMETRY_INFO.heatLimit} placement="above" /></small><br /><strong>{metric(derived.netCapacityW)}</strong></div>
      <div><small>{derived.computeDeficitW > 0 ? 'Thermal deficit' : 'Thermal headroom'} <InfoTip text={TELEMETRY_INFO.thermalMargin} placement="above" /></small><br /><strong style={{ color: derived.computeDeficitW > 0 ? '#ff6b6b' : '#8fe6a8' }}>{metric(Math.abs(derived.computeDeficitW))}</strong></div>
      <div><small>Solar array power <InfoTip text={TELEMETRY_INFO.arrayPower} placement="above" /></small><br /><strong>{metric(derived.generatedPowerW)}</strong></div>
      <div><small>Orbit sunlit fraction <InfoTip text={TELEMETRY_INFO.sunlitFraction} placement="above" /></small><br /><strong>{(derived.orbitSunlitFraction * 100).toFixed(0)}%</strong></div>
      <div><small>{derived.powerDeficitW > 0 ? 'Power deficit' : 'Power headroom'} <InfoTip text={TELEMETRY_INFO.powerMargin} placement="above" /></small><br /><strong style={{ color: derived.powerDeficitW > 0 ? '#ff6b6b' : '#8fe6a8' }}>{metric(Math.abs(derived.powerDeficitW))}</strong></div>
      <div><small>Coolant capacity <InfoTip text={TELEMETRY_INFO.coolantCapacity} placement="above" /></small><br /><strong>{metric(derived.transportCapacityW)}</strong></div>
      <div><small>Status</small><br /><StatusBadge status={derived.status} /></div>
    </section>
  </section>;
}
