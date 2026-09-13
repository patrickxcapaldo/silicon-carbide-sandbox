import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { heatColor01, inverseLerp } from './thermalColor';

type Props = { side: -1 | 1; radiatorArea: number; operatingTempC: number; flowRateKgS: number; };
const PARTICLES = 42;

export function CoolantLoop({ side, radiatorArea, operatingTempC, flowRateKgS }: Props) {
  const points = useRef<THREE.Points>(null);
  const tRef = useRef(side === 1 ? 0 : 0.5);
  const heat = inverseLerp(20, 150, operatingTempC);
  const hot = heatColor01(heat);
  const cold = heatColor01(Math.max(0, heat - 0.16));
  const panelWidth = Math.min(2.2, Math.sqrt(Math.max(0.1, radiatorArea / 2) * 2) * 0.78);
  const x = side * (0.28 + panelWidth + 0.22);
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * 0.22, 0.10, 0.12),
    new THREE.Vector3(side * 0.48, 0.10, 0.12),
    new THREE.Vector3(x - side * 0.10, 0.10, 0.12),
    new THREE.Vector3(x, 0.10, 0.0),
    new THREE.Vector3(x, 0.10, -0.18),
    new THREE.Vector3(x - side * 0.10, 0.10, -0.18),
    new THREE.Vector3(side * 0.48, 0.10, -0.12),
    new THREE.Vector3(side * 0.22, 0.10, -0.12),
  ]), [side, x]);
  const tubeGeometry = useMemo(() => new THREE.TubeGeometry(curve, 72, 0.014, 8, false), [curve]);
  const positions = useMemo(() => new Float32Array(PARTICLES * 3), []);
  useFrame((_, delta) => {
    if (!points.current) return;
    tRef.current = (tRef.current + delta * (0.04 + flowRateKgS * 0.14)) % 1;
    const attr = points.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < PARTICLES; i++) {
      const u = (tRef.current + i / PARTICLES) % 1;
      const p = curve.getPoint(u);
      attr.setXYZ(i, p.x, p.y + Math.sin(u * Math.PI * 2) * 0.004, p.z);
    }
    attr.needsUpdate = true;
  });
  return <group>
    <mesh geometry={tubeGeometry}>
      <meshStandardMaterial color="#71808c" metalness={0.8} roughness={0.3} />
    </mesh>
    <points ref={points}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial color={hot.clone().lerp(cold, 0.35)} size={0.045 + flowRateKgS * 0.02} sizeAttenuation transparent opacity={1} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  </group>;
}
