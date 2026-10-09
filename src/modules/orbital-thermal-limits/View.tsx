import React, { useMemo } from 'react';
import { ThermalVisualizer } from './visualizer/ThermalVisualizer';
import { Explainer } from './visualizer/Explainer';
import type { ThermalState } from './visualizer/types';
import { DAWN_DUSK_SSO_ORBIT } from './sandbox/orbitalMechanics';
import { createRunRecord } from './runRecord';
import { manifest } from './manifest';
import { ModulePageFrame } from '../../core/ModulePageFrame';

interface ViewProps { inputs: Record<string, number>; onChange: (id: string, value: number) => void; results: unknown; }

const View: React.FC<ViewProps> = ({ inputs, onChange }) => {
  const initialState = useMemo<Partial<ThermalState>>(() => ({
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
  return (
    <ModulePageFrame manifest={manifest}>
        <div style={{ maxWidth: 780 }}>
          <Explainer />
      </div>
      <ThermalVisualizer
        initialState={initialState}
        onStateChange={(state) => {
          Object.entries(state).forEach(([id, value]) => onChange(id, value as number));
        }}
        onExport={handleExport}
      />
    </ModulePageFrame>
  );
};
export default View;
