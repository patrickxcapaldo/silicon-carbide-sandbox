import { Canvas } from '@react-three/fiber';
import { Suspense, useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { compute } from '../model';
import { ThermalScene, type CameraFocus, type ViewMode } from './ThermalScene';
import { ControlPanel } from './ControlPanel';
import { StatusBadge } from './StatusBadge';
import { useOrbitClock } from './useOrbitClock';
import { nadirEarthViewFactor } from './orbit';
import type { OrbitPreset } from './orbitPresets';
import type { ThermalDerived, ThermalState } from './types';

const INITIAL_STATE: ThermalState = {
  satelliteTempC: 45, operatingTempC: 70, radiatorArea: 2, emissivity: 0.9, solarAbsorptivity: 0.12,
  sinkTempK: 180, earthIrTempK: 255, earthViewFactor: 0.35, earthAlbedo: 0.30,
  solarLoadWm2: 700, sunIncidence: 0.75, flowRateKgS: 0.35, coolantDeltaT: 10, parasiticHeatW: 40,
  computeWattsRequested: 300,
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

  const handlePhaseChange = useCallback((nextPhaseDeg: number) => {
    setStateWithCallback(current => ({ ...current, orbitPhaseDeg: nextPhaseDeg }));
  }, [setStateWithCallback]);

  const { playing, setPlaying, speed, setSpeed, periodSeconds, secondsPerOrbitAtSpeed } =
    useOrbitClock(state.orbitAltitudeKm, state.orbitEccentricity, state.orbitPhaseDeg, handlePhaseChange);

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

  const derived = useMemo<ThermalDerived>(() => {
    const r = compute(state);
    const max = Number(r.outputs.maxTdpWatts.value);
    const gross = Number(r.outputs.radiativeRejectionW.value);
    const external = Number(r.outputs.externalHeatW.value);
    const transport = Number(r.outputs.transportCapacityW.value);
    const computeWattsRequested = Number(r.outputs.computeWattsRequested.value);
    const computeDeficitW = Number(r.outputs.computeDeficitW.value);
    const computeUtilization = max > 0 ? computeWattsRequested / max : (computeWattsRequested > 0 ? Infinity : 0);
    const status =
      max <= 0 || computeDeficitW > 0 ? 'OVERHEATING' as const :
      computeUtilization > 0.85 ? 'LIMIT' as const :
      computeUtilization > 0.6 ? 'MARGIN' as const :
      'SAFE' as const;
    return {
      radiatorPowerW: gross,
      radiatorFluxWm2: Number(r.outputs.radiatorFluxWm2.value),
      absorbedSolarW: state.solarAbsorptivity * state.solarLoadWm2 * state.radiatorArea * state.sunIncidence,
      absorbedAlbedoW: state.solarAbsorptivity * state.solarLoadWm2 * state.earthAlbedo * state.radiatorArea * state.sunIncidence * state.earthViewFactor,
      absorbedEarthIrW: state.emissivity * 5.670374419e-8 * state.radiatorArea * state.earthViewFactor * Math.pow(state.earthIrTempK, 4),
      externalHeatW: external,
      transportCapacityW: transport,
      netCapacityW: max,
      computeWattsRequested,
      computeDeficitW,
      computeUtilization,
      status,
    };
  }, [state]);

  const metric = (value: number, unit = 'W') => `${Math.abs(value) >= 1000 ? (value / 1000).toFixed(2) + ' kW' : Math.round(value) + ' ' + unit}`;

  return <section style={{ position: 'relative', width: '100%', maxWidth: '1200px', margin: '0 auto', height: '760px', minHeight: 600, border: '1px solid rgba(150,190,220,.28)', borderRadius: 16, overflow: 'hidden', background: '#07111e', boxShadow: '0 18px 50px rgba(0,0,0,.28)' }}>
    <Canvas shadows dpr={[1, 2]} camera={{ position: [8.4, 6.4, 9.2], fov: 45, near: 0.05, far: 120 }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <Suspense fallback={null}><ThermalScene state={state} derived={derived} viewMode={viewMode} cameraFocus={cameraFocus} /></Suspense>
    </Canvas>

    <div style={{ position: 'absolute', left: 16, top: 16, zIndex: 20, padding: '9px 12px', borderRadius: 10, background: 'rgba(8,18,31,.82)', border: '1px solid rgba(160,205,235,.25)', color: '#eaf6ff', backdropFilter: 'blur(8px)', fontSize: 12, maxWidth: 260 }}>
      <strong>Orbital thermal balance</strong><br />
      <span style={{ opacity: .72 }}>
        {viewMode === 'orbit'
          ? 'Earth and orbit are to scale; the spacecraft is shown as a small marker so it doesn\u2019t clip through the surface. Switch to Close-up to inspect it.'
          : 'Close-up view: spacecraft at full detail. Earth is a schematic backdrop, not positioned to scale.'}
      </span>
    </div>

    <ControlPanel
      state={state}
      onChange={handleChange}
      onApplyOrbitPreset={applyOrbitPreset}
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

    <section aria-label="thermal telemetry" style={{ position: 'absolute', left: 16, right: 332, bottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px,1fr))', gap: 8, padding: 10, background: 'rgba(5,12,22,.88)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 12, color: '#fff', backdropFilter: 'blur(10px)', zIndex: 20 }}>
      <div><small>Requested compute</small><br /><strong>{metric(derived.computeWattsRequested)}</strong></div>
      <div><small>Compute heat limit</small><br /><strong>{metric(derived.netCapacityW)}</strong></div>
      <div><small>{derived.computeDeficitW > 0 ? 'Deficit' : 'Headroom'}</small><br /><strong style={{ color: derived.computeDeficitW > 0 ? '#ff6b6b' : '#8fe6a8' }}>{metric(Math.abs(derived.computeDeficitW))}</strong></div>
      <div><small>External loads</small><br /><strong>{metric(derived.externalHeatW)}</strong></div>
      <div><small>Coolant capacity</small><br /><strong>{metric(derived.transportCapacityW)}</strong></div>
      <div><small>Status</small><br /><StatusBadge status={derived.status} /></div>
    </section>
  </section>;
}
