import React, { useMemo, useState } from 'react';
import { SolarVisualizer } from './visualizer/SolarVisualizer';
import { Explainer } from './visualizer/Explainer';
import { ChallengeGame } from './challenge/ChallengeGame';
import type { SolarState } from './visualizer/types';
import { DAWN_DUSK_SSO_ORBIT } from '../../core/orbitalMechanics';
import { createRunRecord } from './runRecord';
import { manifest } from './manifest';
import { ModulePageFrame } from '../../core/ModulePageFrame';
import { ModeToggle } from '../../core/challenge/ModeToggle';

interface ViewProps {
  inputs: Record<string, number>;
  onChange: (id: string, value: number) => void;
  results: unknown;
}

const View: React.FC<ViewProps> = ({ inputs, onChange }) => {
  const [mode, setMode] = useState<'explore' | 'challenge'>('explore');

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
      <Explainer />
      <ModeToggle mode={mode} onChange={setMode} />
      <div id="module-tool">
        <div hidden={mode !== 'challenge'}>
          <ChallengeGame />
        </div>
        {mode === 'explore' && (
          <SolarVisualizer
            initialState={initialState}
            onStateChange={(state) => {
              Object.entries(state).forEach(([id, value]) => onChange(id, value as number));
            }}
            onExport={handleExport}
          />
        )}
      </div>
    </ModulePageFrame>
  );
};

export default View;
