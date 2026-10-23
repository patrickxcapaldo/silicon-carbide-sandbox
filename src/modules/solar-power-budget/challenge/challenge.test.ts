import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { generateRandomRun } from '../../../core/challenge/generator';
import { challengeShareString } from '../../../core/challenge/scoring';
import { chapterExamples, SENSITIVITY_TEMPS_C, SENSITIVITY_YEARS } from '../visualizer/chapterData';
import { formatWatts } from '../visualizer/format';
import { INPUT_SPECS, solarPowerBudget } from '../sandbox/module';
import { solarPowerChallenge } from './definition';
import { CLASSIC_LEVELS } from './levels';
import type { ChallengeRoundRecord, ChallengeSettings } from '../../../core/challenge/types';
import type { SolarLossBreakdown } from './losses';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

// 1. Classic Levels Verification
const expectedCounts = { eclipse: 4, thermal: 3, radiation: 3 };
const actualCounts = { eclipse: 0, thermal: 0, radiation: 0 };

for (const [index, level] of CLASSIC_LEVELS.entries()) {
  const evalResult = solarPowerChallenge.evaluate(level.inputs);
  const label = `Classic level ${index + 1} (${level.id})`;

  assert(evalResult.answerId === level.expectedAnswer, `${label}: answer must match expectation (${level.expectedAnswer}), got ${evalResult.answerId}`);
  assert(evalResult.gapPct >= 10, `${label}: gap must be >= 10%, got ${evalResult.gapPct.toFixed(1)}%`);
  assert(Object.keys(level.inputs).length === INPUT_SPECS.length, `${label}: inputs must be complete`);
  actualCounts[level.expectedAnswer] += 1;
}

assert(JSON.stringify(actualCounts) === JSON.stringify(expectedCounts), 'Classic answer distribution must be 4/3/3');
console.log('Classic challenge levels verified successfully.');

// 2. Chapter Data Consistency
const { worked, losses: _losses, tempSweep, radSweep } = chapterExamples();
const freshRun = solarPowerBudget.run(worked.resolvedInputs);
assert(worked.values.orbitAveragePowerW === freshRun.values.orbitAveragePowerW, 'Chapter orbit average must match fresh kernel');
assert(tempSweep.length === SENSITIVITY_TEMPS_C.length, 'Chapter temperature sweep must match defined temps');
assert(radSweep.length === SENSITIVITY_YEARS.length, 'Chapter radiation sweep must match defined years');

// 3. Hints Consistency
const firstClassic = solarPowerChallenge.classicLevels[0];
const firstEval = solarPowerChallenge.evaluate(firstClassic.inputs);
const details = firstEval.details as SolarLossBreakdown;
const hintMarkup = renderToStaticMarkup(
  createElement('div', null, ...solarPowerChallenge.hints(firstClassic, firstEval).map((h) => h.working)),
);
assert(hintMarkup.includes(formatWatts(details.eclipseLossW)), 'Third hint must include eclipse loss in watts');
assert(hintMarkup.includes(formatWatts(details.thermalLossW)), 'Third hint must include thermal loss in watts');
assert(hintMarkup.includes(formatWatts(details.radiationLossW)), 'Third hint must include radiation loss in watts');
console.log('Chapter examples and hint markup verified successfully.');

// 4. Scoring & Share String Verification
function makeRecords(): ChallengeRoundRecord<Record<string, number>>[] {
  return CLASSIC_LEVELS.map((level) => {
    const evaluation = solarPowerChallenge.evaluate(level.inputs);
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
          seed: 'A9B2C',
          generatedSeed: questionSet === 'random' ? 'A9B2C' : undefined,
        };
        const share = challengeShareString({
          title: 'What Drains The Array?',
          score: 10,
          settings,
          records: makeRecords(),
          timeSeconds: 320,
          versionInfo: 'Silicon Carbide Imperative Sandbox v0.1.0 · solar-power-budget v0.1.0',
        });
        assert(share.includes('What Drains The Array? 10/10'), 'Share string must begin with title and score');
        assert(share.includes('🟩'.repeat(10)), 'Share string must include 10 green boxes');
      }
    }
  }
}
console.log('Share string formatting verified.');

// 5. Random Level Generation Stress Test across Difficulties
const seeds = ['SPB1', 'SPB2', 'SPB3', 'SPB4', 'SOLAR', 'ORBIT', 'ALPHA', 'BETA', 'GAMMA', 'DELTA'];
let totalLevelsGenerated = 0;
let totalAttempts = 0;
let totalFallbacks = 0;

for (const seed of seeds) {
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const { levels, fallbackCount, attempts } = generateRandomRun(solarPowerChallenge, seed, difficulty);
    totalLevelsGenerated += levels.length;
    totalAttempts += attempts;
    totalFallbacks += fallbackCount;

    assert(levels.length === 10, `Run must produce 10 levels for seed ${seed}`);
    assert(fallbackCount === 0, `Run for seed ${seed} ${difficulty} had ${fallbackCount} fallbacks`);

    // Verify answer balance and valid evaluation
    for (const lvl of levels) {
      const evaluation = solarPowerChallenge.evaluate(lvl.inputs);
      assert(evaluation.diagnostics.length === 0, 'Generated level must not have clamping diagnostics');
      assert(evaluation.answerId === lvl.expectedAnswer, 'Generated level answer must match expected answer');
    }
  }
}

console.log(
  `Solar power challenge tests passed: ${totalLevelsGenerated} random levels; ${totalFallbacks} fallbacks; ${totalAttempts} attempts.`,
);
