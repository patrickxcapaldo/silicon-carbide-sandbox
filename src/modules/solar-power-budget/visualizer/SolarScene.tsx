import { useMemo } from 'react';
import { Line, OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { SolarDerived, SolarState } from './types';
import { EARTH_RADIUS_SCENE, isPositionSunlit, orbitPoints, orbitRadiusScene, satelliteOrbitPosition } from './orbit';
import { SUN_DIRECTION } from './sceneConstants';

export type ViewMode = 'orbit' | 'closeup';
export type CameraFocus = 'earth' | 'satellite';

type Props = {
  state: SolarState;
  derived: SolarDerived;
  viewMode: ViewMode;
  cameraFocus: CameraFocus;
};

function ShadowCylinder() {
  // Cylindrical shadow projecting from Earth along anti-Sun direction (-SUN_DIRECTION)
  const length = 18;
  const antiSun = useMemo(() => SUN_DIRECTION.clone().negate().normalize(), []);
  const quaternion = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), antiSun),
    [antiSun]
  );
  const position = useMemo(() => antiSun.clone().multiplyScalar(length / 2).toArray(), [antiSun]);

  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[EARTH_RADIUS_SCENE, EARTH_RADIUS_SCENE, length, 48, 1, true]} />
      <meshBasicMaterial
        color="#030814"
        transparent
        opacity={0.32}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function SpacecraftModel({
  isSunlit,
  temperatureC,
  areaM2,
  pointingFactor,
  isCloseup = false,
}: {
  isSunlit: boolean;
  temperatureC: number;
  areaM2: number;
  pointingFactor: number;
  isCloseup?: boolean;
}) {
  // Panel dimensions proportional to sqrt(area)
  const wingLength = isCloseup ? Math.max(1.2, Math.min(4.5, Math.sqrt(areaM2) * 0.9)) : 0.8;
  const wingWidth = isCloseup ? Math.max(0.6, Math.min(1.8, Math.sqrt(areaM2) * 0.4)) : 0.35;
  const busSize = isCloseup ? 0.6 : 0.22;

  // Temperature color shift: blue/cyan at 28°C -> gold at 65°C -> orange/red at 100°C+
  const tempFrac = Math.max(0, Math.min(1, (temperatureC - 20) / 90));
  const panelColor = useMemo(() => {
    if (!isSunlit) return new THREE.Color('#101826');
    const cool = new THREE.Color('#2563eb');
    const mid = new THREE.Color('#38bdf8');
    const hot = new THREE.Color('#f97316');
    return tempFrac < 0.5 ? cool.clone().lerp(mid, tempFrac * 2) : mid.clone().lerp(hot, (tempFrac - 0.5) * 2);
  }, [isSunlit, tempFrac]);

  // Pointing tilt angle
  const tiltAngle = Math.acos(Math.max(0.5, Math.min(1.0, pointingFactor)));

  return (
    <group rotation={[0, tiltAngle, 0]}>
      {/* Central Satellite Bus */}
      <mesh>
        <boxGeometry args={[busSize, busSize, busSize * 1.3]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Gold Multi-layer Insulation Foil Patch */}
      <mesh position={[0, 0, busSize * 0.66]}>
        <boxGeometry args={[busSize * 0.9, busSize * 0.9, 0.02]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.2} metalness={0.9} />
      </mesh>

      {/* Left Solar Array Wing */}
      <group position={[-busSize / 2 - wingLength / 2, 0, 0]}>
        <mesh>
          <boxGeometry args={[wingLength, wingWidth, 0.03]} />
          <meshStandardMaterial
            color={panelColor}
            emissive={isSunlit ? panelColor : '#000000'}
            emissiveIntensity={isSunlit ? 0.35 : 0}
            roughness={0.2}
            metalness={0.6}
          />
        </mesh>
        {/* Cell Grid Lines */}
        {isCloseup && (
          <mesh position={[0, 0, 0.02]}>
            <planeGeometry args={[wingLength * 0.96, wingWidth * 0.92]} />
            <meshBasicMaterial color="#0f172a" wireframe transparent opacity={0.4} />
          </mesh>
        )}
      </group>

      {/* Right Solar Array Wing */}
      <group position={[busSize / 2 + wingLength / 2, 0, 0]}>
        <mesh>
          <boxGeometry args={[wingLength, wingWidth, 0.03]} />
          <meshStandardMaterial
            color={panelColor}
            emissive={isSunlit ? panelColor : '#000000'}
            emissiveIntensity={isSunlit ? 0.35 : 0}
            roughness={0.2}
            metalness={0.6}
          />
        </mesh>
        {isCloseup && (
          <mesh position={[0, 0, 0.02]}>
            <planeGeometry args={[wingLength * 0.96, wingWidth * 0.92]} />
            <meshBasicMaterial color="#0f172a" wireframe transparent opacity={0.4} />
          </mesh>
        )}
      </group>

      {/* Sunlit Beacon */}
      <pointLight
        color={isSunlit ? '#38bdf8' : '#64748b'}
        intensity={isSunlit ? 1.5 : 0.1}
        distance={3}
      />
    </group>
  );
}

export function SolarScene({ state, derived: _derived, viewMode, cameraFocus }: Props) {
  const satPos = satelliteOrbitPosition(
    state.orbitAltitudeKm,
    state.orbitInclinationDeg,
    state.orbitRaanDeg,
    state.orbitArgumentDeg,
    state.orbitPhaseDeg,
    state.orbitEccentricity,
  );

  const orbit = useMemo(
    () =>
      orbitPoints(
        state.orbitAltitudeKm,
        state.orbitInclinationDeg,
        state.orbitRaanDeg,
        state.orbitArgumentDeg,
        state.orbitEccentricity,
      ),
    [state.orbitAltitudeKm, state.orbitInclinationDeg, state.orbitRaanDeg, state.orbitArgumentDeg, state.orbitEccentricity],
  );

  const isSunlit = useMemo(() => isPositionSunlit(satPos), [satPos]);

  const phaseRad = THREE.MathUtils.degToRad(state.orbitPhaseDeg);
  const orbitRadiusNow = orbitRadiusScene(state.orbitAltitudeKm, state.orbitEccentricity, phaseRad);
  const gapAboveSurface = Math.max(0.0005, orbitRadiusNow - EARTH_RADIUS_SCENE);
  const markerScale = viewMode === 'closeup' ? 1 : Math.min(0.045, (gapAboveSurface * 0.55) / 1.5);

  const satelliteGroupPosition = viewMode === 'closeup' ? new THREE.Vector3(0, 0, 0) : satPos;

  const cameraTarget =
    viewMode === 'closeup'
      ? ([0, 0, 0] as [number, number, number])
      : cameraFocus === 'satellite'
        ? (satPos.toArray() as [number, number, number])
        : ([0, 0, 0] as [number, number, number]);

  const [minDist, maxDist] =
    viewMode === 'closeup' ? [1.2, 12] : cameraFocus === 'satellite' ? [0.3, 14] : [6, 25];

  return (
    <>
      <color attach="background" args={['#050c16']} />
      <Stars radius={100} depth={50} count={2200} factor={4} saturation={0.2} fade speed={0.5} />

      <ambientLight intensity={0.4} />
      <hemisphereLight args={['#c9e5ff', '#0a1424', 0.8]} />

      {/* Main Sun Source from [0, 0, 1] */}
      <directionalLight
        position={SUN_DIRECTION.clone().multiplyScalar(18).toArray()}
        intensity={3.2}
        color="#fffbeb"
        castShadow
      />

      {viewMode === 'orbit' && (
        <>
          {/* Earth Body */}
          <mesh receiveShadow>
            <sphereGeometry args={[EARTH_RADIUS_SCENE, 64, 48]} />
            <meshStandardMaterial color="#1e40af" roughness={0.85} metalness={0.05} emissive="#0f2b5c" emissiveIntensity={0.2} />
          </mesh>

          {/* Atmosphere Glow */}
          <mesh scale={[1.018, 1.018, 1.018]}>
            <sphereGeometry args={[EARTH_RADIUS_SCENE, 48, 36]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.12} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
          </mesh>

          {/* Earth Shadow Cylinder in -Z Direction */}
          <ShadowCylinder />

          {/* Orbital Track */}
          <Line points={orbit} color={isSunlit ? '#38bdf8' : '#f43f5e'} lineWidth={1.8} transparent opacity={0.8} />

          {/* Sun Vector Indicator from Space */}
          <Line
            points={[
              SUN_DIRECTION.clone().multiplyScalar(8),
              SUN_DIRECTION.clone().multiplyScalar(4.5),
            ]}
            color="#fef08a"
            lineWidth={2.5}
          />
        </>
      )}

      {/* Spacecraft */}
      <group position={satelliteGroupPosition.toArray()} scale={[markerScale, markerScale, markerScale]}>
        <SpacecraftModel
          isSunlit={isSunlit}
          temperatureC={state.cellOperatingTempC}
          areaM2={state.solarArrayAreaM2}
          pointingFactor={state.pointingEfficiency}
          isCloseup={viewMode === 'closeup'}
        />
      </group>

      <OrbitControls
        target={cameraTarget}
        minDistance={minDist}
        maxDistance={maxDist}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  );
}
