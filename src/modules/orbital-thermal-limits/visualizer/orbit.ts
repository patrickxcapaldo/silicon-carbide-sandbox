import * as THREE from 'three';
import * as OM from '../sandbox/orbitalMechanics';

/**
 * Three.js-facing orbital mechanics. All the actual mathematics lives in
 * `sandbox/orbitalMechanics.ts`, which has no dependencies of any kind so
 * that the physics kernel can use it too. This file only converts between
 * that module's plain number tuples and `THREE.Vector3`, for rendering.
 */

export const EARTH_RADIUS_SCENE = 3.2;
export const EARTH_RADIUS_KM = OM.EARTH_RADIUS_KM;

function toVector3(v: OM.Vec3): THREE.Vector3 {
  return new THREE.Vector3(v[0], v[1], v[2]);
}

export function orbitalBasis(inclinationDeg: number, raanDeg: number, argDeg: number) {
  const basis = OM.orbitalBasisPlain(inclinationDeg, raanDeg, argDeg);
  return { x: toVector3(basis.x), y: toVector3(basis.y), normal: toVector3(basis.normal) };
}

export function orbitPerigeeScene(altitudeKm: number) {
  return EARTH_RADIUS_SCENE * (1 + altitudeKm / EARTH_RADIUS_KM);
}

export function orbitRadiusScene(altitudeKm: number, eccentricity = 0, trueAnomalyRad = 0) {
  const rp = orbitPerigeeScene(altitudeKm);
  return (rp * (1 + eccentricity)) / Math.max(0.05, 1 + eccentricity * Math.cos(trueAnomalyRad));
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

// ---- Orbital timing, view factor and eclipse: thin re-exports ------------
// These are pure and take no Three.js types, so they are passed straight
// through rather than wrapped.

export const semiMajorAxisKm = OM.semiMajorAxisKm;
export const apogeeAltitudeKm = OM.apogeeAltitudeKm;
export const orbitalPeriodSeconds = OM.orbitalPeriodSeconds;
export const solveEccentricAnomaly = OM.solveEccentricAnomaly;
export const eccentricAnomalyToTrueAnomalyRad = OM.eccentricAnomalyToTrueAnomalyRad;
export const trueAnomalyToEccentricAnomalyRad = OM.trueAnomalyToEccentricAnomalyRad;
export const meanAnomalyToTrueAnomalyRad = OM.meanAnomalyToTrueAnomalyRad;
export const trueAnomalyToMeanAnomalyRad = OM.trueAnomalyToMeanAnomalyRad;
export const nadirEarthViewFactor = OM.nadirEarthViewFactor;
export const sunlitFraction = OM.sunlitFraction;
