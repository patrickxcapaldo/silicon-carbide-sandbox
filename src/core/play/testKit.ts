import { generatePlayRun, PLAY_ROUND_COUNT, ratioInBand } from './generator';
import { playReason } from './reason';
import { playScore, playShareString } from './scoring';
import type { PlayDefinition, PlayDifficulty, PlayRoundRecord } from './types';

export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const DIFFICULTIES: PlayDifficulty[] = ['easy', 'medium', 'hard'];

/** Checks one Play definition against its own model. Shared by every module's play.test.ts. */
export function checkPlayDefinition(definition: PlayDefinition, seedsPerDifficulty: number): string {
  const levelsSeen = new Set<string>();
  let roundsChecked = 0;

  assert(definition.levers.every((lever) => lever.lesson.trim().length > 20), `${definition.id}: every lever needs a lesson`);
  assert(new Set(definition.levers.map((lever) => lever.id)).size === definition.levers.length, `${definition.id}: lever ids must be unique`);

  for (const difficulty of DIFFICULTIES) {
    for (let seedIndex = 0; seedIndex < seedsPerDifficulty; seedIndex += 1) {
      const seed = `T${difficulty[0].toUpperCase()}${seedIndex}`;
      const run = generatePlayRun(definition, seed, difficulty);
      const label = `${definition.id} ${difficulty} ${seed}`;

      assert(run.length === PLAY_ROUND_COUNT, `${label}: must have ${PLAY_ROUND_COUNT} rounds`);
      assert(JSON.stringify(run) === JSON.stringify(generatePlayRun(definition, seed, difficulty)), `${label}: same seed must give the same run`);
      assert(run.filter((round) => round.higher === 'a').length === PLAY_ROUND_COUNT / 2, `${label}: higher side must be balanced`);

      for (const round of run) {
        const where = `${label} round ${round.index + 1}`;
        const base = definition.evaluate(round.scenario.inputs);
        const a = definition.evaluate(round.a.change.inputs);
        const b = definition.evaluate(round.b.change.inputs);

        // Every number on screen must equal a fresh run of the model.
        assert(base.value === round.baseValue, `${where}: baseline must match the model`);
        assert(a.value === round.a.value && b.value === round.b.value, `${where}: option values must match the model`);
        assert(!a.rejected && !b.rejected && !base.rejected, `${where}: no clamped or errored runs`);
        assert(round.a.value > 0 && round.b.value > 0, `${where}: values must be positive`);
        const ratio = Math.max(a.value, b.value) / Math.min(a.value, b.value);
        assert(Math.abs(ratio - round.ratio) < 1e-12, `${where}: stated ratio must equal the recomputed ratio`);
        assert(ratioInBand(round.ratio, difficulty), `${where}: ratio ${round.ratio.toFixed(3)} outside the ${difficulty} band`);
        assert((round.higher === 'a') === (a.value > b.value), `${where}: higher side must match the model`);
        assert(round.a.change.leverId !== round.b.change.leverId, `${where}: levers must differ`);
        assert(round.scenario.title.trim().length > 0 && !/^Level \d+/.test(round.scenario.title), `${where}: clean scenario title`);

        const lines = playReason(definition, round);
        assert(lines.length >= 2, `${where}: reason needs at least two lines`);
        assert(lines.every((line) => line.trim().length > 0 && !/undefined|NaN|\{|\}|null/.test(line)), `${where}: reason has unresolved text: ${lines.join(' | ')}`);

        levelsSeen.add(round.a.change.leverId);
        levelsSeen.add(round.b.change.leverId);
        roundsChecked += 1;
      }

      const records: PlayRoundRecord[] = run.map((round, index) => ({
        round,
        picked: index % 2 === 0 ? round.higher : (round.higher === 'a' ? 'b' : 'a'),
        correct: index % 2 === 0,
      }));
      assert(playScore(records) === PLAY_ROUND_COUNT / 2, `${label}: score counts correct picks`);
      const share = playShareString({ title: definition.title, seed, difficulty, records, versionInfo: definition.versionInfo });
      const marks = share.split('\n')[1];
      assert([...marks].length === PLAY_ROUND_COUNT, `${label}: one mark per round`);
      assert(share.includes('Guess the limit. Physics keeps score.') && share.includes(`Seed ${seed}`), `${label}: share string content`);
    }
  }

  assert(JSON.stringify(generatePlayRun(definition, 'AAAA', 'medium')) !== JSON.stringify(generatePlayRun(definition, 'BBBB', 'medium')), `${definition.id}: different seeds must differ`);
  const unused = definition.levers.filter((lever) => !levelsSeen.has(lever.id)).map((lever) => lever.id);
  assert(unused.length === 0, `${definition.id}: levers never used: ${unused.join(', ')}`);
  return `${roundsChecked} rounds`;
}
