/**
 * Per-dose outcome split (paper Figure 6): intact, impaired, Semantic Collapse
 * and dead trial counts. Supplied by the author as outcome_split_summary.csv
 * (kept alongside this file, verbatim). The paper itself prints these splits
 * only as a figure, so this file is author-supplied data, not a table
 * transcription. model.test.ts checks every row against the survival tables
 * (dead = n minus survivors) and the paper's stated Semantic Collapse ranges.
 *
 * Categories (paper Section 7.1): dead = no parseable answers; Semantic
 * Collapse = parseable answers with accuracy <= 40 %; intact = within 10
 * points of clean; impaired = the band between (40 % < accuracy < clean - 10).
 */
import type { BatchId, ModelId } from './radiai-measured';

export type OutcomeCounts = {
  model: ModelId;
  batch: BatchId;
  flips: number;
  n: number;
  intact: number;
  impaired: number;
  semanticCollapse: number;
  dead: number;
};

export const OUTCOMES: OutcomeCounts[] = [
  { model: 'A', batch: 'original', flips: 20, n: 25, intact: 12, impaired: 1, semanticCollapse: 6, dead: 6 },
  { model: 'A', batch: 'original', flips: 30, n: 25, intact: 16, impaired: 1, semanticCollapse: 2, dead: 6 },
  { model: 'A', batch: 'original', flips: 40, n: 25, intact: 7, impaired: 2, semanticCollapse: 5, dead: 11 },
  { model: 'A', batch: 'original', flips: 50, n: 25, intact: 5, impaired: 0, semanticCollapse: 5, dead: 15 },
  { model: 'A', batch: 'original', flips: 60, n: 25, intact: 2, impaired: 3, semanticCollapse: 3, dead: 17 },
  { model: 'A', batch: 'original', flips: 80, n: 25, intact: 3, impaired: 0, semanticCollapse: 3, dead: 19 },
  { model: 'A', batch: 'replication', flips: 20, n: 25, intact: 15, impaired: 1, semanticCollapse: 1, dead: 8 },
  { model: 'A', batch: 'replication', flips: 30, n: 25, intact: 11, impaired: 3, semanticCollapse: 3, dead: 8 },
  { model: 'A', batch: 'replication', flips: 40, n: 25, intact: 6, impaired: 0, semanticCollapse: 3, dead: 16 },
  { model: 'A', batch: 'replication', flips: 50, n: 25, intact: 4, impaired: 1, semanticCollapse: 4, dead: 16 },
  { model: 'A', batch: 'replication', flips: 60, n: 25, intact: 5, impaired: 2, semanticCollapse: 3, dead: 15 },
  { model: 'A', batch: 'replication', flips: 80, n: 25, intact: 3, impaired: 1, semanticCollapse: 3, dead: 18 },
  { model: 'B', batch: 'original', flips: 20, n: 25, intact: 9, impaired: 0, semanticCollapse: 4, dead: 12 },
  { model: 'B', batch: 'original', flips: 30, n: 25, intact: 8, impaired: 0, semanticCollapse: 5, dead: 12 },
  { model: 'B', batch: 'original', flips: 40, n: 25, intact: 5, impaired: 0, semanticCollapse: 4, dead: 16 },
  { model: 'B', batch: 'original', flips: 50, n: 25, intact: 2, impaired: 0, semanticCollapse: 2, dead: 21 },
  { model: 'B', batch: 'original', flips: 60, n: 25, intact: 2, impaired: 0, semanticCollapse: 2, dead: 21 },
  { model: 'B', batch: 'original', flips: 70, n: 25, intact: 3, impaired: 0, semanticCollapse: 2, dead: 20 },
  { model: 'B', batch: 'original', flips: 80, n: 25, intact: 2, impaired: 0, semanticCollapse: 4, dead: 19 },
  { model: 'B', batch: 'replication', flips: 20, n: 25, intact: 13, impaired: 0, semanticCollapse: 3, dead: 9 },
  { model: 'B', batch: 'replication', flips: 30, n: 25, intact: 6, impaired: 0, semanticCollapse: 5, dead: 14 },
  { model: 'B', batch: 'replication', flips: 40, n: 25, intact: 5, impaired: 0, semanticCollapse: 5, dead: 15 },
  { model: 'B', batch: 'replication', flips: 50, n: 25, intact: 5, impaired: 1, semanticCollapse: 4, dead: 15 },
  { model: 'B', batch: 'replication', flips: 60, n: 25, intact: 4, impaired: 0, semanticCollapse: 4, dead: 17 },
  { model: 'B', batch: 'replication', flips: 70, n: 25, intact: 2, impaired: 0, semanticCollapse: 5, dead: 18 },
  { model: 'B', batch: 'replication', flips: 80, n: 25, intact: 1, impaired: 1, semanticCollapse: 3, dead: 20 },
];

/** Author-supplied names in the CSV, for the provenance table. */
export const OUTCOME_CSV_MODEL_NAMES: Record<ModelId, string> = {
  A: 'NousResearch_Meta-Llama-3-8B-Instruct',
  B: 'Qwen_Qwen2.5-3B-Instruct',
};
