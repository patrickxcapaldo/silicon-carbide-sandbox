import type { SolarState } from './types';
import { DAWN_DUSK_SSO_ORBIT } from '../../../core/orbitalMechanics';

export type ScenarioPreset = {
  id: string;
  name: string;
  blurb: string;
  patch: Partial<SolarState>;
};

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'sso-dawn-dusk-baseline',
    name: 'Dawn-Dusk SSO Baseline',
    blurb: '4 m² array in sun-synchronous dawn-dusk orbit with 100% sunlight. Steady ~1 kW bus generation with zero eclipse penalty.',
    patch: {
      solarArrayAreaM2: 4,
      baseCellEfficiency: 0.30,
      cellOperatingTempC: 65,
      tempCoefficientPwr: -0.0025,
      missionDurationYears: 5,
      annualDegradationRate: 0.015,
      pointingEfficiency: 0.98,
      bosEfficiency: 0.88,
      solarFluxWm2: 1361,
      ...DAWN_DUSK_SSO_ORBIT,
    },
  },
  {
    id: 'leo-noon-midnight-eclipse',
    name: 'Noon-Midnight LEO (36% Eclipse)',
    blurb: 'Low Earth orbit with ~35 minutes of shadow per 96-minute orbit. Eclipse duty cycle cuts orbit-averaged power by more than a third.',
    patch: {
      solarArrayAreaM2: 6,
      baseCellEfficiency: 0.30,
      cellOperatingTempC: 55,
      missionDurationYears: 3,
      annualDegradationRate: 0.015,
      pointingEfficiency: 0.98,
      bosEfficiency: 0.88,
      orbitAltitudeKm: 600,
      orbitEccentricity: 0.001,
      orbitInclinationDeg: 97.8,
      orbitRaanDeg: 0,
      orbitArgumentDeg: 0,
    },
  },
  {
    id: 'meo-gps-radiation',
    name: 'MEO Navigation (Radiation-Limited)',
    blurb: 'Operates in the heart of Earth’s electron radiation belt (20,200 km) for 12 years. Radiation fluence degrades cell junctions by over 25%.',
    patch: {
      solarArrayAreaM2: 12,
      baseCellEfficiency: 0.30,
      cellOperatingTempC: 50,
      missionDurationYears: 12,
      annualDegradationRate: 0.025,
      pointingEfficiency: 0.98,
      bosEfficiency: 0.88,
      orbitAltitudeKm: 20200,
      orbitEccentricity: 0.001,
      orbitInclinationDeg: 55,
      orbitRaanDeg: 25,
      orbitArgumentDeg: 0,
    },
  },
  {
    id: 'geo-telecom-eol',
    name: 'GEO Telecom 15-Year EOL',
    blurb: 'High-power 25 m² commercial communications satellite array at end of 15-year operational life in GEO.',
    patch: {
      solarArrayAreaM2: 25,
      baseCellEfficiency: 0.31,
      cellOperatingTempC: 60,
      missionDurationYears: 15,
      annualDegradationRate: 0.015,
      pointingEfficiency: 0.99,
      bosEfficiency: 0.90,
      orbitAltitudeKm: 35786,
      orbitEccentricity: 0.0002,
      orbitInclinationDeg: 0.02,
      orbitRaanDeg: 0,
      orbitArgumentDeg: 0,
    },
  },
  {
    id: 'hot-array-thermal-derate',
    name: 'Hot Array (95°C Thermal Penalty)',
    blurb: 'Compact spacecraft bus running cells at 95°C equilibrium. High temperature drops bandgap efficiency by over 16% relative to STC.',
    patch: {
      solarArrayAreaM2: 5,
      baseCellEfficiency: 0.30,
      cellOperatingTempC: 95,
      tempCoefficientPwr: -0.0028,
      missionDurationYears: 2,
      annualDegradationRate: 0.015,
      pointingEfficiency: 0.98,
      bosEfficiency: 0.88,
      ...DAWN_DUSK_SSO_ORBIT,
    },
  },
  {
    id: 'cubesat-body-mounted',
    name: '3U CubeSat Body-Mounted Array',
    blurb: 'Small 0.15 m² body-mounted panel without tracking gimbal (pointing efficiency 0.70). Delivers ~18 W orbit average.',
    patch: {
      solarArrayAreaM2: 0.15,
      baseCellEfficiency: 0.28,
      cellOperatingTempC: 45,
      missionDurationYears: 1.5,
      annualDegradationRate: 0.012,
      pointingEfficiency: 0.70,
      bosEfficiency: 0.85,
      orbitAltitudeKm: 500,
      orbitEccentricity: 0.001,
      orbitInclinationDeg: 51.6,
      orbitRaanDeg: 25,
      orbitArgumentDeg: 0,
    },
  },
];
