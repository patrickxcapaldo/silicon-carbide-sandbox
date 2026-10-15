import type { ComponentType, ReactNode } from 'react';

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';
export type ChallengeSet = 'classic' | 'random';
export type ChallengeTimer = 'off' | 'stopwatch' | 'limit';

export interface ChallengeLevel<Inputs extends Record<string, number> = Record<string, number>> {
  id: string;
  title: string;
  lesson: string;
  inputs: Inputs;
  difficulty: ChallengeDifficulty | 'mixed';
  archetype: string;
  expectedAnswer?: string;
}

export interface ChallengeHint {
  title: string;
  working: ReactNode;
}

export interface ChallengeEvaluation {
  answerId: string;
  values: Record<string, number>;
  formattedValues?: Record<string, string>;
  status: string;
  diagnostics: string[];
  sunlitFraction?: number;
  gapPct: number;
  details?: unknown;
}

export interface ChallengeDefinition<Inputs extends Record<string, number>> {
  id: string;
  title: string;
  versionInfo: string;
  options: { id: string; label: string }[];
  classicLevels: ChallengeLevel<Inputs>[];
  generate: (
    rng: () => number,
    difficulty: ChallengeDifficulty,
    context: { answerId: string; avoidArchetype?: string; roundIndex: number },
  ) => ChallengeLevel<Inputs>;
  evaluate: (inputs: Inputs) => ChallengeEvaluation;
  hints: (level: ChallengeLevel<Inputs>, evaluation: ChallengeEvaluation) => [ChallengeHint, ChallengeHint, ChallengeHint];
  SpecCard: ComponentType<{ level: ChallengeLevel<Inputs>; evaluation: ChallengeEvaluation }>;
  Reveal: ComponentType<{
    level: ChallengeLevel<Inputs>;
    evaluation: ChallengeEvaluation;
    selectedAnswer: string | null;
    correct: boolean;
  }>;
  Formulas: ComponentType;
  timeLimitsSeconds: Record<ChallengeDifficulty, number>;
}

export interface ChallengeSettings {
  questionSet: ChallengeSet;
  difficulty: ChallengeDifficulty;
  hints: boolean;
  timer: ChallengeTimer;
  seed: string;
  generatedSeed?: string;
}

export interface ChallengeRoundRecord<Inputs extends Record<string, number> = Record<string, number>> {
  level: ChallengeLevel<Inputs>;
  evaluation: ChallengeEvaluation;
  selectedAnswer: string | null;
  correct: boolean;
  hintsUsed: number;
}
