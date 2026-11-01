import React, { useMemo } from 'react';
import { ThermalVisualizer } from './visualizer/ThermalVisualizer';
import { Explainer } from './visualizer/Explainer';
import { ChallengeGame } from './challenge/ChallengeGame';
import type { ThermalState } from './visualizer/types';
import { DAWN_DUSK_SSO_ORBIT } from './sandbox/orbitalMechanics';
import { createRunRecord } from './runRecord';
import { manifest } from './manifest';
import { ModulePageFrame } from '../../core/ModulePageFrame';
import { ModuleModes } from '../../core/ModuleModes';
import { downloadRunRecord } from '../../core/ui';
import { PlayGame } from './play/PlayGame';

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
  const handleExport = () => downloadRunRecord(createRunRecord(inputs));
  return (
    <ModulePageFrame manifest={manifest}>
      <Explainer />
      <ModuleModes
        challenge={<ChallengeGame />}
        play={<PlayGame />}
        explore={
          <ThermalVisualizer
            initialState={initialState}
            onStateChange={(state) => {
              Object.entries(state).forEach(([id, value]) => onChange(id, value as number));
            }}
            onExport={handleExport}
          />
        }
      />
    </ModulePageFrame>
  );
};
export default View;
