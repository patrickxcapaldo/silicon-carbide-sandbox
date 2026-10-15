import type { ChallengeRoundRecord, ChallengeSettings } from './types';

export function finalScore(records: readonly ChallengeRoundRecord[], hintsEnabled: boolean): number {
  const correct = records.filter((record) => record.correct).length;
  const hintPenalty = hintsEnabled
    ? records.reduce((sum, record) => sum + record.hintsUsed, 0)
    : 0;
  return Math.max(0, correct - hintPenalty);
}

export function formatElapsedTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function challengeShareString(args: {
  title: string;
  score: number;
  settings: ChallengeSettings;
  records: readonly ChallengeRoundRecord[];
  timeSeconds: number;
  versionInfo: string;
}): string {
  const { title, score, settings, records, timeSeconds, versionInfo } = args;
  const difficulty = settings.questionSet === 'classic' ? 'Mixed' : settings.difficulty[0].toUpperCase() + settings.difficulty.slice(1);
  const options: string[] = [];
  if (settings.hints) {
    const used = records.reduce((sum, record) => sum + record.hintsUsed, 0);
    options.push(used === 0 ? 'no hints' : `${used} hint${used === 1 ? '' : 's'}`);
  }
  if (settings.timer !== 'off') options.push(formatElapsedTime(timeSeconds));

  const firstLine = `${title} ${score}/${records.length} · ${difficulty}${options.map((option) => ` · ${option}`).join('')}`;
  const marks = records.map((record) => record.correct ? '🟩' : '🟥').join('');
  const seed = settings.questionSet === 'random' ? `Seed ${settings.generatedSeed ?? settings.seed} · ` : '';
  return [
    firstLine,
    marks,
    `${seed}${versionInfo}`,
  ].join('\n');
}
