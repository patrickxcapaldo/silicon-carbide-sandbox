import * as THREE from 'three';
import { clamp01, inverseLerp } from './thermalColor';
import { radiatorPanelSize } from './spacecraftGeometry';

type Props = { side: -1 | 1; radiatorArea: number; fluxWm2: number; solarLoadWm2: number; solarAbsorptivity: number; };

export function Radiator({ side, radiatorArea, fluxWm2, solarLoadWm2, solarAbsorptivity }: Props) {
  const heat = clamp01(inverseLerp(100, 1100, Math.max(0, fluxWm2)));
  const solar = clamp01(solarLoadWm2 / 1600);
  const { width, height } = radiatorPanelSize(radiatorArea);
  const x = side * (0.36 + width / 2 + 0.22);
  const thermal = new THREE.Color().setHSL(0.58 - heat * 0.58, 0.78, 0.52);
  const panelColor = new THREE.Color('#c8d1d8').lerp(thermal, 0.72);
  const solarGlow = solar * solarAbsorptivity * 0.7;
  return (
    <group position={[x, 0, 0]} rotation={[0, side * 0.12, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, 0.018, height]} />
        <meshStandardMaterial color={panelColor} metalness={0.72} roughness={0.32} emissive={thermal} emissiveIntensity={0.08 + heat * 0.45 + solarGlow} />
      </mesh>
      <mesh position={[0, -0.018, 0]}>
        <boxGeometry args={[width * 1.04, 0.014, height * 1.04]} />
        <meshStandardMaterial color="#49545e" metalness={0.88} roughness={0.3} />
      </mesh>
      {/* simple header/return manifolds */}
      {[-1, 1].map((z) => (
        <mesh key={z} position={[0, 0.04, z * height * 0.48]}>
          <cylinderGeometry args={[0.018, 0.018, width * 0.92, 12]} />
          <meshStandardMaterial color="#65727d" metalness={0.8} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}
