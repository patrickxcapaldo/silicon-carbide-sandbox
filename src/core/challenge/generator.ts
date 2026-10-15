import { createSeededRng, shuffle } from './rng';
import type {
  ChallengeDefinition,
  ChallengeDifficulty,
  ChallengeLevel,
} from './types';

const MAX_ATTEMPTS_PER_LEVEL = 200;
const ROUND_COUNT = 10;

function difficultyForGap(gapPct: number): ChallengeDifficulty | null {
  if (gapPct >= 200) return 'easy';
  if (gapPct >= 30 && gapPct <= 100) return 'medium';
  if (gapPct >= 10 && gapPct < 30) return 'hard';
  return null;
}

export function generateRandomRun<Inputs extends Record<string, number>>(
  definition: ChallengeDefinition<Inputs>,
  seed: string,
  difficulty: ChallengeDifficulty,
): { levels: ChallengeLevel<Inputs>[]; fallbackCount: number; attempts: number } {
  const rng = createSeededRng(seed);
  const answerSchedule = makeAnswerSchedule(definition.options.map(({ id }) => id), rng);
  const levels: ChallengeLevel<Inputs>[] = [];
  let fallbackCount = 0;
  let attempts = 0;

  for (const [roundIndex, answerId] of answerSchedule.entries()) {
    const previousArchetype = levels.at(-1)?.archetype;
    const previousGapPct = levels.length
      ? definition.evaluate(levels[levels.length - 1].inputs).gapPct
      : undefined;
    let accepted: ChallengeLevel<Inputs> | undefined;
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_LEVEL; attempt += 1) {
      attempts += 1;
      const candidate = definition.generate(rng, difficulty, { answerId, avoidArchetype: previousArchetype, roundIndex });
      if (candidate.archetype === previousArchetype) continue;
      const evaluation = definition.evaluate(candidate.inputs);
      if (evaluation.diagnostics.length > 0 || evaluation.answerId !== answerId) continue;
      if (difficultyForGap(evaluation.gapPct) !== difficulty) continue;
      if (previousGapPct !== undefined && evaluation.gapPct >= previousGapPct) continue;
      accepted = candidate;
      break;
    }

    if (!accepted) {
      fallbackCount += 1;
      accepted = definition.classicLevels.find((candidate) => {
        if (candidate.archetype === previousArchetype) return false;
        const evaluation = definition.evaluate(candidate.inputs);
        return difficultyForGap(evaluation.gapPct) === difficulty &&
          evaluation.answerId === answerId &&
          (previousGapPct === undefined || evaluation.gapPct < previousGapPct);
      });
      if (!accepted) throw new Error(`Could not generate or fall back for a ${difficulty} ${answerId} level.`);
    }
    levels.push(accepted);
  }

  return { levels, fallbackCount, attempts };
}

function makeAnswerSchedule(options: readonly string[], rng: () => number): string[] {
  if (options.length < 2) throw new Error('A challenge needs at least two answer options.');
  const schedule: string[] = [];
  options.forEach((option) => {
    for (let count = 0; count < Math.floor(ROUND_COUNT / options.length); count += 1) schedule.push(option);
  });
  const extras = ROUND_COUNT - schedule.length;
  shuffle(options, rng).slice(0, extras).forEach((option) => schedule.push(option));

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = shuffle(schedule, rng);
    if (candidate.every((option, index) => index < 2 || option !== candidate[index - 1] || option !== candidate[index - 2])) {
      return candidate;
    }
  }
  throw new Error('Could not create a balanced answer order.');
}
