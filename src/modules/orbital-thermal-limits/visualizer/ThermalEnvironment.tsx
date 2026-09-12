import { useMemo } from 'react';
import * as THREE from 'three';
import { clamp01, inverseLerp } from './thermalColor';

type Props = { solarLoadWm2: number; sinkTempK: number };

export function ThermalEnvironment({ solarLoadWm2, sinkTempK }: Props) {
  const solar = clamp01(solarLoadWm2 / 1600);
  const sink = inverseLerp(3, 250, sinkTempK);

  const bg = useMemo(() => {
    const space = new THREE.Color('#010205');
    const earthIR = new THREE.Color('#101a2a');
    return space.lerp(earthIR, sink * 0.42);
  }, [sink]);

  const arrowLength = 4 + solar * 3;

  return (
    <group>
      <color attach="background" args={[bg]} />
      <ambientLight intensity={0.07 + sink * 0.12} />
      <directionalLight
        position={[7, 4, 5]}
        intensity={0.15 + solar * 4.2}
        color="#ffd29b"
        castShadow
      />

      {/* Stylized solar heat vector. */}
      <primitive
        object={new THREE.ArrowHelper(
          new THREE.Vector3(-1, -0.2, -0.25).normalize(),
          new THREE.Vector3(5.8, 2.4, 2.8),
          arrowLength,
          new THREE.Color('#ff9f35'),
          0.42,
          0.22,
        )}
      />

      {/* Earth IR/albedo context; deliberately subtle and non-geographic. */}
      <mesh position={[0, -7.5, -3.5]}>
        <sphereGeometry args={[5.3, 64, 64]} />
        <meshStandardMaterial
          color="#183a62"
          emissive="#173252"
          emissiveIntensity={0.08 + sink * 0.28}
          roughness={0.95}
        />
      </mesh>
    </group>
  );
}
