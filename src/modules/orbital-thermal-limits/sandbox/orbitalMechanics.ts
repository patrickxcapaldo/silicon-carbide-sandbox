/**
 * Pure orbital mechanics.
 *
 * This file has no dependencies of any kind, including Three.js. It is the
 * single source of truth for Kepler propagation in the project. The 3D
 * visualiser (`visualizer/orbit.ts`) wraps these functions to work with
 * `THREE.Vector3`, and the physics kernel (`kernel.ts`) calls them directly
 * to compute how much of an orbit is spent in sunlight.
 *
 * Positions and directions here are plain three-element tuples, not
 * `THREE.Vector3`, precisely so that this file can be imported by the kernel
 * without pulling in a rendering library.
 */

export type Vec3 = [number, number, number];

export const EARTH_RADIUS_KM = 6371;
/** Standard gravitational parameter of Earth, km^3/s^2. */
export const EARTH_MU_KM3_S2 = 398600.4418;

/**
 * A fixed, illustrative sun direction. Not tied to any real epoch, season or
 * beta angle, chosen once so that the visualisation's lighting and this
 * module's eclipse calculation agree with each other. See the assumptions
 * list in `sandbox/module.ts` for what this simplification leaves out.
 */
export const DEFAULT_SUN_DIRECTION: Vec3 = normalize3([-0.82, 0.32, 0.47]);

function clampEccentricity(e: number): number {
  return Math.min(0.95, Math.max(0, e));
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function normalize3(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

export function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

type Mat3 = [Vec3, Vec3, Vec3];

function matMul3(a: Mat3, b: Mat3): Mat3 {
  const r: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) r[i][j] += a[i][k] * b[k][j];
    }
  }
  return r as Mat3;
}

function matVec3(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}

function rotZ(theta: number): Mat3 {
  const c = Math.cos(theta), s = Math.sin(theta);
  return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
}

function rotX(theta: number): Mat3 {
  const c = Math.cos(theta), s = Math.sin(theta);
  return [[1, 0, 0], [0, c, -s], [0, s, c]];
}

/**
 * Orbital plane basis from the classical 3-1-3 rotation sequence
 * Rz(RAAN) * Rx(inclination) * Rz(argument of perigee), applied to the
 * standard basis vectors. `x` points towards perigee, `y` completes the
 * plane, `normal` is the orbital angular momentum direction. Numerically
 * identical to the `THREE.Matrix4`-based version in `visualizer/orbit.ts`,
 * which is checked directly in `model.test.ts`.
 */
export function orbitalBasisPlain(inclinationDeg: number, raanDeg: number, argDeg: number) {
  const m = matMul3(matMul3(rotZ(degToRad(raanDeg)), rotX(degToRad(inclinationDeg))), rotZ(degToRad(argDeg)));
  return {
    x: normalize3(matVec3(m, [1, 0, 0])),
    y: normalize3(matVec3(m, [0, 1, 0])),
    normal: normalize3(matVec3(m, [0, 0, 1])),
  };
}

// ---- Orbit shape and timing -------------------------------------------
//
// `perigeeAltitudeKm` is the altitude at closest approach, so the perigee
// radius is fixed and the semi-major axis grows with eccentricity.

export function semiMajorAxisKm(perigeeAltitudeKm: number, eccentricity: number): number {
  const rp = EARTH_RADIUS_KM + Math.max(0, perigeeAltitudeKm);
  return rp / (1 - clampEccentricity(eccentricity));
}

export function apogeeAltitudeKm(perigeeAltitudeKm: number, eccentricity: number): number {
  const a = semiMajorAxisKm(perigeeAltitudeKm, eccentricity);
  return a * (1 + clampEccentricity(eccentricity)) - EARTH_RADIUS_KM;
}

/** Full two-body orbital period in seconds (Kepler's third law). */
export function orbitalPeriodSeconds(perigeeAltitudeKm: number, eccentricity: number): number {
  const a = semiMajorAxisKm(perigeeAltitudeKm, eccentricity);
  return 2 * Math.PI * Math.sqrt((a * a * a) / EARTH_MU_KM3_S2);
}

/** Orbital radius in kilometres at a given true anomaly. */
export function orbitRadiusKm(perigeeAltitudeKm: number, eccentricity: number, trueAnomalyRad: number): number {
  const rp = EARTH_RADIUS_KM + Math.max(0, perigeeAltitudeKm);
  const e = clampEccentricity(eccentricity);
  return (rp * (1 + e)) / Math.max(0.05, 1 + e * Math.cos(trueAnomalyRad));
}

/** Solve Kepler's equation M = E - e sin(E) for the eccentric anomaly E (radians). */
export function solveEccentricAnomaly(meanAnomalyRad: number, eccentricity: number): number {
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

export function eccentricAnomalyToTrueAnomalyRad(E: number, eccentricity: number): number {
  const e = clampEccentricity(eccentricity);
  const y = Math.sqrt(1 + e) * Math.sin(E / 2);
  const x = Math.sqrt(1 - e) * Math.cos(E / 2);
  return 2 * Math.atan2(y, x);
}

export function trueAnomalyToEccentricAnomalyRad(nu: number, eccentricity: number): number {
  const e = clampEccentricity(eccentricity);
  const y = Math.sqrt(1 - e) * Math.sin(nu / 2);
  const x = Math.sqrt(1 + e) * Math.cos(nu / 2);
  return 2 * Math.atan2(y, x);
}

/** Mean anomaly (rad) -> true anomaly (rad). Governs the correct, non-uniform orbital speed. */
export function meanAnomalyToTrueAnomalyRad(meanAnomalyRad: number, eccentricity: number): number {
  return eccentricAnomalyToTrueAnomalyRad(solveEccentricAnomaly(meanAnomalyRad, eccentricity), eccentricity);
}

/** True anomaly (rad) -> mean anomaly (rad, in [0, 2*pi)). Used to resync a clock to a manually-set phase. */
export function trueAnomalyToMeanAnomalyRad(trueAnomalyRad: number, eccentricity: number): number {
  const e = clampEccentricity(eccentricity);
  const E = trueAnomalyToEccentricAnomalyRad(trueAnomalyRad, eccentricity);
  return E - e * Math.sin(E);
}

/**
 * View factor from a small flat plate, oriented with its surface normal
 * pointing along the local nadir vector, to a spherical Earth of radius
 * EARTH_RADIUS_KM: the standard closed-form result F = (Re / (Re + h))^2.
 * This is the worst case (maximum) Earth loading for a given altitude, used
 * only to seed a sensible default when an orbit preset is selected.
 */
export function nadirEarthViewFactor(altitudeKm: number): number {
  const r = EARTH_RADIUS_KM / (EARTH_RADIUS_KM + Math.max(0, altitudeKm));
  return Math.min(1, Math.max(0, r * r));
}

// ---- Eclipse duty cycle -------------------------------------------------

/**
 * Fraction of one orbit, by time rather than by angle, during which the
 * satellite is illuminated by the Sun rather than inside Earth's shadow.
 *
 * Uses the standard cylindrical-shadow approximation: the shadow is treated
 * as an infinite cylinder of Earth's radius extending directly away from the
 * Sun. This ignores the penumbra and Earth's own finite angular size as seen
 * from the satellite, both second-order corrections at the altitudes this
 * tool covers, and is the same approximation used for first-order eclipse
 * budgeting in mission design.
 *
 * The satellite's position is sampled uniformly in mean anomaly, which is
 * the one orbital angle that genuinely advances at a constant rate with
 * time, rather than uniformly in true anomaly. This is what makes the result
 * correctly time-weighted for eccentric orbits: a sample spends more of the
 * orbit's time near apogee than near perigee, by Kepler's second law, and
 * sampling in mean anomaly reflects that automatically rather than treating
 * every angle as equally likely.
 *
 * A whole orbit is evaluated (the result does not depend on the satellite's
 * current phase), because the quantity this function answers is a property
 * of the orbit's shape and orientation relative to the Sun, not of where the
 * satellite happens to be right now.
 */
export function sunlitFraction(
  perigeeAltitudeKm: number,
  eccentricity: number,
  inclinationDeg: number,
  raanDeg: number,
  argumentDeg: number,
  sunDirection: Vec3 = DEFAULT_SUN_DIRECTION,
  samples = 1440,
): number {
  const basis = orbitalBasisPlain(inclinationDeg, raanDeg, argumentDeg);
  const sun = normalize3(sunDirection);
  let litCount = 0;

  for (let k = 0; k < samples; k++) {
    const meanAnomaly = (k / samples) * Math.PI * 2;
    const nu = meanAnomalyToTrueAnomalyRad(meanAnomaly, eccentricity);
    const r = orbitRadiusKm(perigeeAltitudeKm, eccentricity, nu);
    const cosNu = Math.cos(nu), sinNu = Math.sin(nu);
    const pos: Vec3 = [
      basis.x[0] * cosNu * r + basis.y[0] * sinNu * r,
      basis.x[1] * cosNu * r + basis.y[1] * sinNu * r,
      basis.x[2] * cosNu * r + basis.y[2] * sinNu * r,
    ];
    const posUnit = normalize3(pos);
    const cosAngleFromSun = dot3(posUnit, sun);

    const onNightSide = cosAngleFromSun < 0;
    const perpDistanceSquaredKm2 = r * r * (1 - cosAngleFromSun * cosAngleFromSun);
    const insideShadowCylinder = perpDistanceSquaredKm2 < EARTH_RADIUS_KM * EARTH_RADIUS_KM;

    if (!(onNightSide && insideShadowCylinder)) litCount++;
  }

  return litCount / samples;
}
