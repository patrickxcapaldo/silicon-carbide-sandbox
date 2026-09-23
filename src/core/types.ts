export interface Parameter {
  id: string;
  name: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  description: string;
}

export interface Equation {
  id: string;
  label: string;
  latex: string;
  description: string;
}

export interface Result {
  outputs: Record<string, { label: string; value: number; unit: string; description?: string }>;
  warnings?: string[];
  /**
   * The three-tier claim evaluation (dossier §5.2/§9.3), present only when
   * this run of the module is checking a specific public claim rather than
   * just computing a design point. Optional and additive: a module that only
   * does forward simulation (no claim attached) leaves this undefined.
   */
  claim?: ClaimEvaluation;
}

/**
 * A physical quantity that may be given as a single number or as a
 * min/nominal/max range, always with a unit. Matches the dossier's
 * `Bound = number | { min, nominal, max }` (§9.3).
 */
export type Bound =
  | { kind: 'point'; value: number; unit: string }
  | { kind: 'range'; min: number; nominal: number; max: number; unit: string };

export function boundNominal(b: Bound): number {
  return b.kind === 'point' ? b.value : b.nominal;
}

/** One input ranked by how much it would move the verdict if it were wrong. */
export interface Sensitivity {
  /** Key of the input this concerns, matching a Parameter.id or PortSpec.key. */
  parameterId: string;
  label: string;
  /**
   * Factor by which this parameter would need to be wrong to flip the
   * verdict, e.g. 2.1 means "wrong by 2.1x would flip it". Smaller is more
   * load-bearing. The dossier's "load-bearing parameter" (§5.2) is whichever
   * entry has the smallest value here.
   */
  flipFactor: number;
  note?: string;
}

export type Verdict = 'impossible' | 'implausible' | 'unproven' | 'consistent' | 'untestable-as-stated';

/**
 * The dossier's three-tier result (§5.2, §9.3): law limit (Tier 1),
 * demonstrated envelope (Tier 2, cites Registry ids), and the claim under
 * test (Tier 3). headroom = Tier1 / Tier2. gap = claim vs Tier2. Both are
 * expressed in the claim's own units (e.g. required radiator area, so that
 * a *smaller* number is "better" for the claim -- callers should document
 * their own sign convention alongside any published number).
 */
export interface ClaimEvaluation {
  /** Verbatim, sourced claim being checked, and where it was archived. */
  claimText: string;
  claimSource: string;
  claimArchivedUrl?: string;
  lawLimit?: Bound;
  demonstratedEnvelope?: Bound;
  claimed?: Bound;
  headroom?: number;
  gap?: number;
  verdict: Verdict;
  /** Required when verdict is 'untestable-as-stated' (dossier §5.2). */
  conditionalVerdict?: string;
  sensitivity: Sensitivity[];
  loadBearingParameterId: string;
  assumptionsUsed: { id: string; revision: number }[];
}

export interface SubstackArticle {
  title: string;
  url: string;
  publishedAt: string; // ISO date string: YYYY-MM-DD
  summary?: string;
}

export interface Manifest {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  articleUrl?: string; // Main editorial link
  relatedArticles?: SubstackArticle[]; // Tagged/sorted article series
  parameters: Parameter[];
  equations: Equation[];
}

export interface Module {
  manifest: Manifest;
  compute: (inputs: Record<string, number>) => Result;
  View?: React.ComponentType<{
    inputs: Record<string, number>;
    onChange: (id: string, value: number) => void;
    results: Result;
  }>;
}