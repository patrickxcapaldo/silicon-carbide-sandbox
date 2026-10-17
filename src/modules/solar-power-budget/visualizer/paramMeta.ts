import type { SolarState } from './types';

export type ParamMeta = {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  description: string;
  logScale?: boolean;
  logFloor?: number;
};

export const PARAM_META: Record<keyof SolarState, ParamMeta> = {
  // Photovoltaic Array
  solarArrayAreaM2: {
    label: 'Solar array area',
    unit: 'm²',
    min: 0.1,
    max: 100,
    step: 0.1,
    logScale: true,
    logFloor: 0.1,
    description: 'Total active photovoltaic cell aperture area across deployed array wings or body panels.',
  },
  baseCellEfficiency: {
    label: 'Cell efficiency (STC)',
    unit: 'η',
    min: 0.05,
    max: 0.50,
    step: 0.01,
    description: 'Bolometric cell efficiency at Standard Test Conditions (28 °C, AM0 1361 W/m²). Modern multi-junction space cells ~30-32%.',
  },
  cellOperatingTempC: {
    label: 'Cell operating temp',
    unit: '°C',
    min: -40,
    max: 150,
    step: 1,
    description: 'Equilibrium temperature of the solar array under direct solar illumination. Cell efficiency drops linearly above STC 28 °C.',
  },
  tempCoefficientPwr: {
    label: 'Temp coefficient',
    unit: '1/K',
    min: -0.005,
    max: 0,
    step: 0.0001,
    description: 'Fractional change in power output per Kelvin increase above STC 28 °C (typically -0.20% to -0.30%/K for multi-junction GaAs).',
  },
  missionDurationYears: {
    label: 'Mission lifetime',
    unit: 'yr',
    min: 0,
    max: 20,
    step: 0.5,
    description: 'Elapsed mission lifetime over which space radiation fluence degrades solar cell junctions.',
  },
  annualDegradationRate: {
    label: 'Annual degradation',
    unit: '1/yr',
    min: 0,
    max: 0.05,
    step: 0.001,
    description: 'Compound annual performance degradation rate due to radiation fluence and coverglass darkening.',
  },
  pointingEfficiency: {
    label: 'Pointing factor',
    unit: '0-1',
    min: 0.5,
    max: 1.0,
    step: 0.01,
    description: 'Cosine tracking factor cos(θ) accounting for solar array gimbal drive alignment error or sun off-pointing.',
  },
  bosEfficiency: {
    label: 'Balance of system',
    unit: '0-1',
    min: 0.5,
    max: 1.0,
    step: 0.01,
    description: 'Combined efficiency of cell packing, coverglass transmissivity, diode drops, harness I²R losses, and PCDU power electronics.',
  },
  solarFluxWm2: {
    label: 'Solar irradiance',
    unit: 'W/m²',
    min: 1250,
    max: 1450,
    step: 5,
    description: 'Solar constant at Earth orbit distance (1 AU, ~1361 W/m²).',
  },

  // Orbit
  orbitAltitudeKm: {
    label: 'Perigee altitude',
    unit: 'km',
    min: 160,
    max: 40000,
    step: 10,
    description: 'Altitude above mean Earth radius at closest approach. Directly dictates orbital period and eclipse geometry.',
  },
  orbitEccentricity: {
    label: 'Eccentricity',
    unit: '',
    min: 0,
    max: 0.90,
    step: 0.01,
    description: 'Orbital eccentricity (0 is perfectly circular, ~0.74 for Molniya).',
  },
  orbitInclinationDeg: {
    label: 'Inclination',
    unit: '°',
    min: 0,
    max: 180,
    step: 1,
    description: 'Tilt of orbital plane relative to Earth equator (97.8° is typical LEO sun-synchronous).',
  },
  orbitRaanDeg: {
    label: 'RAAN',
    unit: '°',
    min: 0,
    max: 360,
    step: 1,
    description: 'Right ascension of ascending node, orienting orbital plane relative to the fixed Sun vector.',
  },
  orbitArgumentDeg: {
    label: 'Argument of perigee',
    unit: '°',
    min: 0,
    max: 360,
    step: 1,
    description: 'Orientation of the orbital ellipse within its plane.',
  },
  orbitPhaseDeg: {
    label: 'Orbital phase',
    unit: '°',
    min: 0,
    max: 360,
    step: 1,
    description: 'Current true anomaly of the satellite along its orbit.',
  },
};
