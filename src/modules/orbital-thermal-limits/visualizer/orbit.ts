import * as THREE from 'three';

export const EARTH_RADIUS_SCENE = 3.2;
export const EARTH_RADIUS_KM = 6371;
// Standard gravitational parameter of Earth (km^3/s^2).
export const EARTH_MU_KM3_S2 = 398600.4418;

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

// ---- Orbital timing (Kepler two-body propagation) -------------------------
//
// `orbitAltitudeKm` is documented as the perigee altitude, so the perigee
// radius is fixed and the semi-major axis grows with eccentricity.

export function semiMajorAxisKm(perigeeAltitudeKm: number, eccentricity: number) {
  const rp = EARTH_RADIUS_KM + Math.max(0, perigeeAltitudeKm);
  const e = clampEccentricity(eccentricity);
  return rp / (1 - e);
}

export function apogeeAltitudeKm(perigeeAltitudeKm: number, eccentricity: number) {
  const a = semiMajorAxisKm(perigeeAltitudeKm, eccentricity);
  const e = clampEccentricity(eccentricity);
  return a * (1 + e) - EARTH_RADIUS_KM;
}

/** Full two-body orbital period in seconds (Kepler's third law). */
export function orbitalPeriodSeconds(perigeeAltitudeKm: number, eccentricity: number) {
  const a = semiMajorAxisKm(perigeeAltitudeKm, eccentricity);
  return 2 * Math.PI * Math.sqrt((a * a * a) / EARTH_MU_KM3_S2);
}

function clampEccentricity(e: number) {
  return Math.min(0.95, Math.max(0, e));
}

/** Solve Kepler's equation M = E - e sin(E) for the eccentric anomaly E (radians). */
export function solveEccentricAnomaly(meanAnomalyRad: number, eccentricity: number) {
  const e = clampEccentricity(eccentricity);
  const twoPi = Math.PI * 2;
  const M = ((meanAnomalyRad % twoPi) + twoPi) % twoPi;
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 10; i++) {
    const f = E - e * Math.sin(E) - M;
    const fPrime = 1 - e * Math.cos(E);
    E -= f / fPrime;
  }
  return E;
}

export function eccentricAnomalyToTrueAnomalyRad(E: number, eccentricity: number) {
  const e = clampEccentricity(eccentricity);
  const y = Math.sqrt(1 + e) * Math.sin(E / 2);
  const x = Math.sqrt(1 - e) * Math.cos(E / 2);
  return 2 * Math.atan2(y, x);
}

export function trueAnomalyToEccentricAnomalyRad(nu: number, eccentricity: number) {
  const e = clampEccentricity(eccentricity);
  const y = Math.sqrt(1 - e) * Math.sin(nu / 2);
  const x = Math.sqrt(1 + e) * Math.cos(nu / 2);
  return 2 * Math.atan2(y, x);
}

/** Mean anomaly (rad, unwrapped) -> true anomaly (rad). Governs realistic (non-uniform) orbital speed. */
export function meanAnomalyToTrueAnomalyRad(meanAnomalyRad: number, eccentricity: number) {
  const E = solveEccentricAnomaly(meanAnomalyRad, eccentricity);
  return eccentricAnomalyToTrueAnomalyRad(E, eccentricity);
}

/** True anomaly (rad) -> mean anomaly (rad, in [0, 2pi)). Used to resync the clock when the phase slider is dragged. */
export function trueAnomalyToMeanAnomalyRad(trueAnomalyRad: number, eccentricity: number) {
  const e = clampEccentricity(eccentricity);
  const E = trueAnomalyToEccentricAnomalyRad(trueAnomalyRad, eccentricity);
  return E - e * Math.sin(E);
}

/**
 * View factor from a small flat plate, oriented with its surface normal
 * pointing along the local nadir vector, to a spherical Earth of radius
 * EARTH_RADIUS_KM. This is the standard closed-form result
 * F = (Re / (Re + h))^2 and represents the *worst case* (maximum) Earth
 * loading for a given altitude; radiators angled away from nadir will see
 * less. It's used only to seed a sensible default when an orbit preset is
 * selected -- the Earth View Factor control can still be adjusted manually.
 */
export function nadirEarthViewFactor(altitudeKm: number) {
  const ratio = EARTH_RADIUS_KM / (EARTH_RADIUS_KM + Math.max(0, altitudeKm));
  return Math.min(1, Math.max(0, ratio * ratio));
}
