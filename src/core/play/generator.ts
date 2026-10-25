import { createSeededRng, shuffle } from '../challenge/rng';
import type { PlayDefinition, PlayDifficulty, PlayRound, PlaySide } from './types';

export const PLAY_ROUND_COUNT = 10;
const ATTEMPTS_PER_SCENARIO = 60;

/** Band for the larger value divided by the smaller one. */
export const RATIO_BANDS: Record<PlayDifficulty, { min: number; max: number }> = {
  easy: { min: 2, max: Infinity },
  medium: { min: 1.3, max: 2 },
  hard: { min: 1.1, max: 1.3 },
};

export function ratioInBand(ratio: number, difficulty: PlayDifficulty): boolean {
  const band = RATIO_BANDS[difficulty];
  return ratio >= band.min && ratio < band.max;
}

function sideSchedule(rng: () => number): PlaySide[] {
  const half = PLAY_ROUND_COUNT / 2;
  const sides: PlaySide[] = [...Array<PlaySide>(half).fill('a'), ...Array<PlaySide>(half).fill('b')];
  return shuffle(sides, rng);
}

export function generatePlayRun(
  definition: PlayDefinition,
  seed: string,
  difficulty: PlayDifficulty,
): PlayRound[] {
  const rng = createSeededRng(seed);
  const usable = definition.scenarios
    .map((scenario) => ({ scenario, base: definition.evaluate(scenario.inputs) }))
    .filter(({ base }) => !base.rejected && base.value > 0);
  if (usable.length < 2 || definition.levers.length < 2) {
    throw new Error('Play needs at least two usable scenarios and two levers.');
  }

  const scenarioOrder = shuffle(usable, rng);
  const sides = sideSchedule(rng);
  const rounds: PlayRound[] = [];
  let previousPair = '';

  for (let index = 0; index < PLAY_ROUND_COUNT; index += 1) {
    let round: PlayRound | undefined;

    // Some baselines cannot reach every difficulty band, so move on to the next one.
    for (let offset = 0; offset < scenarioOrder.length && !round; offset += 1) {
      const { scenario, base } = scenarioOrder[(index + offset) % scenarioOrder.length];
      for (let attempt = 0; attempt < ATTEMPTS_PER_SCENARIO && !round; attempt += 1) {
        const first = Math.floor(rng() * definition.levers.length);
        let second = Math.floor(rng() * (definition.levers.length - 1));
        if (second >= first) second += 1;
        const pairKey = [definition.levers[first].id, definition.levers[second].id].sort().join('|');
        if (pairKey === previousPair) continue;

        const changeA = definition.levers[first].make(scenario.inputs, rng);
        const changeB = definition.levers[second].make(scenario.inputs, rng);
        if (!changeA || !changeB) continue;
        const evalA = definition.evaluate(changeA.inputs);
        const evalB = definition.evaluate(changeB.inputs);
        if (evalA.rejected || evalB.rejected) continue;
        if (!(evalA.value > 0) || !(evalB.value > 0)) continue;

        const ratio = Math.max(evalA.value, evalB.value) / Math.min(evalA.value, evalB.value);
        if (!ratioInBand(ratio, difficulty)) continue;

        const winner: PlaySide = evalA.value > evalB.value ? 'a' : 'b';
        const optionA = { change: changeA, value: evalA.value, binding: evalA.binding };
        const optionB = { change: changeB, value: evalB.value, binding: evalB.binding };
        const swap = winner !== sides[index];
        round = {
          index,
          scenario,
          baseValue: base.value,
          baseBinding: base.binding,
          a: swap ? optionB : optionA,
          b: swap ? optionA : optionB,
          higher: sides[index],
          ratio,
          difficulty,
        };
        previousPair = pairKey;
      }
    }

    if (!round) {
      throw new Error(`Could not generate a ${difficulty} round ${index + 1} for ${definition.id}.`);
    }
    rounds.push(round);
  }
  return rounds;
}
