import { Canvas } from '@react-three/fiber';
import { Suspense, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { compute } from '../model';
import { ThermalScene } from './ThermalScene';
import { useThermalGui } from './useThermalGui';
import type { ThermalState } from './types';

const INITIAL_STATE: ThermalState = {
  satelliteTempC: 45,
  operatingTempC: 70,
  radiatorArea: 2,
  emissivity: 0.9,
  sinkTempK: 180,
  solarLoadWm2: 700,
  flowRateKgS: 0.35,
};

type ThermalVisualizerProps = {
  initialState?: ThermalState;
  onStateChange?: (state: ThermalState) => void;
};

export function ThermalVisualizer({
  initialState = INITIAL_STATE,
  onStateChange,
}: ThermalVisualizerProps) {
  const [state, setState] = useState<ThermalState>(initialState);
  const sectionRef = useRef<HTMLElement | null>(null);

  const setStateWithCallback: Dispatch<SetStateAction<ThermalState>> = (
    update
  ) => {
    setState((current) => {
      const nextState =
        typeof update === 'function'
          ? (update as (currentState: ThermalState) => ThermalState)(current)
          : update;

      onStateChange?.(nextState);
      return nextState;
    });
  };

  useThermalGui(state, setStateWithCallback, sectionRef);

  const derived = useMemo(() => {
    const result = compute({
      radiatorArea: state.radiatorArea,
      emissivity: state.emissivity,
      operatingTempC: state.operatingTempC,
      sinkTempK: state.sinkTempK,
    });
    const radiatorPowerW = result.outputs.maxTdpWatts.value;
    return {
      radiatorPowerW,
      radiatorFluxWm2: radiatorPowerW / Math.max(state.radiatorArea, 0.001),
      absorbedSolarW: state.solarLoadWm2 * state.radiatorArea,
    };
  }, [state]);

  return (
    <section
      className="thermal-visualizer"
      ref={sectionRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '1000px',
        margin: '0 auto',
        height: '680px',
        minHeight: 500,
        border: '1px solid var(--border)',
        borderRadius: '14px',
        overflow: 'hidden',
        background: 'rgba(10, 15, 22, 0.85)',
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.18)',
      }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [7.2, 5.1, 8.7], fov: 43, near: 0.1, far: 150 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <ThermalScene state={state} derived={derived} />
        </Suspense>
      </Canvas>

      <section
        aria-label="thermal telemetry"
        style={{
          position: 'absolute', left: 16, bottom: 16, display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))', gap: 8,
          padding: 10, background: 'rgba(5,8,14,.82)', border: '1px solid rgba(255,255,255,.12)',
          borderRadius: 10, color: '#fff', backdropFilter: 'blur(8px)', width: 'calc(100% - 32px)',
        }}
      >
        <div><small>Net radiator rejection</small><br /><strong>{(derived.radiatorPowerW / 1000).toFixed(2)} kW</strong></div>
        <div><small>Radiator heat flux</small><br /><strong>{derived.radiatorFluxWm2.toFixed(0)} W/m²</strong></div>
        <div><small>Solar incidence</small><br /><strong>{state.solarLoadWm2.toFixed(0)} W/m²</strong></div>
        <div><small>Loop temperature</small><br /><strong>{state.operatingTempC.toFixed(0)} °C</strong></div>
      </section>
    </section>
  );
}
