import type { ChallengeDifficulty } from '../challenge/types';

export type PlayDifficulty = ChallengeDifficulty;
export type PlaySide = 'a' | 'b';

export interface PlayScenario {
  id: string;
  title: string;
  inputs: Record<string, number>;
}

/** One change to the baseline spacecraft, already applied to a full input set. */
export interface PlayChange {
  leverId: string;
  summary: string;
  inputs: Record<string, number>;
}

export interface PlayLever {
  id: string;
  /** One-line law behind the lever. Static, and true for every value in range. */
  lesson: string;
  make: (base: Record<string, number>, rng: () => number) => PlayChange | null;
}

export interface PlayEvaluation {
  value: number;
  /** Which ceiling or loss binds, where the module has one. */
  binding?: string;
  /** True when the run clamped an input or raised an error. Such rounds are redrawn. */
  rejected: boolean;
}

export interface PlayInputInfo {
  key: string;
  label: string;
  unit: string;
}

export interface PlayDefinition {
  id: string;
  title: string;
  versionInfo: string;
  /** What is being compared, for example "sustainable compute power". */
  metricLabel: string;
  format: (value: number) => string;
  intro: string;
  scenarios: PlayScenario[];
  levers: PlayLever[];
  evaluate: (inputs: Record<string, number>) => PlayEvaluation;
  /** Display names for `binding` values. Omit when a module has no binding idea. */
  bindingLabels?: Record<string, string>;
  inputInfo: PlayInputInfo[];
}

export interface PlayOption {
  change: PlayChange;
  value: number;
  binding?: string;
}

export interface PlayRound {
  index: number;
  scenario: PlayScenario;
  baseValue: number;
  baseBinding?: string;
  a: PlayOption;
  b: PlayOption;
  higher: PlaySide;
  /** Larger value divided by smaller value. Always at least 1. */
  ratio: number;
  difficulty: PlayDifficulty;
}

export interface PlayRoundRecord {
  round: PlayRound;
  picked: PlaySide | null;
  correct: boolean;
}
