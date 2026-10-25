import type { PlayDifficulty, PlayRoundRecord } from './types';

export function playScore(records: readonly PlayRoundRecord[]): number {
  return records.filter((record) => record.correct).length;
}

export function playShareString(args: {
  title: string;
  seed: string;
  difficulty: PlayDifficulty;
  records: readonly PlayRoundRecord[];
  versionInfo: string;
}): string {
  const { title, seed, difficulty, records, versionInfo } = args;
  const label = difficulty[0].toUpperCase() + difficulty.slice(1);
  const marks = records.map((record) => (record.correct ? '🟩' : '🟥')).join('');
  return [
    `${title} · Play ${playScore(records)}/${records.length} · ${label}`,
    marks,
    'Guess the limit. Physics keeps score.',
    `Seed ${seed} · ${versionInfo}`,
  ].join('\n');
}
