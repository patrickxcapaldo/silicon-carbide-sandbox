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
    blurb: 'Roughly 420 km circular at 51.6° inclination, with a period of about 93 minutes. Typical of crewed low Earth orbit and many Earth-observation smallsats.',
    altitudeKm: 420, eccentricity: 0.001, inclinationDeg: 51.6, raanDeg: 25, argumentDeg: 0, phaseDeg: 0,
  },
  {
    id: 'leo-sso',
    label: 'Sun-synchronous LEO',
    blurb: 'Roughly 600 km circular at about 97.8°, which is retrograde and near-polar. It keeps a consistent local solar time on each pass, so it is common for imaging satellites.',
    altitudeKm: 600, eccentricity: 0.001, inclinationDeg: 97.8, raanDeg: 25, argumentDeg: 0, phaseDeg: 0,
  },
  {
    id: 'meo-gps',
    label: 'Medium Earth Orbit (GPS-like)',
    blurb: 'Roughly 20,200 km circular at 55°, with a period of about 12 hours. Typical of GNSS and navigation constellations.',
    altitudeKm: 20200, eccentricity: 0.001, inclinationDeg: 55, raanDeg: 25, argumentDeg: 0, phaseDeg: 0,
  },
  {
    id: 'geo',
    label: 'Geostationary (GEO)',
    blurb: 'Roughly 35,786 km at close to 0° inclination. It matches Earth\u2019s rotation, with a period of about 23 hours and 56 minutes, and Earth subtends a small, nearly fixed angle from up there.',
    altitudeKm: 35786, eccentricity: 0.0002, inclinationDeg: 0.02, raanDeg: 0, argumentDeg: 0, phaseDeg: 0,
  },
  {
    id: 'heo-molniya',
    label: 'Highly Elliptical (Molniya-type)',
    blurb: 'Roughly 600 by 39,700 km at 63.4°, the critical inclination that avoids apsidal drift. The period is about 12 hours, with a long, slow dwell near apogee and large altitude and thermal swings on every orbit.',
    altitudeKm: 600, eccentricity: 0.7373, inclinationDeg: 63.4, raanDeg: 25, argumentDeg: 270, phaseDeg: 0,
  },
];
