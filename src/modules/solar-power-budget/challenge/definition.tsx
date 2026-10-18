import { createElement, type ReactNode } from 'react';
import { BUILD_INFO } from '../../../core/buildInfo';
import type {
  ChallengeDefinition,
  ChallengeDifficulty,
  ChallengeEvaluation,
  ChallengeLevel,
} from '../../../core/challenge/types';
import { MODULE_RELEASE_VERSION } from '../version';
import { DAWN_DUSK_SSO_ORBIT } from '../../../core/orbitalMechanics';
import { formatWatts, formatPercent } from '../visualizer/format';
import { roundForDisplay } from './displayPrecision';
import { answerOptions, Formulas, Reveal, SpecCard } from './ChallengeParts';
import { CLASSIC_LEVELS } from './levels';
import { computeLosses, type LossCategory, type SolarLossBreakdown } from './losses';
import type { SolarKernelInputs } from '../sandbox/kernel';

function difficultyForGap(gapPct: number): ChallengeDifficulty | 'mixed' {
  if (gapPct >= 200) return 'easy';
  if (gapPct >= 30 && gapPct <= 100) return 'medium';
  if (gapPct >= 10 && gapPct < 30) return 'hard';
  return 'mixed';
}

const classicLevels: ChallengeLevel<Record<string, number>>[] = CLASSIC_LEVELS.map((level) => {
  const evaluation = evaluate(level.inputs);
  return {
    id: level.id,
    title: level.title,
    lesson: level.lesson,
    inputs: level.inputs,
    difficulty: difficultyForGap(evaluation.gapPct),
    archetype: level.id,
    expectedAnswer: level.expectedAnswer,
  };
});

const randomArchetypes: Record<LossCategory, string[]> = {
  eclipse: ['leo-noon-midnight-eclipse', 'low-altitude-iss', 'polar-low-beta'],
  thermal: ['hot-sso-wings', 'compact-bus-thermal', 'high-temperature-array'],
  radiation: ['geo-long-lifespan', 'meo-outer-belt', 'deep-space-aging'],
};

const archetypeLessons: Record<string, string> = {
  'leo-noon-midnight-eclipse': 'Low-altitude orbits crossing noon-midnight incur long shadows (~35 min per orbit), making eclipse the dominant loss.',
  'low-altitude-iss': 'For early-life arrays in LEO, night-side darkness eliminates over a third of potential generation, dominating thermal and radiation losses.',
  'polar-low-beta': 'Polar orbits with small beta angles plunge through full Earth shadow on every single pass.',
  'hot-sso-wings': 'In a 100% sunlit orbit with zero eclipse, elevated cell temperatures lower bandgap voltage and dominate all losses.',
  'compact-bus-thermal': 'Without rear radiator view to space, array equilibrium temperature rises to where thermal derating takes the largest power cut.',
  'high-temperature-array': 'Extreme operating temperatures depress multi-junction cell output by more than radiation or eclipse.',
  'geo-long-lifespan': 'In high orbits with negligible eclipse, cumulative radiation fluence over a 15-year mission is the primary power drain.',
  'meo-outer-belt': 'MEO constellations operating in the outer Van Allen belt accumulate severe lattice displacement, making radiation damage dominant.',
  'deep-space-aging': 'Even with passive cell cooling, long operational lifetime steadily erodes cell junctions beyond any other loss factor.',
};

function evaluate(inputs: Record<string, number>): ChallengeEvaluation {
  const losses = computeLosses(inputs as unknown as SolarKernelInputs);
  const formattedValues: Record<string, string> = {
    eclipse: formatWatts(losses.eclipseLossW),
    thermal: formatWatts(losses.thermalLossW),
    radiation: formatWatts(losses.radiationLossW),
  };

  return {
    answerId: losses.dominantLoss,
    values: {
      eclipse: losses.eclipseLossW,
      thermal: losses.thermalLossW,
      radiation: losses.radiationLossW,
    },
    formattedValues,
    status: 'VALID',
    diagnostics: [],
    sunlitFraction: losses.kernelOutputs.orbitSunlitFraction,
    gapPct: losses.gapPct,
    details: losses,
  };
}

/**
 * Compute a target gapPct that monotonically decreases as roundIndex goes 0→9.
 *
 * The key invariant: for a given difficulty, the returned gapPct strictly
 * decreases with roundIndex, so that the generator's `gapPct < previousGapPct`
 * constraint is satisfiable regardless of which answer option is drawn.
 *
 * A tiny rng jitter keeps values non-degenerate but never large enough to
 * violate monotonicity (the jitter is < 1/10 of the per-round step).
 */
function targetGapPct(rng: () => number, difficulty: ChallengeDifficulty, roundIndex: number): number {
  const progress = roundIndex / 9; // 0.0 → 1.0
  if (difficulty === 'easy') {
    // gap sweeps from ~500% down to ~210%
    return 500 - progress * 290 - rng() * 5;
  }
  if (difficulty === 'medium') {
    // gap sweeps from ~95% down to ~35%
    return 95 - progress * 60 - rng() * 2;
  }
  // Hard: gap sweeps from ~28% down to ~11%
  return 28 - progress * 17 - rng() * 0.5;
}

/**
 * Binary-search on `missionDurationYears` to make the computed gapPct match
 * a target, with the correct answer remaining `answer`.
 */
function tuneMissionDuration(
  inputs: Record<string, number>,
  answer: LossCategory,
  goal: number,
): void {
  let lo = 0.1;
  let hi = 80;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    inputs.missionDurationYears = roundForDisplay('missionDurationYears', mid);
    const losses = computeLosses(inputs as unknown as SolarKernelInputs);
    if (losses.dominantLoss !== answer) {
      // We overshot or undershot — radiation increases with duration
      if (answer === 'radiation') lo = mid;
      else hi = mid;
      continue;
    }
    if (losses.gapPct > goal) {
      // Gap is too large; for eclipse/thermal dominant, increase radiation to narrow gap
      if (answer === 'eclipse' || answer === 'thermal') lo = mid;
      else hi = mid; // for radiation dominant, decrease duration to narrow gap
    } else {
      if (answer === 'eclipse' || answer === 'thermal') hi = mid;
      else lo = mid;
    }
  }
}

/**
 * Binary-search on `cellOperatingTempC` to make the computed gapPct match
 * a target, with the correct answer remaining `answer` (thermal).
 */
function tuneCellTemp(
  inputs: Record<string, number>,
  goal: number,
): void {
  let lo = 40;
  let hi = 150;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    inputs.cellOperatingTempC = Math.round(mid);
    const losses = computeLosses(inputs as unknown as SolarKernelInputs);
    if (losses.dominantLoss !== 'thermal') {
      // Temperature too low — thermal is no longer dominant
      lo = mid;
      continue;
    }
    if (losses.gapPct > goal) {
      hi = mid; // reduce temperature to narrow gap
    } else {
      lo = mid; // increase temperature to widen gap
    }
  }
}

function makeRandomLevel(
  rng: () => number,
  difficulty: ChallengeDifficulty,
  answer: LossCategory,
  archetype: string,
  roundIndex: number,
): ChallengeLevel<Record<string, number>> {
  const goal = targetGapPct(rng, difficulty, roundIndex);

  const inputs: Record<string, number> = {
    solarArrayAreaM2: roundForDisplay('solarArrayAreaM2', 3.0 + rng() * 10),
    baseCellEfficiency: roundForDisplay('baseCellEfficiency', 0.28 + rng() * 0.04),
    cellOperatingTempC: 30,
    tempCoefficientPwr: -0.0025,
    missionDurationYears: 1.0,
    annualDegradationRate: 0.015,
    pointingEfficiency: roundForDisplay('pointingEfficiency', 0.96 + rng() * 0.03),
    bosEfficiency: roundForDisplay('bosEfficiency', 0.86 + rng() * 0.04),
    solarFluxWm2: 1361,
    orbitAltitudeKm: 600,
    orbitEccentricity: 0.001,
    orbitInclinationDeg: 97.8,
    orbitRaanDeg: 68.7,
    orbitArgumentDeg: 0,
  };


  if (answer === 'eclipse') {
    // Eclipse-dominant: LEO with significant shadow, low temp, short mission
    inputs.orbitAltitudeKm = 450 + Math.floor(rng() * 100);
    inputs.orbitEccentricity = 0.001;
    inputs.orbitInclinationDeg = 51.6;
    inputs.orbitRaanDeg = Math.floor(rng() * 40);
    inputs.orbitArgumentDeg = 0;
    inputs.cellOperatingTempC = 29;
    inputs.missionDurationYears = 0.5;

    // Binary-search mission duration to hit the target gapPct
    tuneMissionDuration(inputs, answer, goal);
  } else if (answer === 'thermal') {
    // Thermal-dominant: dawn-dusk SSO (no eclipse), high cell temp, short mission
    inputs.orbitAltitudeKm = DAWN_DUSK_SSO_ORBIT.orbitAltitudeKm;
    inputs.orbitEccentricity = DAWN_DUSK_SSO_ORBIT.orbitEccentricity;
    inputs.orbitInclinationDeg = DAWN_DUSK_SSO_ORBIT.orbitInclinationDeg;
    inputs.orbitRaanDeg = DAWN_DUSK_SSO_ORBIT.orbitRaanDeg;
    inputs.orbitArgumentDeg = DAWN_DUSK_SSO_ORBIT.orbitArgumentDeg;
    inputs.cellOperatingTempC = 95;
    inputs.missionDurationYears = 0.5;

    // First, binary-search mission duration to roughly tune the gap
    tuneMissionDuration(inputs, answer, goal);

    // Then fine-tune with cell temperature if the gap still isn't right
    const check = computeLosses(inputs as unknown as SolarKernelInputs);
    if (check.dominantLoss !== answer || Math.abs(check.gapPct - goal) > 5) {
      inputs.missionDurationYears = roundForDisplay('missionDurationYears', 0.5 + rng() * 2);
      tuneCellTemp(inputs, goal);
    }
  } else {
    // Radiation-dominant: dawn-dusk SSO (no eclipse), moderate temp, long mission
    inputs.orbitAltitudeKm = DAWN_DUSK_SSO_ORBIT.orbitAltitudeKm;
    inputs.orbitEccentricity = DAWN_DUSK_SSO_ORBIT.orbitEccentricity;
    inputs.orbitInclinationDeg = DAWN_DUSK_SSO_ORBIT.orbitInclinationDeg;
    inputs.orbitRaanDeg = DAWN_DUSK_SSO_ORBIT.orbitRaanDeg;
    inputs.orbitArgumentDeg = DAWN_DUSK_SSO_ORBIT.orbitArgumentDeg;

    inputs.cellOperatingTempC = difficulty === 'easy' ? 36 : difficulty === 'medium' ? 48 : 58;
    inputs.missionDurationYears = 15;

    // Binary-search mission duration to hit the target gapPct
    tuneMissionDuration(inputs, answer, goal);
  }

  const evaluation = evaluate(inputs);
  const labels: Record<string, string> = {
    eclipse: 'Eclipse',
    thermal: 'Thermal',
    radiation: 'Radiation',
  };

  return {
    id: `${archetype}-${Math.floor(rng() * 36 ** 5).toString(36)}`,
    title: archetype.replaceAll('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    lesson: `Dominant loss is ${labels[evaluation.answerId]} at ${evaluation.formattedValues?.[evaluation.answerId]}. ${archetypeLessons[archetype]}`,
    inputs,
    difficulty,
    archetype,
    expectedAnswer: answer,
  };
}

function hints(
  _level: ChallengeLevel<Record<string, number>>,
  evaluation: ChallengeEvaluation,
): [
  { title: string; working: ReactNode },
  { title: string; working: ReactNode },
  { title: string; working: ReactNode },
] {
  const details = evaluation.details as SolarLossBreakdown;
  const o = details.kernelOutputs;

  return [
    {
      title: 'Inspect the primary mission parameters',
      working: createElement(
        'p',
        null,
        `Check the given sunlit fraction (${formatPercent(evaluation.sunlitFraction ?? 1)}), cell temperature (${Math.round(o.temperatureDerateFactor * 100)}% retention), and radiation duration (${Math.round(o.radiationDerateFactor * 100)}% retention). Which parameter takes the deepest single percentage cut?`,
      ),
    },
    {
      title: 'Compare intermediate loss percentages',
      working: createElement(
        'p',
        null,
        `Eclipse cuts ${formatPercent(1 - o.orbitSunlitFraction)} of sunlit generation. Thermal derate cuts ${formatPercent(1 - o.temperatureDerateFactor)} from STC 28 °C. Cumulative radiation degrades cell capacity by ${formatPercent(1 - o.radiationDerateFactor)}.`,
      ),
    },
    {
      title: 'Full numerical loss working',
      working: createElement(
        'p',
        null,
        `Eclipse Shadow Loss: ${formatWatts(details.eclipseLossW)}. Thermal Derate Loss: ${formatWatts(details.thermalLossW)}. Radiation Fluence Loss: ${formatWatts(details.radiationLossW)}. Dominant drain is ${evaluation.answerId.toUpperCase()}.`,
      ),
    },
  ];
}

export const solarPowerChallenge: ChallengeDefinition<Record<string, number>> = {
  id: 'solar-power-budget',
  title: 'What Drains The Array?',
  versionInfo: `Silicon Carbide Sandbox v${BUILD_INFO.sandboxVersion} · solar-power-budget v${MODULE_RELEASE_VERSION}`,
  options: answerOptions,
  classicLevels,
  generate(rng, difficulty, context) {
    const answer = context.answerId as LossCategory;
    const available = randomArchetypes[answer].filter((a) => a !== context.avoidArchetype);
    const chosenArchetype = available.length > 0 ? available[Math.floor(rng() * available.length)] : randomArchetypes[answer][0];
    return makeRandomLevel(rng, difficulty, answer, chosenArchetype, context.roundIndex);
  },
  evaluate,
  hints,
  SpecCard,
  Reveal,
  Formulas,
  timeLimitsSeconds: { easy: 10 * 60, medium: 8 * 60, hard: 6 * 60 },
};
