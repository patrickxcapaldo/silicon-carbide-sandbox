import { Line, OrbitControls, Stars } from '@react-three/drei';
import type { ThermalDerived, ThermalState } from './types';
import { CoolantLoop } from './CoolantLoop';
import { Radiator } from './Radiator';
import { SatelliteBus } from './SatelliteBus';
import { ThermalEnvironment } from './ThermalEnvironment';
import { orbitPoints, satelliteOrbitPosition } from './orbit';

type Props = { state: ThermalState; derived: ThermalDerived };

export function ThermalScene({ state, derived }: Props) {
  const satPos = satelliteOrbitPosition(state.orbitAltitudeKm, state.orbitInclinationDeg, state.orbitRaanDeg, state.orbitArgumentDeg, state.orbitPhaseDeg, state.orbitEccentricity);
  const orbit = orbitPoints(state.orbitAltitudeKm, state.orbitInclinationDeg, state.orbitRaanDeg, state.orbitArgumentDeg, state.orbitEccentricity);
  return <>
    <ThermalEnvironment
      solarLoadWm2={state.solarLoadWm2}
      sinkTempK={state.sinkTempK}
      earthIrTempK={state.earthIrTempK}
      earthViewFactor={state.earthViewFactor}
      earthAlbedo={state.earthAlbedo}
      sunIncidence={state.sunIncidence}
      orbitAltitudeKm={state.orbitAltitudeKm}
      orbitEccentricity={state.orbitEccentricity}
      orbitInclinationDeg={state.orbitInclinationDeg}
      orbitRaanDeg={state.orbitRaanDeg}
      orbitArgumentDeg={state.orbitArgumentDeg}
      orbitPhaseDeg={state.orbitPhaseDeg}
    />
    <Stars radius={90} depth={50} count={1800} factor={1.6} saturation={0.15} fade speed={0.12} />
    <Line points={orbit} color="#7ecfff" transparent opacity={0.55} lineWidth={1.3} />
    <group position={satPos.toArray()} rotation={[0, 0, 0]}>
      <SatelliteBus satelliteTempC={state.satelliteTempC} />
      <Radiator side={-1} radiatorArea={state.radiatorArea} fluxWm2={derived.radiatorFluxWm2} solarLoadWm2={state.solarLoadWm2} solarAbsorptivity={state.solarAbsorptivity} />
      <Radiator side={1} radiatorArea={state.radiatorArea} fluxWm2={derived.radiatorFluxWm2} solarLoadWm2={state.solarLoadWm2} solarAbsorptivity={state.solarAbsorptivity} />
      <CoolantLoop side={-1} radiatorArea={state.radiatorArea} operatingTempC={state.operatingTempC} flowRateKgS={state.flowRateKgS} />
      <CoolantLoop side={1} radiatorArea={state.radiatorArea} operatingTempC={state.operatingTempC} flowRateKgS={state.flowRateKgS} />
    </group>
    <OrbitControls makeDefault enableDamping dampingFactor={0.07} minDistance={7} maxDistance={22} target={[0, 0, 0]} />
  </>;
}
