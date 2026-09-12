import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { clamp01, inverseLerp } from './thermalColor';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uHeat;
  uniform float uSolar;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorldNormal;

  vec3 palette(float t) {
    vec3 cold = vec3(0.05, 0.20, 0.32);
    vec3 cyan = vec3(0.08, 0.70, 1.00);
    vec3 amber = vec3(1.00, 0.48, 0.04);
    vec3 red = vec3(1.00, 0.04, 0.00);
    if (t < 0.42) return mix(cold, cyan, t / 0.42);
    if (t < 0.78) return mix(cyan, amber, (t - 0.42) / 0.36);
    return mix(amber, red, (t - 0.78) / 0.22);
  }

  void main() {
    float edge = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.78, vUv.x);
    float longitudinal = 0.70 + 0.30 * sin(vUv.y * 16.0 + uTime * 0.35);
    float hotspot = 1.0 - 0.25 * distance(vUv, vec2(0.5));
    float thermal = clamp(uHeat * longitudinal * hotspot, 0.0, 1.0);
    vec3 heat = palette(thermal);

    // A small solar-facing bias makes external heating legible without hiding
    // the net-radiation heat map.
    vec3 solarTint = vec3(1.0, 0.58, 0.15) * uSolar * 0.16;
    vec3 base = vec3(0.025, 0.035, 0.045);
    vec3 color = mix(base, heat, 0.26 + 0.74 * uHeat) + solarTint;

    float gridX = smoothstep(0.97, 1.0, abs(sin(vUv.x * 42.0)));
    float gridY = smoothstep(0.97, 1.0, abs(sin(vUv.y * 20.0)));
    color += (gridX + gridY) * 0.08;
    color *= 0.65 + 0.35 * edge;

    gl_FragColor = vec4(color, 1.0);
  }
`;

type Props = {
  side: -1 | 1;
  radiatorArea: number;
  fluxWm2: number;
  solarLoadWm2: number;
};

export function Radiator({ side, radiatorArea, fluxWm2, solarLoadWm2 }: Props) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const heat = clamp01(inverseLerp(100, 1100, Math.max(0, fluxWm2)));
  const solar = clamp01(solarLoadWm2 / 1600);

  // Split total area over two panels. Preserve a believable aspect ratio while
  // changing actual rendered dimensions, not just a heat-map parameter.
  const [width, height] = useMemo(() => {
    const onePanelArea = radiatorArea / 2;
    const aspect = 1.85;
    return [Math.sqrt(onePanelArea * aspect), Math.sqrt(onePanelArea / aspect)];
  }, [radiatorArea]);

  useFrame(({ clock }) => {
    if (!material.current) return;
    material.current.uniforms.uTime.value = clock.elapsedTime;
    material.current.uniforms.uHeat.value = heat;
    material.current.uniforms.uSolar.value = solar;
  });

  return (
    <group position={[side * (1.5 + width / 2), 0, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, height, 48, 24]} />
        <shaderMaterial
          ref={material}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          side={THREE.DoubleSide}
          uniforms={{
            uHeat: { value: heat },
            uSolar: { value: solar },
            uTime: { value: 0 },
          }}
          toneMapped={false}
        />
      </mesh>

      {/* panel frame */}
      <mesh position={[0, -0.025, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width * 1.035, height * 1.07]} />
        <meshStandardMaterial color="#535c64" metalness={0.9} roughness={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
