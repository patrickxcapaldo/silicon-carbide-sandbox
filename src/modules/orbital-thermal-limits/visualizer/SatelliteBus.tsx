import { useMemo } from 'react';
import { inverseLerp, temperatureColor } from './thermalColor';

type Props = { satelliteTempC: number };

export function SatelliteBus({ satelliteTempC }: Props) {
  const color = useMemo(() => temperatureColor(satelliteTempC), [satelliteTempC]);
  const heat = inverseLerp(20, 150, satelliteTempC);
  return (
    <group>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.48, 0.36, 0.42]} />
        <meshStandardMaterial color={color} metalness={0.75} roughness={0.32} emissive={color} emissiveIntensity={0.08 + heat * 0.5} />
      </mesh>
      {[-0.215, 0.215].map((z) => (
        <mesh key={z} position={[0, 0, z]}>
          <boxGeometry args={[0.40, 0.29, 0.012]} />
          <meshStandardMaterial color="#c6aa55" metalness={0.65} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 0.24, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.04, 24]} />
        <meshStandardMaterial color="#aeb7bd" metalness={0.85} roughness={0.22} />
      </mesh>
      <mesh position={[0, -0.22, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.04, 16]} />
        <meshStandardMaterial color="#202a32" metalness={0.5} roughness={0.35} />
      </mesh>
    </group>
  );
}
