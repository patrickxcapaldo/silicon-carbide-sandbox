import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { clamp01, inverseLerp } from './thermalColor';
import { EARTH_RADIUS_SCENE, satelliteOrbitPosition } from './orbit';
import { SUN_DIRECTION } from './sceneConstants';

type Props = {
  solarLoadWm2: number; sinkTempK: number; earthIrTempK: number; earthViewFactor: number; earthAlbedo: number;
  sunIncidence: number; orbitAltitudeKm: number; orbitEccentricity: number; orbitInclinationDeg: number; orbitRaanDeg: number; orbitArgumentDeg: number; orbitPhaseDeg: number;
};

function VectorArrow({ start, end, color, opacity = 0.8, headSize = 0.10 }: { start: THREE.Vector3; end: THREE.Vector3; color: string; opacity?: number; headSize?: number }) {
  const dir = end.clone().sub(start);
  const len = dir.length();
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()), [dir.x, dir.y, dir.z]);
  return <group>
    <Line points={[start, end]} color={color} transparent opacity={opacity} lineWidth={1.8} />
    <mesh position={end.toArray()} quaternion={q}>
      <coneGeometry args={[headSize, headSize * 2.2, 12]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
    <mesh position={start.clone().lerp(end, 0.5).toArray()}>
      <sphereGeometry args={[Math.min(0.025, len * 0.012), 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={opacity * 0.5} />
    </mesh>
  </group>;
}

export function ThermalEnvironment({ solarLoadWm2, sinkTempK, earthIrTempK, earthViewFactor, earthAlbedo, sunIncidence, orbitAltitudeKm, orbitEccentricity, orbitInclinationDeg, orbitRaanDeg, orbitArgumentDeg, orbitPhaseDeg }: Props) {
  const solar = clamp01(solarLoadWm2 / 1600);
  const earthHeat = inverseLerp(200, 300, earthIrTempK);
  const satPos = useMemo(() => satelliteOrbitPosition(orbitAltitudeKm, orbitInclinationDeg, orbitRaanDeg, orbitArgumentDeg, orbitPhaseDeg, orbitEccentricity), [orbitAltitudeKm, orbitEccentricity, orbitInclinationDeg, orbitRaanDeg, orbitArgumentDeg, orbitPhaseDeg]);
  const sunDir = useMemo(() => SUN_DIRECTION.clone(), []);
  const earthDir = useMemo(() => satPos.clone().normalize(), [satPos]);
  const sunLength = 1.2 + solar * 1.8;
  const sunStart = satPos.clone().sub(sunDir.clone().multiplyScalar(sunLength));
  const earthStart = earthDir.clone().multiplyScalar(EARTH_RADIUS_SCENE + 0.03);
  const earthEnd = earthStart.clone().lerp(satPos, 0.82);
  const earthVectorScale = 0.25 + earthViewFactor * 0.75;
  const earthMid = earthStart.clone().lerp(earthEnd, earthVectorScale);
  const albedoStart = earthDir.clone().multiplyScalar(EARTH_RADIUS_SCENE + 0.06);
  const albedoEnd = albedoStart.clone().lerp(satPos, Math.min(0.72, 0.22 + earthViewFactor * 0.5));
  const earthColor = useMemo(() => new THREE.Color('#2870aa').lerp(new THREE.Color('#4f8fc0'), earthHeat * 0.5), [earthHeat]);

  return <group>
    <color attach="background" args={['#07111e']} />
    <ambientLight intensity={1.0} />
    <hemisphereLight args={['#c9e5ff', '#16243a', 1.2]} />
    <directionalLight position={sunDir.clone().multiplyScalar(-12).toArray()} intensity={2.6 + solar * 3.0} color="#fff1cf" castShadow />

    <mesh receiveShadow>
      <sphereGeometry args={[EARTH_RADIUS_SCENE, 96, 64]} />
      <meshStandardMaterial color={earthColor} roughness={0.94} metalness={0.01} emissive="#174a79" emissiveIntensity={0.18 + earthHeat * 0.2} />
    </mesh>
    <mesh scale={[1.014, 1.014, 1.014]}>
      <sphereGeometry args={[EARTH_RADIUS_SCENE, 64, 48]} />
      <meshBasicMaterial color="#61bcff" transparent opacity={0.07} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
    </mesh>

    <VectorArrow start={sunStart} end={satPos.clone().multiplyScalar(0.96)} color="#ffb84f" opacity={0.35 + solar * 0.55} headSize={0.12 + solar * 0.05} />
    <VectorArrow start={earthStart} end={earthMid} color="#69d9ff" opacity={0.15 + earthViewFactor * 0.75} headSize={0.06 + earthViewFactor * 0.08} />
    <VectorArrow start={albedoStart} end={albedoEnd} color="#ff9b52" opacity={0.08 + earthAlbedo * earthViewFactor * 0.72} headSize={0.05 + earthAlbedo * 0.05} />

    <group position={satPos.toArray()}>
      <mesh>
        <sphereGeometry args={[0.075 + earthViewFactor * 0.05, 20, 14]} />
        <meshBasicMaterial color="#61d9ff" transparent opacity={0.06 + earthViewFactor * 0.2} blending={THREE.AdditiveBlending} />
      </mesh>
      <VectorArrow start={new THREE.Vector3(0, 0.22, 0)} end={new THREE.Vector3(0, 0.22 + 0.16 + sunIncidence * 0.6, 0)} color="#ffd47d" opacity={0.35 + sunIncidence * 0.6} headSize={0.06 + sunIncidence * 0.04} />
    </group>
  </group>;
}
