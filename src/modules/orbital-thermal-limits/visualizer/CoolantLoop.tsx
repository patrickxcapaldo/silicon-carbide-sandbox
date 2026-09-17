import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { heatColor01, inverseLerp } from './thermalColor';
import { radiatorPanelSize } from './spacecraftGeometry';

type Props = { side: -1 | 1; radiatorArea: number; operatingTempC: number; flowRateKgS: number; };

// A small repeating "flow" texture: soft bright dashes on a black base.
// Scrolling its UV offset along the tube's own length axis (u) each frame
// makes coolant motion visibly follow the pipe. This rides entirely on the
// tube's own geometry/material, so -- unlike screen-space point sprites,
// whose pixel size ignores the parent group's transform -- it automatically
// scales correctly with the rest of the spacecraft in every view.
function makeFlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 8;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 64, 8);
  const dashes = 4;
  for (let i = 0; i < dashes; i++) {
    const cx = (i + 0.5) * (64 / dashes);
    const grad = ctx.createLinearGradient(cx - 8, 0, cx + 8, 0);
    grad.addColorStop(0, '#000000');
    grad.addColorStop(0.5, '#ffffff');
    grad.addColorStop(1, '#000000');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - 8, 0, 16, 8);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 1);
  return tex;
}

export function CoolantLoop({ side, radiatorArea, operatingTempC, flowRateKgS }: Props) {
  const heat = inverseLerp(20, 150, operatingTempC);
  const hot = useMemo(() => heatColor01(heat), [heat]);
  const panelWidth = radiatorPanelSize(radiatorArea).width;
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
  const tubeGeometry = useMemo(() => new THREE.TubeGeometry(curve, 96, 0.016, 10, false), [curve]);
  const flowMap = useMemo(() => makeFlowTexture(), []);

  useFrame((_, delta) => {
    // TubeGeometry's default UVs run u (0..1) along the tube's length, so
    // offsetting u scrolls the dashes along the direction of flow.
    flowMap.offset.x -= delta * (0.07 + flowRateKgS * 0.6) * side;
  });

  return (
    <mesh geometry={tubeGeometry}>
      <meshStandardMaterial
        color="#5b6670" metalness={0.78} roughness={0.3}
        emissive={hot} emissiveMap={flowMap} emissiveIntensity={0.85 + flowRateKgS * 0.6}
      />
    </mesh>
  );
}
