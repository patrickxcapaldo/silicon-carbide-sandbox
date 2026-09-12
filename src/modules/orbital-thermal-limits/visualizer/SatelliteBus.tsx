import { useMemo } from 'react';
import { inverseLerp, temperatureColor } from './thermalColor';

type Props = { satelliteTempC: number };

export function SatelliteBus({ satelliteTempC }: Props) {
  const color = useMemo(() => temperatureColor(satelliteTempC), [satelliteTempC]);
  const heat = inverseLerp(20, 135, satelliteTempC);

  return (
    <group>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.4, 1.75, 2.2]} />
        <meshStandardMaterial
          color={color}
          metalness={0.82}
          roughness={0.28}
          emissive={color}
          emissiveIntensity={0.03 + heat * heat * 3.0}
        />
      </mesh>

      {/* Structural panels / MLI details */}
      {[-1.12, 1.12].map((z) => (
        <mesh key={z} position={[0, 0, z]}>
          <boxGeometry args={[2.05, 1.4, 0.035]} />
          <meshStandardMaterial color="#b79b47" metalness={0.75} roughness={0.36} />
        </mesh>
      ))}

      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.42, 0.48, 0.42, 32]} />
        <meshStandardMaterial color="#9ca6ad" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}
