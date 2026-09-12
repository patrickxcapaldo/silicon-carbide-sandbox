import React, { useEffect, useMemo, useState } from 'react';
import { ThermalVisualizer } from './visualizer/ThermalVisualizer';

interface OrbitalThermalViewProps {
  inputs: Record<string, number>;
  onChange: (id: string, value: number) => void;
  results: any;
}

export const OrbitalThermalView: React.FC<OrbitalThermalViewProps> = ({
  inputs,
  onChange,
}) => {
  const [satelliteTempC, setSatelliteTempC] = useState(
    inputs.operatingTempC ?? 70
  );

  useEffect(() => {
    setSatelliteTempC(inputs.operatingTempC ?? 70);
  }, [inputs.operatingTempC]);

  const visualizerInputs = useMemo(
    () => ({
      satelliteTempC,
      operatingTempC: inputs.operatingTempC ?? 70,
      radiatorArea: inputs.radiatorArea ?? 2,
      emissivity: inputs.emissivity ?? 0.9,
      sinkTempK: inputs.sinkTempK ?? 180,
      solarLoadWm2: 700,
      flowRateKgS: 0.35,
    }),
    [
      satelliteTempC,
      inputs.operatingTempC,
      inputs.radiatorArea,
      inputs.emissivity,
      inputs.sinkTempK,
    ]
  );

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '1.5rem',
        }}
      >
        <header
          style={{
            marginBottom: '1rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: '1.75rem',
              color: 'var(--text-h)',
            }}
          >
            Orbital Compute Thermal Rejection Limits
          </h1>

          <p
            style={{
              margin: '0.5rem 0 0',
              color: 'var(--text-muted)',
            }}
          >
            Real-time 3D thermal visualization of the satellite bus,
            radiator, coolant loop, and orbital thermal environment.
          </p>
        </header>

        <ThermalVisualizer
          initialState={visualizerInputs}
          onStateChange={(state) => {
            setSatelliteTempC(state.satelliteTempC);

            if (state.operatingTempC !== inputs.operatingTempC) {
              onChange('operatingTempC', state.operatingTempC);
            }

            if (state.radiatorArea !== inputs.radiatorArea) {
              onChange('radiatorArea', state.radiatorArea);
            }

            if (state.emissivity !== inputs.emissivity) {
              onChange('emissivity', state.emissivity);
            }

            if (state.sinkTempK !== inputs.sinkTempK) {
              onChange('sinkTempK', state.sinkTempK);
            }
          }}
        />
      </div>
    </div>
  );
};