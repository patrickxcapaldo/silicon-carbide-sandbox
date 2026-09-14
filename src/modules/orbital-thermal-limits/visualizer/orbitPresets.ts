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

// Altitude is perigee altitude, matching the manifest parameter. Eccentricity
// and inclination are representative of real operational orbits of each
// class, not any single specific mission.
export const ORBIT_PRESETS: OrbitPreset[] = [
  {
    id: 'leo-iss',
    label: 'Low Earth Orbit (ISS-like)',
    blurb: '~420 km circular, 51.6° inclination. ~93 min period. Typical of crewed LEO and many Earth-observation smallsats.',
    altitudeKm: 420, eccentricity: 0.001, inclinationDeg: 51.6, raanDeg: 25, argumentDeg: 0, phaseDeg: 0,
  },
  {
    id: 'leo-sso',
    label: 'Sun-synchronous LEO',
    blurb: '~600 km circular, ~97.8° (retrograde, near-polar). Keeps consistent local solar time each pass; common for imaging satellites.',
    altitudeKm: 600, eccentricity: 0.001, inclinationDeg: 97.8, raanDeg: 25, argumentDeg: 0, phaseDeg: 0,
  },
  {
    id: 'meo-gps',
    label: 'Medium Earth Orbit (GPS-like)',
    blurb: '~20,200 km circular, 55°. ~12 h period. Typical of GNSS/navigation constellations.',
    altitudeKm: 20200, eccentricity: 0.001, inclinationDeg: 55, raanDeg: 25, argumentDeg: 0, phaseDeg: 0,
  },
  {
    id: 'geo',
    label: 'Geostationary (GEO)',
    blurb: '~35,786 km, ~0° inclination. Matches Earth\u2019s rotation (~23 h 56 m period); Earth subtends a small, nearly fixed angle.',
    altitudeKm: 35786, eccentricity: 0.0002, inclinationDeg: 0.02, raanDeg: 0, argumentDeg: 0, phaseDeg: 0,
  },
  {
    id: 'heo-molniya',
    label: 'Highly Elliptical (Molniya-type)',
    blurb: '~600 \u00d7 ~39,700 km, 63.4° (critical inclination avoids apsidal drift). ~12 h period with a long, slow dwell near apogee and large altitude/thermal swings each orbit.',
    altitudeKm: 600, eccentricity: 0.7373, inclinationDeg: 63.4, raanDeg: 25, argumentDeg: 270, phaseDeg: 0,
  },
];
