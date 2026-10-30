/**
 * Measured data transcribed verbatim from the RadiAI paper.
 *
 *   P. Capaldo and A. Brooker, "RadiAI: Characterising Stochastic Bit-Flip
 *   Resilience in Large Language Models for Aerospace Edge-Computing
 *   Applications", IET Aerospace & AI Technical Networks (preprint).
 *
 * This file is plain data with no imports. Nothing here is synthesised: every
 * number is a table entry or a stated range from the paper, and the table
 * integrity tests in model.test.ts re-derive the dependent columns.
 *
 * Conditions of measurement (paper Sections 3 and 5): FP16 weights, greedy
 * decoding, injected single-bit software faults, uniform layer sampling, one
 * software/hardware stack, 100 questions per trial, n = 25 trials per dose
 * level, two independent seed batches per model.
 */

export type ModelId = 'A' | 'B';
export type BatchId = 'original' | 'replication';

/** One dose level of a dense sweep (one row of paper Tables 4 to 7). */
export type DoseRow = {
  flips: number;
  /** Flips per billion parameters, as printed in the paper. */
  fpb: number;
  n: number;
  /** Mean MCQ accuracy, per cent. */
  meanAccuracyPct: number;
  /** Mean Jaccard similarity of the fluency probe, 0 to 1. */
  meanJaccard: number;
  /** Fraction of trials with accuracy > 0, per cent. */
  survivalPct: number;
};

export type Sweep = {
  model: ModelId;
  batch: BatchId;
  /** Paper table that holds the rows. */
  table: 4 | 5 | 6 | 7;
  rows: DoseRow[];
};

/**
 * Models are shown by their checkpoint names, as in the paper. Internal ids
 * 'A' (the larger model, the scaling reference) and 'B' (the smaller) are
 * code identifiers only.
 */
export const MODELS: Record<ModelId, {
  uiName: string;
  shortName: string;
  params: number;
  paramsBillions: number;
  checkpoint: string;
  precision: 'FP16';
  cleanAccuracyPct: number;
  cleanAccuracyCiPct: number;
  paramShare: { selfAttentionPct: number; mlpPct: number; otherPct: number };
}> = {
  A: {
    uiName: 'Meta-Llama-3-8B-Instruct (8.03 B)',
    shortName: 'Meta-Llama-3-8B-Instruct',
    params: 8.03e9,
    paramsBillions: 8.03,
    checkpoint: 'Meta-Llama-3-8B-Instruct',
    precision: 'FP16',
    cleanAccuracyPct: 69.3,
    cleanAccuracyCiPct: 5.2,
    paramShare: { selfAttentionPct: 16.7, mlpPct: 70.2, otherPct: 13.1 },
  },
  B: {
    uiName: 'Qwen2.5-3B-Instruct (3.09 B)',
    shortName: 'Qwen2.5-3B-Instruct',
    params: 3.086e9,
    paramsBillions: 3.086,
    checkpoint: 'Qwen2.5-3B-Instruct',
    precision: 'FP16',
    cleanAccuracyPct: 57.0,
    cleanAccuracyCiPct: 5.6,
    paramShare: { selfAttentionPct: 11.0, mlpPct: 78.9, otherPct: 10.1 },
  },
};

const row = (flips: number, fpb: number, acc: number, jac: number, surv: number): DoseRow => ({
  flips, fpb, n: 25, meanAccuracyPct: acc, meanJaccard: jac, survivalPct: surv,
});

export const SWEEPS: Sweep[] = [
  // Table 4: id A, original batch (no 70-flip level).
  { model: 'A', batch: 'original', table: 4, rows: [
    row(20, 2.49, 38.4, 0.649, 76.0), row(30, 3.74, 47.1, 0.679, 76.0), row(40, 4.98, 25.6, 0.400, 56.0),
    row(50, 6.23, 14.9, 0.312, 40.0), row(60, 7.47, 13.3, 0.133, 32.0), row(80, 9.96, 8.7, 0.121, 24.0),
  ] },
  // Table 5: id B, original batch.
  { model: 'B', batch: 'original', table: 5, rows: [
    row(20, 6.48, 24.5, 0.410, 52.0), row(30, 9.72, 22.4, 0.396, 52.0), row(40, 12.96, 15.8, 0.270, 36.0),
    row(50, 16.20, 5.2, 0.077, 16.0), row(60, 19.44, 5.1, 0.097, 16.0), row(70, 22.68, 7.8, 0.121, 20.0),
    row(80, 25.92, 6.9, 0.116, 24.0),
  ] },
  // Table 6: id A, independent replication.
  { model: 'A', batch: 'replication', table: 6, rows: [
    row(20, 2.49, 44.1, 0.627, 68.0), row(30, 3.74, 39.8, 0.593, 68.0), row(40, 4.98, 16.8, 0.318, 36.0),
    row(50, 6.23, 14.6, 0.208, 36.0), row(60, 7.47, 18.7, 0.250, 40.0), row(80, 9.96, 12.5, 0.264, 28.0),
  ] },
  // Table 7: id B, independent replication.
  { model: 'B', batch: 'replication', table: 7, rows: [
    row(20, 6.48, 33.7, 0.538, 64.0), row(30, 9.72, 18.2, 0.329, 44.0), row(40, 12.96, 13.9, 0.277, 40.0),
    row(50, 16.20, 15.6, 0.248, 40.0), row(60, 19.44, 10.8, 0.204, 32.0), row(70, 22.68, 7.0, 0.152, 28.0),
    row(80, 25.92, 5.0, 0.066, 20.0),
  ] },
];

/** Measured dose window, absolute flips (paper Section 5.3). */
export const MEASURED_FLIPS_MIN = 20;
export const MEASURED_FLIPS_MAX = 80;

/** Paper Table 8: all four matched-stack batches. FPB units. */
export type Table8Row = {
  model: ModelId;
  batch: BatchId;
  logisticLd50Fpb: number;
  bootstrapCi95Fpb: [number, number];
  empiricalCrossingFpb: number;
};

export const TABLE_8: Table8Row[] = [
  { model: 'A', batch: 'original', logisticLd50Fpb: 5.85, bootstrapCi95Fpb: [4.94, 6.95], empiricalCrossingFpb: 5.45 },
  { model: 'A', batch: 'replication', logisticLd50Fpb: 5.05, bootstrapCi95Fpb: [3.28, 6.62], empiricalCrossingFpb: 4.44 },
  { model: 'B', batch: 'original', logisticLd50Fpb: 6.65, bootstrapCi95Fpb: [-8.04, 11.11], empiricalCrossingFpb: 10.13 },
  { model: 'B', batch: 'replication', logisticLd50Fpb: 10.09, bootstrapCi95Fpb: [1.09, 13.89], empiricalCrossingFpb: 8.75 },
];

/** Paper Table 3 (summary of Table 8, with absolute-flip conversions). */
export const TABLE_3 = {
  A: { empiricalFpb: [4.44, 5.45], logisticFpb: [5.05, 5.85], absoluteFlipsApprox: [36, 44] },
  B: { empiricalFpb: [8.75, 10.13], logisticFpb: [6.65, 10.09], absoluteFlipsApprox: [27, 31] },
  /** Superseded run on different hardware and software; provenance only. */
  B_superseded: { logisticFpb: 12.0, absoluteFlipsApprox: 37 },
} as const;

/** Paper Sections 6.3 and 7.2: ratios of absolute-flip crossings, larger / smaller. */
export const PAPER_CROSSING_RATIOS = {
  batchMatched: [1.32, 1.40],
  crossBatchExtremes: [1.16, 1.63],
  parameterRatio: 2.602,
} as const;

/** Paper Sections 7.1 and 11: Semantic Collapse and canary-probe statistics. */
export const SEMANTIC_COLLAPSE = {
  /** Share of all trials meeting the criterion, every batch. */
  shareOfTrialsPct: [11, 17],
  /** Share of surviving trials: lowest two doses, then highest two doses. */
  survivorShareLowestTwoDosesPct: [12, 35],
  survivorShareHighestTwoDosesPct: [35, 67],
  /** Probe response with Jaccard >= 0.5 to the clean output, among collapsed trials. */
  probePassesCollapsedPct: [17, 24],
  /** Probe response with Jaccard < 0.5 among intact trials (false alarm). */
  probeFlagsIntactPct: [6, 18],
  /** Definition: parseable answers and accuracy at or below this, per cent. */
  accuracyCeilingPct: 40,
  chanceFloorPct: 25,
  intactWithinPointsOfClean: 10,
} as const;

/** Pilot sweeps in the paper that this module does not use. */
export const NOT_USED = [
  'Small-model pilots (n = 2 to 3 per dose, descriptive only; paper Sections 6.4 and 6.5).',
  'Superseded run on different hardware and software (paper Table 3, last row).',
] as const;

/** Per-dose outcome counts are in outcomes.ts (author-supplied; paper Figure 6). */
