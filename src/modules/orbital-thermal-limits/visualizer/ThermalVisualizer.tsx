import { Canvas } from '@react-three/fiber';
import { Suspense, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { compute } from '../model';
import { ThermalScene } from './ThermalScene';
import { useThermalGui } from './useThermalGui';
import type { ThermalState } from './types';

const INITIAL_STATE: ThermalState = {
  satelliteTempC: 45, operatingTempC: 70, radiatorArea: 2, emissivity: 0.9, solarAbsorptivity: 0.12,
  sinkTempK: 180, earthIrTempK: 255, earthViewFactor: 0.35, earthAlbedo: 0.30,
  solarLoadWm2: 700, sunIncidence: 0.75, flowRateKgS: 0.35, coolantDeltaT: 10, parasiticHeatW: 40,
  orbitAltitudeKm: 550, orbitEccentricity: 0.01, orbitInclinationDeg: 51.6, orbitRaanDeg: 25, orbitArgumentDeg: 0, orbitPhaseDeg: 35,
};

type ThermalVisualizerProps = { initialState?: Partial<ThermalState>; onStateChange?: (state: ThermalState) => void; };

export function ThermalVisualizer({ initialState = INITIAL_STATE, onStateChange }: ThermalVisualizerProps) {
  const [state, setState] = useState<ThermalState>({ ...INITIAL_STATE, ...initialState });
  const sectionRef = useRef<HTMLElement | null>(null);
  const setStateWithCallback: Dispatch<SetStateAction<ThermalState>> = (update) => setState(current => {
    const next = typeof update === 'function' ? (update as (s: ThermalState) => ThermalState)(current) : update;
    onStateChange?.(next); return next;
  });
  useThermalGui(state, setStateWithCallback, sectionRef);
  const derived = useMemo<ThermalDerived>(() => {
    const r = compute(state);
    const max = Number(r.outputs.maxTdpWatts.value);
    const gross = Number(r.outputs.radiativeRejectionW.value);
    const external = Number(r.outputs.externalHeatW.value);
    const transport = Number(r.outputs.transportCapacityW.value);
    const margin = max / Math.max(1, gross);
    const status = gross - external < 0 ? 'OVERHEATING' : margin < 0.15 ? 'LIMIT' : margin < 0.35 ? 'MARGIN' : 'SAFE';
    return {
      radiatorPowerW: gross,
      radiatorFluxWm2: Number(r.outputs.radiatorFluxWm2.value),
      absorbedSolarW: state.solarAbsorptivity * state.solarLoadWm2 * state.radiatorArea * state.sunIncidence,
      absorbedAlbedoW: state.solarAbsorptivity * state.solarLoadWm2 * state.earthAlbedo * state.radiatorArea * state.sunIncidence * state.earthViewFactor,
      absorbedEarthIrW: state.emissivity * 5.670374419e-8 * state.radiatorArea * state.earthViewFactor * Math.pow(state.earthIrTempK, 4),
      externalHeatW: external,
      transportCapacityW: transport,
      netCapacityW: max,
      status,
    };
  }, [state]);

  const metric = (value: number, unit = 'W') => `${value >= 1000 ? (value / 1000).toFixed(2) + ' kW' : Math.round(value) + ' ' + unit}`;
  return <section ref={sectionRef} style={{ position: 'relative', width: '100%', maxWidth: '1200px', margin: '0 auto', height: '760px', minHeight: 600, border: '1px solid rgba(150,190,220,.28)', borderRadius: 16, overflow: 'hidden', background: '#07111e', boxShadow: '0 18px 50px rgba(0,0,0,.28)' }}>
    <Canvas shadows dpr={[1, 2]} camera={{ position: [8.4, 6.4, 9.2], fov: 45, near: 0.05, far: 120 }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <Suspense fallback={null}><ThermalScene state={state} derived={derived} /></Suspense>
    </Canvas>

    <div style={{ position: 'absolute', left: 16, top: 16, zIndex: 20, padding: '9px 12px', borderRadius: 10, background: 'rgba(8,18,31,.82)', border: '1px solid rgba(160,205,235,.25)', color: '#eaf6ff', backdropFilter: 'blur(8px)', fontSize: 12 }}>
      <strong>Orbital thermal balance</strong><br />
      <span style={{ opacity: .72 }}>Earth is shown at orbital-context scale; spacecraft is deliberately enlarged for visibility.</span>
    </div>

    <section aria-label="thermal telemetry" style={{ position: 'absolute', left: 16, right: 16, bottom: 16, display: 'grid', gridTemplateColumns: 'repeat(5, minmax(110px,1fr))', gap: 8, padding: 10, background: 'rgba(5,12,22,.88)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 12, color: '#fff', backdropFilter: 'blur(10px)', zIndex: 20 }}>
      <div><small>Compute heat limit</small><br /><strong>{metric(derived.netCapacityW)}</strong></div>
      <div><small>Gross radiation</small><br /><strong>{metric(derived.radiatorPowerW)}</strong></div>
      <div><small>External loads</small><br /><strong>{metric(derived.externalHeatW)}</strong></div>
      <div><small>Coolant capacity</small><br /><strong>{metric(derived.transportCapacityW)}</strong></div>
      <div><small>Status</small><br /><strong>{derived.status}</strong></div>
    </section>
  </section>;
}
