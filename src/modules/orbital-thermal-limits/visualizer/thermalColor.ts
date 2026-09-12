import * as THREE from 'three';

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const inverseLerp = (a: number, b: number, v: number) =>
  clamp01((v - a) / (b - a));

/**
 * Temperature palette:
 * cold -> steel/blue, nominal -> near-black, hot -> orange/red.
 * The midpoint is intentionally dark to preserve a metallic spacecraft look.
 */
export function temperatureColor(tempC: number, min = -20, max = 140) {
  const t = inverseLerp(min, max, tempC);
  const cold = new THREE.Color('#3f78a8');
  const neutral = new THREE.Color('#101318');
  const hot = new THREE.Color('#ff3b0a');

  return t < 0.48
    ? cold.clone().lerp(neutral, t / 0.48)
    : neutral.clone().lerp(hot, (t - 0.48) / 0.52);
}

export function heatColor01(t: number) {
  const x = clamp01(t);
  const cold = new THREE.Color('#55c7ff');
  const warm = new THREE.Color('#ffb13b');
  const hot = new THREE.Color('#ff2500');
  return x < 0.55
    ? cold.clone().lerp(warm, x / 0.55)
    : warm.clone().lerp(hot, (x - 0.55) / 0.45);
}
