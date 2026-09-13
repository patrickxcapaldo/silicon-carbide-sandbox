import * as THREE from 'three';

export const EARTH_RADIUS_SCENE = 3.2;
export const EARTH_RADIUS_KM = 6371;

export function orbitalBasis(inclinationDeg: number, raanDeg: number, argDeg: number) {
  const i = THREE.MathUtils.degToRad(inclinationDeg);
  const raan = THREE.MathUtils.degToRad(raanDeg);
  const arg = THREE.MathUtils.degToRad(argDeg);
  const Rz1 = new THREE.Matrix4().makeRotationZ(raan);
  const Rx = new THREE.Matrix4().makeRotationX(i);
  const Rz2 = new THREE.Matrix4().makeRotationZ(arg);
  const m = Rz1.clone().multiply(Rx).multiply(Rz2);
  const x = new THREE.Vector3(1, 0, 0).applyMatrix4(m).normalize();
  const y = new THREE.Vector3(0, 1, 0).applyMatrix4(m).normalize();
  const normal = new THREE.Vector3(0, 0, 1).applyMatrix4(m).normalize();
  return { x, y, normal };
}

export function orbitPerigeeScene(altitudeKm: number) {
  return EARTH_RADIUS_SCENE * (1 + altitudeKm / EARTH_RADIUS_KM);
}

export function orbitRadiusScene(altitudeKm: number, eccentricity = 0, trueAnomalyRad = 0) {
  const rp = orbitPerigeeScene(altitudeKm);
  return rp * (1 + eccentricity) / Math.max(0.05, 1 + eccentricity * Math.cos(trueAnomalyRad));
}

export function satelliteOrbitPosition(
  altitudeKm: number,
  inclinationDeg: number,
  raanDeg: number,
  argDeg: number,
  phaseDeg: number,
  eccentricity = 0,
) {
  const basis = orbitalBasis(inclinationDeg, raanDeg, argDeg);
  const phase = THREE.MathUtils.degToRad(phaseDeg);
  const r = orbitRadiusScene(altitudeKm, eccentricity, phase);
  return basis.x.multiplyScalar(Math.cos(phase) * r).add(basis.y.multiplyScalar(Math.sin(phase) * r));
}

export function orbitPoints(
  altitudeKm: number,
  inclinationDeg: number,
  raanDeg: number,
  argDeg: number,
  eccentricity = 0,
  count = 192,
) {
  const basis = orbitalBasis(inclinationDeg, raanDeg, argDeg);
  return Array.from({ length: count }, (_, idx) => {
    const a = (idx / (count - 1)) * Math.PI * 2;
    const r = orbitRadiusScene(altitudeKm, eccentricity, a);
    return basis.x.clone().multiplyScalar(Math.cos(a) * r).add(basis.y.clone().multiplyScalar(Math.sin(a) * r));
  });
}
