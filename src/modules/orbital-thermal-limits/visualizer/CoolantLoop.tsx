import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { heatColor01, inverseLerp } from './thermalColor';

type Props = {
  side: -1 | 1;
  radiatorArea: number;
  operatingTempC: number;
  flowRateKgS: number;
};

const PARTICLES = 70;

export function CoolantLoop({ side, radiatorArea, operatingTempC, flowRateKgS }: Props) {
  const points = useRef<THREE.Points>(null);
  const tRef = useRef(0);
  const heat = inverseLerp(20, 120, operatingTempC);
  const color = useMemo(() => heatColor01(heat), [heat]);

  const panelWidth = Math.sqrt((radiatorArea / 2) * 1.85);
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 1.0, -0.15, 0.45),
        new THREE.Vector3(side * 1.35, -0.2, 0.6),
        new THREE.Vector3(side * (1.75 + panelWidth * 0.25), -0.18, 0.25),
        new THREE.Vector3(side * (1.5 + panelWidth * 0.75), -0.18, 0.0),
      ]),
    [side, panelWidth],
  );

  const tubeGeometry = useMemo(() => new THREE.TubeGeometry(curve, 48, 0.035, 8, false), [curve]);
  const positions = useMemo(() => new Float32Array(PARTICLES * 3), []);

  useFrame((_, delta) => {
    if (!points.current) return;
    tRef.current = (tRef.current + delta * (0.06 + flowRateKgS * 0.34)) % 1;
    const attr = points.current.geometry.getAttribute('position') as THREE.BufferAttribute;

    for (let i = 0; i < PARTICLES; i++) {
      const offset = (tRef.current + i / PARTICLES) % 1;
      const p = curve.getPoint(offset);
      attr.setXYZ(i, p.x, p.y, p.z);
    }
    attr.needsUpdate = true;
  });

  return (
    <group>
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6 + heat * 2.0}
          transparent
          opacity={0.55}
          roughness={0.25}
        />
      </mesh>

      <points ref={points}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color={color}
          size={0.065 + flowRateKgS * 0.035}
          sizeAttenuation
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
