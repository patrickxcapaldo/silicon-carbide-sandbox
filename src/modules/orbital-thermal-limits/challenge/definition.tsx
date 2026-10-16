import { createElement, type ReactNode } from 'react';
import { BUILD_INFO } from '../../../core/buildInfo';
import type {
  ChallengeDefinition,
  ChallengeDifficulty,
  ChallengeEvaluation,
  ChallengeLevel,
} from '../../../core/challenge/types';
import { INPUT_SPECS, orbitalThermalLimits } from '../sandbox/module';
import type { OrbitalThermalResult } from '../sandbox/module';
import { MODULE_RELEASE_VERSION } from '../version';
import { ORBIT_PRESETS } from '../visualizer/orbitPresets';
import { formatWatts } from '../visualizer/format';
import { ceilingsOf, type ChallengeAnswer } from './ceilings';
import { roundChallengeInputForDisplay as roundForDisplay } from './displayPrecision';
import { Formulas, Reveal, SpecCard } from './ChallengeParts';
import { CHALLENGE_LEVELS } from './levels';

const answerOptions = [
  { id: 'radiator', label: 'Radiator' },
  { id: 'coolant', label: 'Coolant' },
  { id: 'power', label: 'Power' },
];

const defaults = Object.fromEntries(INPUT_SPECS.map(({ key, defaultValue }) => [key, defaultValue]));
const roundStep = (value: number, step: number) => Math.round(value / step) * step;

function difficultyForGap(gapPct: number): ChallengeDifficulty | 'mixed' {
  if (gapPct >= 200) return 'easy';
  if (gapPct >= 30 && gapPct <= 100) return 'medium';
  if (gapPct >= 10 && gapPct < 30) return 'hard';
  return 'mixed';
}

const classicLevels: ChallengeLevel<Record<string, number>>[] = CHALLENGE_LEVELS.map((level) => {
  const evaluation = evaluate(level.inputs);
  return {
    id: level.id,
    title: level.title,
    lesson: level.lesson,
    inputs: level.inputs,
    difficulty: difficultyForGap(evaluation.gapPct),
    archetype: level.id,
  };
});

const randomArchetypes: Record<ChallengeAnswer, string[]> = {
  radiator: ['small-hot-radiator', 'geo-no-eclipse', 'fleet-scale'],
  coolant: ['thin-coolant-loop', 'low-delta-coolant-loop'],
  power: ['weak-array', 'leo-eclipse-tax', 'small-node-overhead'],
};

const archetypeLessons: Record<string, string> = {
  'thin-coolant-loop': 'A larger radiator cannot increase coolant transport.',
  'low-delta-coolant-loop': 'A smaller coolant temperature rise can limit heat transport even when the loop has substantial flow.',
  'small-hot-radiator': 'Warm surroundings and absorbed sunlight reduce the radiator capacity left for compute.',
  'weak-array': 'Thermal headroom cannot supply missing electrical power.',
  'leo-eclipse-tax': 'Eclipse lowers orbit-average array generation even when the array works in sunlight.',
  'small-node-overhead': 'Fixed bus demand takes a larger share of a small system’s electrical budget.',
  'geo-no-eclipse': 'No eclipse does not guarantee that radiator rejection is the largest ceiling.',
  'fleet-scale': 'At fleet scale the same three-ceiling comparison still applies.',
};

function baseInputs(): Record<string, number> {
  return { ...defaults };
}

function applyOrbitPreset(inputs: Record<string, number>, presetId: string): void {
  const preset = ORBIT_PRESETS.find(({ id }) => id === presetId);
  if (!preset) throw new Error(`Unknown orbit preset: ${presetId}`);
  inputs.orbitAltitudeKm = preset.altitudeKm;
  inputs.orbitEccentricity = preset.eccentricity;
  inputs.orbitInclinationDeg = preset.inclinationDeg;
  inputs.orbitRaanDeg = preset.raanDeg;
  inputs.orbitArgumentDeg = preset.argumentDeg;
}

function evaluateResult(inputs: Record<string, number>): OrbitalThermalResult {
  return orbitalThermalLimits.run(inputs);
}

function outputValue(inputs: Record<string, number>, key: 'netRadiatorCapacityW' | 'transportCapacityW' | 'powerCeiling'): number {
  const result = evaluateResult(inputs);
  if (key === 'powerCeiling') return result.values.generatedPowerW - result.resolvedInputs.parasiticHeatW;
  return result.values[key];
}

function setLinearlyDependentInput(
  inputs: Record<string, number>,
  inputKey: 'radiatorArea' | 'flowRateKgS' | 'solarPanelAreaM2',
  outputKey: 'netRadiatorCapacityW' | 'transportCapacityW' | 'powerCeiling',
  target: number,
): void {
  const first = roundForDisplay(inputKey, inputKey === 'radiatorArea' || inputKey === 'solarPanelAreaM2' ? 1 : 0.1);
  const second = roundForDisplay(inputKey, inputKey === 'radiatorArea' || inputKey === 'solarPanelAreaM2' ? 2 : 0.2);
  const firstInputs = { ...inputs, [inputKey]: first };
  const secondInputs = { ...inputs, [inputKey]: second };
  const firstValue = outputValue(firstInputs, outputKey);
  const secondValue = outputValue(secondInputs, outputKey);
  const slope = (secondValue - firstValue) / (second - first);
  if (!Number.isFinite(slope) || slope <= 0) throw new Error(`Cannot tune ${inputKey} for ${outputKey}.`);
  const chosen = first + (target - firstValue) / slope;
  if (chosen <= 0 || chosen > 2e7) throw new Error(`The requested ${outputKey} is outside the supported ${inputKey} range.`);
  inputs[inputKey] = roundForDisplay(inputKey, chosen);
}

function difficultyRatio(rng: () => number, difficulty: ChallengeDifficulty, roundIndex: number): number {
  const progress = roundIndex / 9;
  if (difficulty === 'easy') return 0.15 + progress * 0.16 + rng() * 0.002;
  if (difficulty === 'medium') return 0.5 + progress * 0.22 + rng() * 0.002;
  return 0.78 + progress * 0.11 + rng() * 0.001;
}

function randomInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function prepareCommonInputs(rng: () => number, archetype: string): Record<string, number> {
  const inputs = baseInputs();
  inputs.operatingTempC = randomInt(rng, 95, 145);
  inputs.solarPanelEfficiency = roundForDisplay('solarPanelEfficiency', 0.35 + rng() * 0.05);
  inputs.solarPanelPointingFactor = roundForDisplay('solarPanelPointingFactor', 0.94 + rng() * 0.05);
  if (archetype === 'small-hot-radiator') {
    inputs.emissivity = 0.78 + roundStep(rng() * 0.13, 0.01);
    inputs.solarAbsorptivity = 0.12 + roundStep(rng() * 0.1, 0.01);
    inputs.sinkTempK = randomInt(rng, 160, 210);
    inputs.earthViewFactor = roundForDisplay('earthViewFactor', 0.25 + rng() * 0.3);
  }
  if (archetype === 'small-node-overhead') inputs.parasiticHeatW = 30;
  if (archetype === 'geo-no-eclipse') applyOrbitPreset(inputs, 'geo');
  if (archetype === 'leo-eclipse-tax') applyOrbitPreset(inputs, 'leo-iss');
  if (archetype === 'fleet-scale') {
    applyOrbitPreset(inputs, 'leo-dawn-dusk-sso');
    inputs.operatingTempC = randomInt(rng, 110, 150);
  }
  return inputs;
}

function generatedLesson(archetype: string, evaluation: ChallengeEvaluation): string {
  const ordered = Object.entries(evaluation.values).sort((left, right) => left[1] - right[1]);
  const first = ordered[0];
  const second = ordered[1];
  const labels = Object.fromEntries(answerOptions.map((option) => [option.id, option.label]));
  return `The ${labels[first[0]]} ceiling is ${evaluation.formattedValues?.[first[0]] ?? formatWatts(first[1])}, below ${labels[second[0]]} at ${evaluation.formattedValues?.[second[0]] ?? formatWatts(second[1])}. ${archetypeLessons[archetype]}`;
}

function makeRandomLevel(
  rng: () => number,
  difficulty: ChallengeDifficulty,
  answer: ChallengeAnswer,
  archetype: string,
  roundIndex: number,
): ChallengeLevel<Record<string, number>> {
  const inputs = prepareCommonInputs(rng, archetype);
  const ratio = difficultyRatio(rng, difficulty, roundIndex);
  inputs.computeWattsRequested = roundForDisplay(
    'computeWattsRequested',
    archetype === 'fleet-scale' ? randomInt(rng, 100000, 900000) : randomInt(rng, 100, 5000),
  );

  const fleet = archetype === 'fleet-scale';
  const smallNode = archetype === 'small-node-overhead';

  if (fleet) {
    inputs.solarPanelAreaM2 = roundForDisplay('solarPanelAreaM2', randomInt(rng, 2500, 5000));
    inputs.flowRateKgS = randomInt(rng, 100, 220);
    inputs.coolantDeltaT = randomInt(rng, 35, 70);
    const targetPower = outputValue(inputs, 'powerCeiling');
    setLinearlyDependentInput(inputs, 'radiatorArea', 'netRadiatorCapacityW', targetPower * ratio);
  } else if (answer === 'radiator') {
    inputs.flowRateKgS = 1.5;
    inputs.coolantDeltaT = 80;
    inputs.solarPanelAreaM2 = 30;
    const power = outputValue(inputs, 'powerCeiling');
    setLinearlyDependentInput(inputs, 'radiatorArea', 'netRadiatorCapacityW', power * ratio);
  } else if (answer === 'coolant') {
    inputs.radiatorArea = 100;
    inputs.coolantDeltaT = archetype === 'low-delta-coolant-loop' ? 5 : randomInt(rng, 15, 35);
    inputs.solarPanelAreaM2 = archetype === 'low-delta-coolant-loop' ? 100 : 30;
    const power = outputValue(inputs, 'powerCeiling');
    setLinearlyDependentInput(inputs, 'radiatorArea', 'netRadiatorCapacityW', power * 2);
    setLinearlyDependentInput(inputs, 'flowRateKgS', 'transportCapacityW', power * ratio);
  } else {
    inputs.flowRateKgS = 1.5;
    inputs.coolantDeltaT = 80;
    if (smallNode) inputs.computeWattsRequested = roundForDisplay('computeWattsRequested', 100);
    inputs.solarPanelAreaM2 = 30;
    const maximumPower = outputValue(inputs, 'powerCeiling');
    const targetRadiator = maximumPower * 0.82;
    setLinearlyDependentInput(inputs, 'radiatorArea', 'netRadiatorCapacityW', targetRadiator);
    const targetPower = targetRadiator * ratio;
    setLinearlyDependentInput(inputs, 'solarPanelAreaM2', 'powerCeiling', targetPower);
  }

  Object.keys(inputs).forEach((key) => {
    if (['computeWattsRequested', 'radiatorArea', 'operatingTempC', 'flowRateKgS', 'coolantDeltaT', 'solarPanelAreaM2', 'solarPanelEfficiency', 'solarPanelPointingFactor'].includes(key)) {
      inputs[key] = roundForDisplay(key, inputs[key]);
    }
  });

  const evaluation = evaluate(inputs);
  return {
    id: `${archetype}-${Math.floor(rng() * 36 ** 5).toString(36)}`,
    title: archetype.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    lesson: generatedLesson(archetype, evaluation),
    inputs,
    difficulty,
    archetype,
  };
}

function generateLevel(
  rng: () => number,
  difficulty: ChallengeDifficulty,
  context: { answerId: string; avoidArchetype?: string; roundIndex: number },
): ChallengeLevel<Record<string, number>> {
  const answer = context.answerId as ChallengeAnswer;
  const available = randomArchetypes[answer].filter((archetype) => archetype !== context.avoidArchetype);
  if (available.length === 0) throw new Error(`No ${answer} archetype is available after ${context.avoidArchetype}.`);
  return makeRandomLevel(rng, difficulty, answer, available[Math.floor(rng() * available.length)], context.roundIndex);
}

function evaluate(inputs: Record<string, number>): ChallengeEvaluation {
  const result = evaluateResult(inputs);
  const ceilings = ceilingsOf(result);
  const formattedValues = {
    radiator: formatWatts(ceilings.radiator),
    coolant: formatWatts(ceilings.coolant),
    power: formatWatts(ceilings.power),
  };
  return {
    answerId: ceilings.answer,
    values: { radiator: ceilings.radiator, coolant: ceilings.coolant, power: ceilings.power },
    formattedValues,
    status: result.status,
    diagnostics: result.diagnostics
      .filter((diagnostic) => diagnostic.key !== undefined)
      .map((diagnostic) => diagnostic.message),
    sunlitFraction: result.values.orbitSunlitFraction,
    gapPct: ceilings.gapPct,
    details: result,
  };
}

function hints(
  _level: ChallengeLevel<Record<string, number>>,
  evaluation: ChallengeEvaluation,
): [{ title: string; working: ReactNode }, { title: string; working: ReactNode }, { title: string; working: ReactNode }] {
  const result = evaluation.details as OrbitalThermalResult;
  const inputs = result.resolvedInputs;
  const values = result.values;
  const powerCeiling = values.generatedPowerW - inputs.parasiticHeatW;
  const coolantSpecificHeat = values.transportCapacityW / (inputs.flowRateKgS * inputs.coolantDeltaT);
  return [
    {
      title: 'Trace the inputs',
      working: createElement('p', null, 'R depends on radiator area, operating temperature, emissivity, space sink temperature, Earth IR and view factor, absorptivity, albedo, solar flux, Sun incidence and parasitic load. C depends on coolant flow and ΔT. E depends on array area, efficiency, pointing, the given sunlit fraction and parasitic load.'),
    },
    {
      title: 'Work out coolant and power',
      working: createElement(
        'p',
        null,
        `C = ${inputs.flowRateKgS} kg/s × ${coolantSpecificHeat.toLocaleString('en-GB')} J/kg·K × ${inputs.coolantDeltaT} K = ${formatWatts(values.transportCapacityW)}. E = ${formatWatts(values.generatedPowerW)} − ${formatWatts(inputs.parasiticHeatW)} = ${formatWatts(powerCeiling)}.`,
      ),
    },
    {
      title: 'Work out the radiator ceiling',
      working: createElement(
        'p',
        null,
        `R = ${formatWatts(values.radiativeRejectionW)} − ${formatWatts(values.absorbedSolarW)} − ${formatWatts(values.absorbedAlbedoW)} − ${formatWatts(inputs.parasiticHeatW)} = ${formatWatts(values.netRadiatorCapacityW)}.`,
      ),
    },
  ];
}

export const orbitalThermalChallenge: ChallengeDefinition<Record<string, number>> = {
  id: 'orbital-thermal-limits',
  title: 'What Breaks First?',
  versionInfo: `Silicon Carbide Sandbox v${BUILD_INFO.sandboxVersion} · orbital-thermal-limits v${MODULE_RELEASE_VERSION}`,
  options: answerOptions,
  classicLevels,
  generate(rng, difficulty, context) {
    return generateLevel(rng, difficulty, context);
  },
  evaluate,
  hints,
  SpecCard,
  Reveal,
  Formulas,
  timeLimitsSeconds: { easy: 12 * 60, medium: 10 * 60, hard: 8 * 60 },
};
