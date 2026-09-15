import { useMemo } from 'react';
import * as THREE from 'three';
import { SUN_DIRECTION } from './sceneConstants';

type Props = { side: -1 | 1; areaM2: number; pointingFactor: number; generationFactor: number };

// A simple repeating solar-cell grid, drawn once and reused. Cheap and
// avoids importing an external texture asset.
function makeCellTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0d1f3d';
  ctx.fillRect(0, 0, size, size);
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, 'rgba(120,170,235,0.16)');
  grad.addColorStop(1, 'rgba(120,170,235,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(150,195,255,0.55)';
  ctx.lineWidth = 1.5;
  const cells = 4;
  for (let i = 1; i < cells; i++) {
    const p = (i / cells) * size;
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * Deployed solar array wing. Unlike the radiator (body-fixed, oriented to
 * minimize solar/Earth loading -- see `sunIncidence`), a real array rotates
 * on a single-axis drive to track the Sun regardless of orbital position.
 * That's modeled here literally: the wing group rotates about its own boom
 * (local Z) axis to align its face with the Sun direction's component
 * perpendicular to the boom, blended toward that ideal angle by
 * `pointingFactor` (1 = perfect tracking, 0 = fixed/undriven).
 */
export function SolarPanel({ side, areaM2, pointingFactor, generationFactor }: Props) {
  const cellTexture = useMemo(() => makeCellTexture(), []);

  const wingArea = Math.max(0.05, areaM2 / 2);
  const aspect = 3.1;
  const length = Math.min(2.3, Math.sqrt(wingArea * aspect) * 0.82);
  const width = Math.max(0.16, Math.min(1.0, Math.sqrt(wingArea / aspect) * 0.82));
  const hinge = 0.235; // just beyond the bus's flush end-panels

  const angle = useMemo(() => {
    // Ideal single-axis rotation (about local Z) that swings the panel's
    // rest-pose normal (+Y) toward the Sun's projection onto the XY plane.
    const ideal = Math.atan2(SUN_DIRECTION.x, SUN_DIRECTION.y);
    return ideal * THREE.MathUtils.clamp(pointingFactor, 0, 1);
  }, [pointingFactor]);

  const glow = 0.12 + THREE.MathUtils.clamp(generationFactor, 0, 1) * 0.55;

  return (
    <group position={[0, 0, side * hinge]} rotation={[0, 0, angle]}>
      {/* short boom/mast */}
      <mesh position={[0, 0, side * length * 0.02]}>
        <cylinderGeometry args={[0.014, 0.014, 0.05, 8]} />
        <meshStandardMaterial color="#5b6670" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, side * length * 0.5]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.01, length]} />
        <meshStandardMaterial
          color="#0d1f3d" metalness={0.15} roughness={0.5}
          map={cellTexture} emissive="#3f8dff" emissiveIntensity={glow}
        />
      </mesh>
      {/* thin frame edge */}
      <mesh position={[0, -0.006, side * length * 0.5]}>
        <boxGeometry args={[width * 1.03, 0.006, length * 1.01]} />
        <meshStandardMaterial color="#2a323c" metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  );
}
