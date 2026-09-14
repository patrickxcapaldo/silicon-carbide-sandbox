import React, { useMemo } from 'react';
import { ThermalVisualizer } from './visualizer/ThermalVisualizer';
import type { ThermalState } from './visualizer/types';

interface ViewProps { inputs: Record<string, number>; onChange: (id: string, value: number) => void; results: unknown; }

const View: React.FC<ViewProps> = ({ inputs, onChange }) => {
  const initialState = useMemo<Partial<ThermalState>>(() => ({
    satelliteTempC: inputs.operatingTempC ?? 45, operatingTempC: inputs.operatingTempC ?? 70, radiatorArea: inputs.radiatorArea ?? 2,
    emissivity: inputs.emissivity ?? 0.9, solarAbsorptivity: inputs.solarAbsorptivity ?? 0.12, sinkTempK: inputs.sinkTempK ?? 180,
    earthIrTempK: inputs.earthIrTempK ?? 255, earthViewFactor: inputs.earthViewFactor ?? 0.35, earthAlbedo: inputs.earthAlbedo ?? 0.30,
    solarLoadWm2: inputs.solarLoadWm2 ?? 700, sunIncidence: inputs.sunIncidence ?? 0.75, flowRateKgS: inputs.flowRateKgS ?? 0.35,
    coolantDeltaT: inputs.coolantDeltaT ?? 10, parasiticHeatW: inputs.parasiticHeatW ?? 40, computeWattsRequested: inputs.computeWattsRequested ?? 300,
    orbitAltitudeKm: inputs.orbitAltitudeKm ?? 550, orbitEccentricity: inputs.orbitEccentricity ?? 0.01, orbitInclinationDeg: inputs.orbitInclinationDeg ?? 51.6,
    orbitRaanDeg: inputs.orbitRaanDeg ?? 25, orbitArgumentDeg: inputs.orbitArgumentDeg ?? 0, orbitPhaseDeg: inputs.orbitPhaseDeg ?? 35,
  }), [inputs]);
  return <div style={{ width: '100%', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
      <header style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--text-h)' }}>Orbital Compute Thermal Rejection Limits</h1>
        <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)' }}>Thermal balance, radiator loading, coolant transport and orbital geometry.</p>
      </header>
      <ThermalVisualizer initialState={initialState} onStateChange={(state) => {
        Object.entries(state).forEach(([id, value]) => onChange(id, value as number));
      }} />
    </div>
  </div>;
};
export default View;
