import * as THREE from 'three';
import { Stars, Html } from '@react-three/drei';
import { clamp01 } from './thermalColor';
import { SUN_DIRECTION } from './sceneConstants';

type Props = { solarLoadWm2: number; earthViewFactor: number };

/**
 * The close-up view intentionally decouples visual scale from true orbital
 * geometry: at real-world proportions a metre-scale spacecraft is either
 * invisible next to Earth, or -- if enlarged enough to inspect -- clips
 * straight through the planet's surface at any physically-plausible orbital
 * altitude. Here the spacecraft is rendered at full component detail at the
 * origin, and Earth is pushed to a fixed, generous offset purely as a
 * lit backdrop. This view is for inspecting hardware, not for reading
 * altitude or orbital position -- use the Orbit view for that.
 */
export function CloseupBackdrop({ solarLoadWm2, earthViewFactor }: Props) {
  const solar = clamp01(solarLoadWm2 / 1600);
  const earthColor = new THREE.Color('#2870aa');
  return (
    <group>
      <color attach="background" args={['#07111e']} />
      <ambientLight intensity={1.15} />
      <hemisphereLight args={['#c9e5ff', '#16243a', 1.3]} />
      <directionalLight position={SUN_DIRECTION.clone().multiplyScalar(9).toArray()} intensity={2.4 + solar * 2.2} color="#fff1cf" castShadow />

      <mesh position={[1.6, -6.2, -4.5]} receiveShadow>
        <sphereGeometry args={[5.4, 96, 64]} />
        <meshStandardMaterial color={earthColor} roughness={0.94} metalness={0.01} emissive="#174a79" emissiveIntensity={0.16 + earthViewFactor * 0.15} />
      </mesh>
      <mesh position={[1.6, -6.2, -4.5]} scale={[1.012, 1.012, 1.012]}>
        <sphereGeometry args={[5.4, 64, 48]} />
        <meshBasicMaterial color="#61bcff" transparent opacity={0.06} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
      </mesh>

      <Stars radius={90} depth={50} count={1400} factor={1.6} saturation={0.15} fade speed={0.12} />

      <Html position={[0, -1.35, 0]} center distanceFactor={7} style={{ pointerEvents: 'none' }}>
        <div style={{ color: '#9fd2ef', fontSize: 11, opacity: 0.75, whiteSpace: 'nowrap', textShadow: '0 1px 3px rgba(0,0,0,.8)' }}>
          Close-up view: spacecraft at full detail, Earth shown schematically and not to scale
        </div>
      </Html>
    </group>
  );
}
