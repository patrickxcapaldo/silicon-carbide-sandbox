import { DAWN_DUSK_SSO_ORBIT } from '../../../core/orbitalMechanics';

export type OrbitPreset = {
  id: string;
  label: string;
  blurb: string;
  altitudeKm: number;
  eccentricity: number;
  inclinationDeg: number;
  raanDeg: number;
  argumentDeg: number;
  phaseDeg: number;
};

export const ORBIT_PRESETS: OrbitPreset[] = [
  {
    id: 'leo-dawn-dusk-sso',
    label: 'Dawn-Dusk SSO (0% Eclipse)',
    blurb: 'Sun-synchronous 600 km dawn-dusk orbit with high beta angle (~70°), ensuring continuous illumination with 0% shadow time.',
    altitudeKm: DAWN_DUSK_SSO_ORBIT.orbitAltitudeKm,
    eccentricity: DAWN_DUSK_SSO_ORBIT.orbitEccentricity,
    inclinationDeg: DAWN_DUSK_SSO_ORBIT.orbitInclinationDeg,
    raanDeg: DAWN_DUSK_SSO_ORBIT.orbitRaanDeg,
    argumentDeg: DAWN_DUSK_SSO_ORBIT.orbitArgumentDeg,
    phaseDeg: DAWN_DUSK_SSO_ORBIT.orbitPhaseDeg,
  },
  {
    id: 'leo-noon-midnight-sso',
    label: 'Noon-Midnight SSO (Max Eclipse)',
    blurb: 'Sun-synchronous 600 km orbit crossing noon/midnight. Array experiences ~35 minutes in Earth shadow each 96-minute revolution.',
    altitudeKm: 600,
    eccentricity: 0.001,
    inclinationDeg: 97.8,
    raanDeg: 0,
    argumentDeg: 0,
    phaseDeg: 0,
  },
  {
    id: 'leo-iss',
    label: 'Low Earth Orbit (ISS-like)',
    blurb: '420 km circular at 51.6° inclination with ~93-minute period and ~36% eclipse fraction under the standard Sun vector.',
    altitudeKm: 420,
    eccentricity: 0.001,
    inclinationDeg: 51.6,
    raanDeg: 25,
    argumentDeg: 0,
    phaseDeg: 0,
  },
  {
    id: 'meo-gps',
    label: 'Medium Earth Orbit (GPS-like)',
    blurb: '20,200 km circular at 55° with ~12-hour period. Substantially reduced eclipse duty cycle (~8%), but crosses the outer Van Allen radiation belt.',
    altitudeKm: 20200,
    eccentricity: 0.001,
    inclinationDeg: 55,
    raanDeg: 25,
    argumentDeg: 0,
    phaseDeg: 0,
  },
  {
    id: 'geo',
    label: 'Geostationary (GEO)',
    blurb: '35,786 km equatorial orbit with ~24-hour period. Sunlight is near continuous except for brief equinox eclipse seasons (<5%).',
    altitudeKm: 35786,
    eccentricity: 0.0002,
    inclinationDeg: 0.02,
    raanDeg: 0,
    argumentDeg: 0,
    phaseDeg: 0,
  },
  {
    id: 'heo-molniya',
    label: 'Highly Elliptical (Molniya-type)',
    blurb: '600 × 39,700 km elliptical orbit at 63.4° critical inclination. Spends majority of its 12-hour orbit in sunlight high above the northern hemisphere.',
    altitudeKm: 600,
    eccentricity: 0.7373,
    inclinationDeg: 63.4,
    raanDeg: 25,
    argumentDeg: 270,
    phaseDeg: 0,
  },
];
