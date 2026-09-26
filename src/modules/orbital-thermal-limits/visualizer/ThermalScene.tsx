import { Line, OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { ThermalDerived, ThermalState } from './types';
import { CoolantLoop } from './CoolantLoop';
import { Radiator } from './Radiator';
import { SatelliteBus } from './SatelliteBus';
import { SolarPanel } from './SolarPanel';
import { ThermalEnvironment } from './ThermalEnvironment';
import { CloseupBackdrop } from './CloseupBackdrop';
import { clamp01 } from './thermalColor';
import { EARTH_RADIUS_SCENE, orbitPoints, orbitRadiusScene, satelliteOrbitPosition } from './orbit';
import { RADIATOR_MAX_REACH, SOLAR_MAX_REACH } from './spacecraftGeometry';

export type ViewMode = 'orbit' | 'closeup';
export type CameraFocus = 'earth' | 'satellite';

type Props = { state: ThermalState; derived: ThermalDerived; viewMode: ViewMode; cameraFocus: CameraFocus };

// The satellite model's farthest possible reach from its own center, once
// radiator panels and solar array wings are extended to their maximum
// configured area. Derived from the same formulas that draw the panels
// (spacecraftGeometry.ts), with a small safety margin, so this stays
// correct if those formulas change. Used to guarantee the shrunk "orbit
// view" marker never visually reaches back down into the Earth mesh, at
// any altitude/eccentricity combination.
const SATELLITE_MAX_REACH_SCENE = Math.max(RADIATOR_MAX_REACH, SOLAR_MAX_REACH) * 1.05;
// Ceiling on how large the marker is ever allowed to look in orbit view --
// keeps it a small, readable "here's the spacecraft" dot rather than a
// giant, not-to-scale model looming over the planet at high altitudes.
const FAR_VIEW_ICON_SCALE = 0.032;

export function ThermalScene({ state, derived, viewMode, cameraFocus }: Props) {
  const satPos = satelliteOrbitPosition(state.orbitAltitudeKm, state.orbitInclinationDeg, state.orbitRaanDeg, state.orbitArgumentDeg, state.orbitPhaseDeg, state.orbitEccentricity);
  const orbit = orbitPoints(state.orbitAltitudeKm, state.orbitInclinationDeg, state.orbitRaanDeg, state.orbitArgumentDeg, state.orbitEccentricity);

  const phaseRad = THREE.MathUtils.degToRad(state.orbitPhaseDeg);
  const orbitRadiusNow = orbitRadiusScene(state.orbitAltitudeKm, state.orbitEccentricity, phaseRad);
  const gapAboveSurface = Math.max(0.0005, orbitRadiusNow - EARTH_RADIUS_SCENE);
  // Never let the marker's rendered extent exceed ~55% of the current gap,
  // and never exceed the fixed icon ceiling either.
  const markerScale = viewMode === 'closeup' ? 1 : Math.min(FAR_VIEW_ICON_SCALE, (gapAboveSurface * 0.55) / SATELLITE_MAX_REACH_SCENE);

  const satelliteGroupPosition = viewMode === 'closeup' ? new THREE.Vector3(0, 0, 0) : satPos;

  const cameraTarget = viewMode === 'closeup'
    ? [0, 0, 0] as [number, number, number]
    : (cameraFocus === 'satellite' ? satPos.toArray() as [number, number, number] : [0, 0, 0] as [number, number, number]);

  const [minDistance, maxDistance] = viewMode === 'closeup'
    // 14 (not 6): with radiatorArea/solarPanelAreaM2 now supporting
    // multi-km monolithic platforms, the log-decade geometry in
    // spacecraftGeometry.ts can render panels several scene units wide, so
    // the close-up camera needs room to zoom out far enough to frame them.
    ? [0.7, 14]
    : (cameraFocus === 'satellite' ? [0.15, 14] : [7, 22]);

  return <>
    {viewMode === 'orbit' ? (
      <>
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
      </>
    ) : (
      <CloseupBackdrop solarLoadWm2={state.solarLoadWm2} earthViewFactor={state.earthViewFactor} />
    )}

    <group position={satelliteGroupPosition.toArray()} scale={[markerScale, markerScale, markerScale]}>
      <SatelliteBus satelliteTempC={state.satelliteTempC} />
      <Radiator side={-1} radiatorArea={state.radiatorArea} fluxWm2={derived.radiatorFluxWm2} solarLoadWm2={state.solarLoadWm2} solarAbsorptivity={state.solarAbsorptivity} />
      <Radiator side={1} radiatorArea={state.radiatorArea} fluxWm2={derived.radiatorFluxWm2} solarLoadWm2={state.solarLoadWm2} solarAbsorptivity={state.solarAbsorptivity} />
      <CoolantLoop side={-1} radiatorArea={state.radiatorArea} operatingTempC={state.operatingTempC} flowRateKgS={state.flowRateKgS} />
      <CoolantLoop side={1} radiatorArea={state.radiatorArea} operatingTempC={state.operatingTempC} flowRateKgS={state.flowRateKgS} />
      <SolarPanel side={-1} areaM2={state.solarPanelAreaM2} pointingFactor={state.solarPanelPointingFactor} generationFactor={clamp01(state.solarLoadWm2 / 1600) * state.solarPanelPointingFactor} />
      <SolarPanel side={1} areaM2={state.solarPanelAreaM2} pointingFactor={state.solarPanelPointingFactor} generationFactor={clamp01(state.solarLoadWm2 / 1600) * state.solarPanelPointingFactor} />
    </group>

    <OrbitControls
      key={`${viewMode}-${cameraFocus}`}
      makeDefault
      enableDamping
      dampingFactor={0.07}
      minDistance={minDistance}
      maxDistance={maxDistance}
      target={cameraTarget}
    />
  </>;
}
