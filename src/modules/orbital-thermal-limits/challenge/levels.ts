import { INPUT_SPECS } from '../sandbox/module';
import type { ChallengeAnswer } from './ceilings';

export interface ChallengeLevel {
  id: string;
  title: string;
  lesson: string;
  inputs: Record<string, number>;
  expectedAnswer: ChallengeAnswer;
}

const defaults = Object.fromEntries(INPUT_SPECS.map(({ key, defaultValue }) => [key, defaultValue]));

export const CHALLENGE_LEVELS: ChallengeLevel[] = [
  {
    id: 'thin-pipe',
    title: 'Thin pipe',
    lesson: 'The coolant loop sets the usable heat ceiling. Extra radiator or array capacity cannot move heat through a narrow pipe.',
    inputs: { ...defaults, computeWattsRequested: 1000, radiatorArea: 10, flowRateKgS: 0.05, coolantDeltaT: 5, solarPanelAreaM2: 20 },
    expectedAnswer: 'coolant',
  },
  {
    id: 'hot-and-small',
    title: 'Hot and small',
    lesson: 'A small radiator facing a warm environment may reject little net heat, even when the coolant loop and array are generous.',
    inputs: {
      ...defaults, computeWattsRequested: 900, radiatorArea: 1, operatingTempC: 85, emissivity: 0.7,
      solarAbsorptivity: 0.3, sinkTempK: 220, earthIrTempK: 270, earthViewFactor: 0.6,
      solarLoadWm2: 1300, sunIncidence: 0.9, flowRateKgS: 0.2, coolantDeltaT: 6,
      solarPanelAreaM2: 14, solarPanelEfficiency: 0.3, solarPanelPointingFactor: 0.98,
    },
    expectedAnswer: 'radiator',
  },
  {
    id: 'starved-array',
    title: 'Starved array',
    lesson: 'Cooling headroom cannot compensate for an array that cannot supply the continuous electrical load.',
    inputs: {
      ...defaults, computeWattsRequested: 900, radiatorArea: 10, earthViewFactor: 0.3,
      solarLoadWm2: 1000, sunIncidence: 0.3, flowRateKgS: 0.7, coolantDeltaT: 15,
      solarPanelAreaM2: 1.5, solarPanelEfficiency: 0.2, solarPanelPointingFactor: 0.8,
    },
    expectedAnswer: 'power',
  },
  {
    id: 'sunny-geo',
    title: 'Sunny GEO',
    lesson: 'An eclipse-free orbit does not guarantee thermal headroom: net radiator rejection can still be the lowest ceiling.',
    inputs: {
      ...defaults, computeWattsRequested: 2500, radiatorArea: 3, emissivity: 0.88, solarAbsorptivity: 0.14,
      sinkTempK: 200, earthViewFactor: 0.03, sunIncidence: 0.5, flowRateKgS: 0.4, coolantDeltaT: 12,
      solarPanelAreaM2: 6, orbitAltitudeKm: 35786, orbitEccentricity: 0.0002,
      orbitInclinationDeg: 0.02, orbitRaanDeg: 0,
    },
    expectedAnswer: 'radiator',
  },
  {
    id: 'big-radiator-thin-pipe',
    title: 'Big radiator, thin pipe',
    lesson: 'A larger radiator cannot overcome a loop that transports less heat than the radiator can reject.',
    inputs: {
      ...defaults, computeWattsRequested: 2000, radiatorArea: 15, operatingTempC: 80, sinkTempK: 200,
      earthViewFactor: 0.2, solarLoadWm2: 1000, sunIncidence: 0.5, flowRateKgS: 0.08,
      coolantDeltaT: 5, parasiticHeatW: 30, solarPanelAreaM2: 30, solarPanelPointingFactor: 0.97,
    },
    expectedAnswer: 'coolant',
  },
  {
    id: 'eclipse-tax',
    title: 'Eclipse tax',
    lesson: 'A continuous load must be compared with orbit-average generation, not the array output in full sunlight.',
    inputs: {
      ...defaults, computeWattsRequested: 600, radiatorArea: 4, operatingTempC: 60, sunIncidence: 0.3,
      flowRateKgS: 0.5, coolantDeltaT: 15, parasiticHeatW: 30, solarPanelAreaM2: 2.4,
      orbitAltitudeKm: 400, orbitInclinationDeg: 30, orbitRaanDeg: 90,
    },
    expectedAnswer: 'power',
  },
  {
    id: 'small-isnt-simple',
    title: 'Small isn’t simple',
    lesson: 'A low absolute load can still be power-limited first when fixed bus demand is large relative to compute.',
    inputs: {
      ...defaults, computeWattsRequested: 100, radiatorArea: 1, operatingTempC: 65,
      earthViewFactor: 0.3, solarLoadWm2: 1000, sunIncidence: 0.3, flowRateKgS: 0.1,
      coolantDeltaT: 8, parasiticHeatW: 30, solarPanelAreaM2: 1.5, solarPanelPointingFactor: 0.97,
    },
    expectedAnswer: 'power',
  },
  {
    id: 'photo-finish',
    title: 'Photo finish',
    lesson: 'Two capacities can sit close together, so compare the net radiator budget with the orbit-average electrical budget.',
    inputs: { ...defaults, computeWattsRequested: 500, radiatorArea: 2.52 },
    expectedAnswer: 'radiator',
  },
  {
    id: 'photo-finish-two',
    title: 'Photo finish II',
    lesson: 'Radiator headroom is not enough if coolant transport is the closest of the three ceilings.',
    inputs: { ...defaults, computeWattsRequested: 2000, radiatorArea: 10.43, solarPanelAreaM2: 20 },
    expectedAnswer: 'coolant',
  },
  {
    id: 'fleet-node',
    title: 'Fleet node',
    lesson: 'At fleet scale the same minimum-ceiling rule applies; only the units and system scale change.',
    inputs: {
      ...defaults, computeWattsRequested: 175000, radiatorArea: 160, operatingTempC: 122,
      earthViewFactor: 0.2, solarLoadWm2: 1000, sunIncidence: 0.2, flowRateKgS: 15,
      coolantDeltaT: 15, parasiticHeatW: 2500, solarPanelAreaM2: 1050, solarPanelPointingFactor: 0.97,
    },
    expectedAnswer: 'radiator',
  },
];
