import React, { useMemo } from 'react';
import { SolarVisualizer } from './visualizer/SolarVisualizer';
import { Explainer } from './visualizer/Explainer';
import { ChallengeGame } from './challenge/ChallengeGame';
import type { SolarState } from './visualizer/types';
import { DAWN_DUSK_SSO_ORBIT } from '../../core/orbitalMechanics';
import { createRunRecord } from './runRecord';
import { manifest } from './manifest';
import { ModulePageFrame } from '../../core/ModulePageFrame';
import { ModuleModes } from '../../core/ModuleModes';
import { downloadRunRecord } from '../../core/ui';
import { PlayGame } from './play/PlayGame';

interface ViewProps {
  inputs: Record<string, number>;
  onChange: (id: string, value: number) => void;
  results: unknown;
}

const View: React.FC<ViewProps> = ({ inputs, onChange }) => {
  const initialState = useMemo<Partial<SolarState>>(
    () => ({
      solarArrayAreaM2: inputs.solarArrayAreaM2 ?? 4.0,
      baseCellEfficiency: inputs.baseCellEfficiency ?? 0.30,
      cellOperatingTempC: inputs.cellOperatingTempC ?? 65,
      tempCoefficientPwr: inputs.tempCoefficientPwr ?? -0.0025,
      missionDurationYears: inputs.missionDurationYears ?? 5.0,
      annualDegradationRate: inputs.annualDegradationRate ?? 0.015,
      pointingEfficiency: inputs.pointingEfficiency ?? 0.98,
      bosEfficiency: inputs.bosEfficiency ?? 0.88,
      solarFluxWm2: inputs.solarFluxWm2 ?? 1361,
      orbitAltitudeKm: inputs.orbitAltitudeKm ?? DAWN_DUSK_SSO_ORBIT.orbitAltitudeKm,
      orbitEccentricity: inputs.orbitEccentricity ?? DAWN_DUSK_SSO_ORBIT.orbitEccentricity,
      orbitInclinationDeg: inputs.orbitInclinationDeg ?? DAWN_DUSK_SSO_ORBIT.orbitInclinationDeg,
      orbitRaanDeg: inputs.orbitRaanDeg ?? DAWN_DUSK_SSO_ORBIT.orbitRaanDeg,
      orbitArgumentDeg: inputs.orbitArgumentDeg ?? DAWN_DUSK_SSO_ORBIT.orbitArgumentDeg,
      orbitPhaseDeg: inputs.orbitPhaseDeg ?? DAWN_DUSK_SSO_ORBIT.orbitPhaseDeg,
    }),
    [inputs],
  );

  const handleExport = () => downloadRunRecord(createRunRecord(inputs));

  return (
    <ModulePageFrame manifest={manifest}>
      <Explainer />
      <ModuleModes
        challenge={<ChallengeGame />}
        play={<PlayGame />}
        explore={
          <SolarVisualizer
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
