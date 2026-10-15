import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { generateRandomRun } from '../../../core/challenge/generator';
import { challengeShareString } from '../../../core/challenge/scoring';
import { chapterExamples, RULE_OF_THUMB_TEMPERATURES_C } from '../visualizer/chapterData';
import { formatWatts } from '../visualizer/format';
import { INPUT_SPECS, orbitalThermalLimits } from '../sandbox/module';
import type { OrbitalThermalResult } from '../sandbox/module';
import { ceilingsOf } from './ceilings';
import { roundChallengeInputForDisplay } from './displayPrecision';
import { orbitalThermalChallenge } from './definition';
import { CHALLENGE_LEVELS } from './levels';
import type { ChallengeDifficulty, ChallengeRoundRecord, ChallengeSettings } from '../../../core/challenge/types';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function closeEnough(left: number, right: number, message: string): void {
  assert(Math.abs(left - right) <= Math.max(1e-8, Math.abs(right) * 1e-10), `${message}: ${left} != ${right}`);
}

function gapInBand(gapPct: number, difficulty: ChallengeDifficulty): boolean {
  if (difficulty === 'easy') return gapPct >= 200;
  if (difficulty === 'medium') return gapPct >= 30 && gapPct <= 100;
  return gapPct >= 10 && gapPct < 30;
}

function answerForArchetype(archetype: string): string | undefined {
  if (archetype.includes('coolant') || archetype.includes('delta') || archetype === 'big-radiator-thin-pipe' || archetype === 'photo-finish-two') return 'coolant';
  if (archetype.includes('radiator') || archetype.includes('geo') || archetype.includes('fleet') || archetype === 'sunny-geo' || archetype === 'photo-finish') return 'radiator';
  if (archetype.includes('array') || archetype.includes('eclipse') || archetype.includes('node') || archetype === 'starved-array' || archetype === 'small-isnt-simple') return 'power';
  return undefined;
}

function orderedRoundedCeilings(values: Record<string, number>): string[] {
  return Object.entries(values)
    .map(([id, value]) => {
      const formatted = formatWatts(value);
      const [, number, unit] = formatted.match(/^(-?[0-9,.]+)\s*(W|kW|MW|GW)$/)!;
      const multiplier = { W: 1, kW: 1e3, MW: 1e6, GW: 1e9 }[unit as 'W' | 'kW' | 'MW' | 'GW'];
      return { id, value: Number(number.replaceAll(',', '')) * multiplier };
    })
    .sort((left, right) => left.value - right.value)
    .map(({ id }) => id);
}

const expectedDistribution = { radiator: 4, coolant: 3, power: 3 };

for (const [index, level] of CHALLENGE_LEVELS.entries()) {
  const result = orbitalThermalLimits.run(level.inputs);
  const ceilings = ceilingsOf(result);
  const label = `Classic level ${index + 1} (${level.id})`;
  assert(ceilings.answer === level.expectedAnswer, `${label}: answer should match the test expectation`);
  assert(ceilings.gapPct >= 20, `${label}: gap should be at least 20%, got ${ceilings.gapPct}`);
  assert(Object.keys(level.inputs).length === INPUT_SPECS.length, `${label}: inputs must be complete`);
  assert(!('expectedAnswer' in orbitalThermalChallenge.classicLevels[index]), `${label}: expectedAnswer must not be used at runtime`);
  assert(!/[0-9]/.test(level.lesson), `${label}: classic lesson copy must not contain digits`);

  if (index < 3) {
    const sorted = [ceilings.radiator, ceilings.coolant, ceilings.power].sort((left, right) => left - right);
    assert(sorted[1] >= sorted[0] * 3 && sorted[2] >= sorted[0] * 3, `${label}: the lowest ceiling should be at least three times lower`);
  }
  if (index === 7 || index === 8) {
    assert(ceilings.gapPct >= 20 && ceilings.gapPct <= 40, `${label}: photo-finish gap should be between 20% and 40%`);
  }

  const actualCounts = { radiator: 0, coolant: 0, power: 0 };
  actualCounts[ceilings.answer] += 1;
  assert(actualCounts[ceilings.answer] === 1, `${label}: answer should be one of the three supported ceilings`);
  assert((ceilings.power < result.resolvedInputs.computeWattsRequested) === (result.values.powerDeficitW > 0), `${label}: power deficit equivalence failed`);
  assert((Math.min(ceilings.radiator, ceilings.coolant) < result.resolvedInputs.computeWattsRequested) === (result.values.computeDeficitW > 0), `${label}: thermal deficit equivalence failed`);
  assert(!result.diagnostics.some((diagnostic) => diagnostic.key !== undefined || /unknown key|clamp/i.test(diagnostic.message)), `${label}: unexpected input diagnostic`);
}

const classicCounts = CHALLENGE_LEVELS.reduce((counts, level) => {
  counts[level.expectedAnswer] += 1;
  return counts;
}, { radiator: 0, coolant: 0, power: 0 });
assert(JSON.stringify(classicCounts) === JSON.stringify(expectedDistribution), 'Classic answer distribution must be 4/3/3');

const { worked, fluxes, coolantSpecificHeat } = chapterExamples();
const workedRun = orbitalThermalLimits.run(CHALLENGE_LEVELS[0].inputs);
assert(worked.values.netRadiatorCapacityW === workedRun.values.netRadiatorCapacityW, 'Chapter radiator value must come from the kernel');
assert(worked.values.transportCapacityW === workedRun.values.transportCapacityW, 'Chapter coolant value must come from the kernel');
assert(worked.values.generatedPowerW === workedRun.values.generatedPowerW, 'Chapter power value must come from the kernel');
closeEnough(coolantSpecificHeat, 1050, 'Chapter specific heat should be derived from kernel transport');
assert(fluxes.length === RULE_OF_THUMB_TEMPERATURES_C.length, 'Chapter flux table should contain its three sampled temperatures');
fluxes.forEach(({ operatingTempC, radiatorFluxWm2 }) => {
  const fluxRun = orbitalThermalLimits.run({ ...CHALLENGE_LEVELS[0].inputs, operatingTempC });
  assert(radiatorFluxWm2 === fluxRun.values.radiatorFluxWm2, `Chapter flux at ${operatingTempC} C must match the kernel`);
});

const firstClassic = orbitalThermalChallenge.classicLevels[0];
const classicEvaluation = orbitalThermalChallenge.evaluate(firstClassic.inputs);
const firstClassicResult = classicEvaluation.details as OrbitalThermalResult;
const hintMarkup = renderToStaticMarkup(createElement('div', null, ...orbitalThermalChallenge.hints(firstClassic, classicEvaluation).map((hint) => hint.working)));
assert(hintMarkup.includes(formatWatts(classicEvaluation.values.coolant)), 'Second hint must show kernel coolant capacity');
assert(hintMarkup.includes(formatWatts(firstClassicResult.values.generatedPowerW)), 'Second hint must show kernel array generation');
assert(hintMarkup.includes(formatWatts(classicEvaluation.values.radiator)), 'Third hint must show kernel radiator capacity');

function makeRecords(): ChallengeRoundRecord<Record<string, number>>[] {
  return CHALLENGE_LEVELS.map((level) => {
    const evaluation = orbitalThermalChallenge.evaluate(level.inputs);
    return {
      level: { ...level, difficulty: 'mixed', archetype: level.id },
      evaluation,
      selectedAnswer: evaluation.answerId,
      correct: true,
      hintsUsed: 0,
    };
  });
}

for (const questionSet of ['classic', 'random'] as const) {
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    for (const hints of [false, true]) {
      for (const timer of ['off', 'stopwatch', 'limit'] as const) {
        const settings: ChallengeSettings = {
          questionSet,
          difficulty,
          hints,
          timer,
          seed: 'K7F2Q',
          generatedSeed: questionSet === 'random' ? 'K7F2Q' : undefined,
        };
        const share = challengeShareString({
          title: 'What Breaks First?',
          score: 10,
          settings,
          records: makeRecords(),
          timeSeconds: 440,
          versionInfo: 'Silicon Carbide Sandbox v0.1.0 · orbital-thermal-limits v0.1.0',
        });
        assert(share.includes('What Breaks First? 10/10'), 'Share string should begin with title and score');
        assert(share.includes(questionSet === 'classic' ? 'Mixed' : difficulty[0].toUpperCase() + difficulty.slice(1)), 'Share should identify the question set difficulty');
        assert(share.includes('no hints') === hints, 'Share should include hint setting only when enabled');
        assert(share.includes('7:20') === (timer !== 'off'), 'Share should include elapsed time only when timer is enabled');
        assert(share.includes('Seed K7F2Q') === (questionSet === 'random'), 'Only Random share strings should contain a seed');
        assert(share.includes('🟩'.repeat(10)), 'Share string should include one result mark per question');
      }
    }
  }
}

const start = performance.now();
let fallbackCount = 0;
let generatedLevelCount = 0;
let totalAttempts = 0;
for (let seedIndex = 0; seedIndex < 500; seedIndex += 1) {
  const seed = `S${seedIndex.toString(36).toUpperCase()}`;
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const { levels, fallbackCount: fallbacks, attempts } = generateRandomRun(orbitalThermalChallenge, seed, difficulty);
    fallbackCount += fallbacks;
    generatedLevelCount += levels.length;
    totalAttempts += attempts;
    const counts = { radiator: 0, coolant: 0, power: 0 };
    const answerSequence: string[] = [];
    let previousGapPct = Infinity;
    for (let index = 0; index < levels.length; index += 1) {
      const level = levels[index];
      const evaluation = orbitalThermalChallenge.evaluate(level.inputs);
      const result = evaluation.details as OrbitalThermalResult;
      const ceilings = ceilingsOf(result);
      const expectedArchetypeAnswer = answerForArchetype(level.archetype);
      const classicFallback = CHALLENGE_LEVELS.find((candidate) => candidate.id === level.archetype);
      const expectedAnswer = expectedArchetypeAnswer ?? classicFallback?.expectedAnswer;
      assert(expectedAnswer === evaluation.answerId, `${seed}/${difficulty}/${index}: archetype answer mismatch (${level.archetype})`);
      assert(gapInBand(evaluation.gapPct, difficulty), `${seed}/${difficulty}/${index}: gap ${evaluation.gapPct} outside band`);
      assert(evaluation.gapPct < previousGapPct, `${seed}/${difficulty}: gaps should ramp from easier to harder`);
      previousGapPct = evaluation.gapPct;
      assert(evaluation.diagnostics.length === 0, `${seed}/${difficulty}/${index}: input diagnostic ${evaluation.diagnostics.join('; ')}`);
      assert(!result.diagnostics.some((diagnostic) => diagnostic.key !== undefined || /unknown key|clamp/i.test(diagnostic.message)), `${seed}/${difficulty}/${index}: kernel input was clamped or unknown`);
      assert((ceilings.power < result.resolvedInputs.computeWattsRequested) === (result.values.powerDeficitW > 0), `${seed}/${difficulty}/${index}: power deficit equivalence failed`);
      assert((Math.min(ceilings.radiator, ceilings.coolant) < result.resolvedInputs.computeWattsRequested) === (result.values.computeDeficitW > 0), `${seed}/${difficulty}/${index}: compute deficit equivalence failed`);
      assert(!('expectedAnswer' in level), `${seed}/${difficulty}/${index}: expectedAnswer leaked into runtime level`);
      counts[evaluation.answerId as keyof typeof counts] += 1;
      answerSequence.push(evaluation.answerId);

      const displayInputs = { ...level.inputs };
      for (const key of ['computeWattsRequested', 'radiatorArea', 'operatingTempC', 'flowRateKgS', 'coolantDeltaT', 'solarPanelAreaM2', 'solarPanelEfficiency', 'solarPanelPointingFactor']) {
        const displayed = roundChallengeInputForDisplay(key, level.inputs[key]);
        assert(displayed === level.inputs[key], `${seed}/${difficulty}/${index}: ${key} is not rounded to its card precision`);
        displayInputs[key] = displayed;
      }
      const displayedEvaluation = orbitalThermalChallenge.evaluate(displayInputs);
      const displayedResult = displayedEvaluation.details as OrbitalThermalResult;
      assert(displayedEvaluation.answerId === evaluation.answerId, `${seed}/${difficulty}/${index}: displayed inputs change the answer`);
      assert(
        orderedRoundedCeilings(displayedEvaluation.values).join(',') === orderedRoundedCeilings(evaluation.values).join(','),
        `${seed}/${difficulty}/${index}: displayed values change the ceiling ordering`,
      );
      assert(displayedResult.values.orbitSunlitFraction === result.values.orbitSunlitFraction, `${seed}/${difficulty}/${index}: display inputs change orbit geometry`);

      if (index > 0) {
        assert(level.archetype !== levels[index - 1].archetype, `${seed}/${difficulty}: adjacent archetypes repeat`);
      }
      if (index >= 2) {
        assert(
          !(answerSequence[index] === answerSequence[index - 1] && answerSequence[index] === answerSequence[index - 2]),
          `${seed}/${difficulty}: three identical answers occur in sequence`,
        );
        assert(
          !(level.archetype === levels[index - 1].archetype && level.archetype === levels[index - 2].archetype),
          `${seed}/${difficulty}: three identical archetypes occur in sequence`,
        );
      }
    }
    assert(counts.radiator >= 2 && counts.radiator <= 5, `${seed}/${difficulty}: radiator balance failed`);
    assert(counts.coolant >= 2 && counts.coolant <= 5, `${seed}/${difficulty}: coolant balance failed`);
    assert(counts.power >= 2 && counts.power <= 5, `${seed}/${difficulty}: power balance failed`);
  }
}

for (const difficulty of ['easy', 'medium', 'hard'] as const) {
  const first = generateRandomRun(orbitalThermalChallenge, 'DET123', difficulty).levels;
  const second = generateRandomRun(orbitalThermalChallenge, 'DET123', difficulty).levels;
  assert(JSON.stringify(first) === JSON.stringify(second), `${difficulty}: identical seeds must generate identical runs`);
}

console.log(
  `Challenge tests passed: ${generatedLevelCount} random levels; ${fallbackCount} fallbacks; ` +
  `${totalAttempts} attempts; ${((performance.now() - start) / 1000).toFixed(1)}s generation and verification.`,
);
