import React, { useMemo } from 'react';
import { ThermalVisualizer } from './visualizer/ThermalVisualizer';
import { Explainer } from './visualizer/Explainer';
import type { ThermalState } from './visualizer/types';
import { orbitalThermalLimits } from './sandbox/module';
import { createRunRecord } from './runRecord';
import { BUILD_INFO } from '../../core/buildInfo';
import { DAWN_DUSK_SSO_ORBIT } from './sandbox/orbitalMechanics';
import type { Result } from '../../core/types';

interface OrbitalThermalViewProps { inputs: Record<string, number>; onChange: (id: string, value: number) => void; results: Result; }

export const OrbitalThermalView: React.FC<OrbitalThermalViewProps> = ({ inputs, onChange }) => {
  const visualizerInputs = useMemo<Partial<ThermalState>>(() => ({
    satelliteTempC: inputs.operatingTempC ?? 45, operatingTempC: inputs.operatingTempC ?? 70, radiatorArea: inputs.radiatorArea ?? 2,
    emissivity: inputs.emissivity ?? 0.9, solarAbsorptivity: inputs.solarAbsorptivity ?? 0.12, sinkTempK: inputs.sinkTempK ?? 180,
    earthIrTempK: inputs.earthIrTempK ?? 255, earthViewFactor: inputs.earthViewFactor ?? 0.35, earthAlbedo: inputs.earthAlbedo ?? 0.30,
    solarLoadWm2: inputs.solarLoadWm2 ?? 700, sunIncidence: inputs.sunIncidence ?? 0.75, flowRateKgS: inputs.flowRateKgS ?? 0.35,
    coolantDeltaT: inputs.coolantDeltaT ?? 10, parasiticHeatW: inputs.parasiticHeatW ?? 40, computeWattsRequested: inputs.computeWattsRequested ?? 300,
    solarPanelAreaM2: inputs.solarPanelAreaM2 ?? 4, solarPanelEfficiency: inputs.solarPanelEfficiency ?? 0.29, solarPanelPointingFactor: inputs.solarPanelPointingFactor ?? 0.95,
    orbitAltitudeKm: inputs.orbitAltitudeKm ?? DAWN_DUSK_SSO_ORBIT.orbitAltitudeKm,
    orbitEccentricity: inputs.orbitEccentricity ?? DAWN_DUSK_SSO_ORBIT.orbitEccentricity,
    orbitInclinationDeg: inputs.orbitInclinationDeg ?? DAWN_DUSK_SSO_ORBIT.orbitInclinationDeg,
    orbitRaanDeg: inputs.orbitRaanDeg ?? DAWN_DUSK_SSO_ORBIT.orbitRaanDeg,
    orbitArgumentDeg: inputs.orbitArgumentDeg ?? DAWN_DUSK_SSO_ORBIT.orbitArgumentDeg,
    orbitPhaseDeg: inputs.orbitPhaseDeg ?? DAWN_DUSK_SSO_ORBIT.orbitPhaseDeg,
  }), [inputs]);
  const handleExport = () => {
    const record = createRunRecord(inputs);
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${record.software.moduleId}-v${record.software.moduleReleaseVersion}-${record.createdAt.slice(0, 10)}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return <div style={{ width: '100%', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
      <header style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ minWidth: 0, flex: '1 1 25rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--text-h)' }}>Orbital Compute Thermal Rejection Limits</h1>
          <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)' }}>Interactive orbital thermal balance with explicit environmental loads and orbit controls.</p>
          <p style={{ margin: '0.4rem 0 0', color: 'var(--text-muted)', fontSize: '0.78rem', fontFamily: 'var(--mono)' }}>
            Module {orbitalThermalLimits.descriptor.releaseVersion} · Sandbox {BUILD_INFO.sandboxVersion}
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          style={{ background: 'var(--accent)', color: '#fff', border: 0, borderRadius: '6px', padding: '0.6rem 0.85rem', font: 'inherit', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Export run JSON
        </button>
      </header>
      <Explainer />
      <ThermalVisualizer initialState={visualizerInputs} onStateChange={(state) => Object.entries(state).forEach(([id, value]) => onChange(id, value as number))} />
    </div>
  </div>;
};
