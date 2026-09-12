import { Grid, OrbitControls, Stars } from '@react-three/drei';
import type { ThermalDerived, ThermalState } from './types';
import { CoolantLoop } from './CoolantLoop';
import { Radiator } from './Radiator';
import { SatelliteBus } from './SatelliteBus';
import { ThermalEnvironment } from './ThermalEnvironment';

type Props = { state: ThermalState; derived: ThermalDerived };

export function ThermalScene({ state, derived }: Props) {
  return (
    <>
      <ThermalEnvironment solarLoadWm2={state.solarLoadWm2} sinkTempK={state.sinkTempK} />
      <Stars radius={65} depth={30} count={1300} factor={2.8} saturation={0.2} fade speed={0.15} />

      <group rotation={[0.12, -0.22, -0.04]}>
        <SatelliteBus satelliteTempC={state.satelliteTempC} />
        <Radiator side={-1} radiatorArea={state.radiatorArea} fluxWm2={derived.radiatorFluxWm2} solarLoadWm2={state.solarLoadWm2} />
        <Radiator side={1} radiatorArea={state.radiatorArea} fluxWm2={derived.radiatorFluxWm2} solarLoadWm2={state.solarLoadWm2} />
        <CoolantLoop side={-1} radiatorArea={state.radiatorArea} operatingTempC={state.operatingTempC} flowRateKgS={state.flowRateKgS} />
        <CoolantLoop side={1} radiatorArea={state.radiatorArea} operatingTempC={state.operatingTempC} flowRateKgS={state.flowRateKgS} />
      </group>

      <Grid
        position={[0, -3.1, 0]}
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.2}
        sectionSize={5}
        sectionThickness={0.45}
        fadeDistance={18}
        fadeStrength={1.2}
        infiniteGrid
      />

      <OrbitControls makeDefault enableDamping dampingFactor={0.06} minDistance={5} maxDistance={17} />
    </>
  );
}
