/**
 * llm-bitflip-resilience kernel.
 *
 * Pure, dependency-free, full-precision functions. The only import is the
 * plain measured-data file, which holds numbers transcribed from the RadiAI
 * paper and has no code of its own. Canonical units: parameters (count),
 * bytes, flips, days, W. Rounding belongs to model.ts, never here.
 *
 * What is measured and what is assumed
 * ------------------------------------
 * Measured (paper): survival versus injected flips for two FP16 models, 20 to
 * 80 flips, greedy decoding, one software/hardware stack, n = 25 per dose and
 * two seed batches per model.
 * Assumed (this module): the curve-collapse scaling S(n | N) = S_ref(n / s),
 * s = (N / N_ref)^alpha, the Poisson arrival of upsets, and the optional
 * SECDED analytics. The upset rate is a user input, never a physical claim.
 */

import {
  MEASURED_FLIPS_MAX,
  MEASURED_FLIPS_MIN,
  MODELS,
  SEMANTIC_COLLAPSE,
  SWEEPS,
  type DoseRow,
  type BatchId,
  type ModelId,
} from '../data/radiai-measured';
import { OUTCOMES } from '../data/outcomes';

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/** Mean Gregorian month, days (365.25 / 12). */
export const DAYS_PER_MONTH = 30.4375;
/** Decimal gigabyte, bytes. */
export const BYTES_PER_GB = 1e9;
/** Largest finite FP16 value. */
export const FP16_MAX = 65504;
/** Smallest positive normal FP16 value, 2^-14. */
export const FP16_MIN_NORMAL = 6.103515625e-5;
/** SECDED (72,64) storage overhead: 8 check bits per 64 data bits. */
export const SECDED_OVERHEAD = 0.125;
export const DEFAULT_WEIGHT_MAGNITUDE = 0.02;

/** Cruise-altitude illustrative range quoted by the paper, citing JESD89A. */
export const CRUISE_RATE_RANGE_FLIPS_PER_GB_MONTH = [1e-2, 1e1] as const;

/* ------------------------------------------------------------------ */
/* FP16 bit field, from first principles                               */
/* ------------------------------------------------------------------ */

export type BitClass = 'sign' | 'exponent' | 'mantissa';

export type Fp16Fields = { sign: 0 | 1; exponent: number; mantissa: number };

export function fp16Fields(bits: number): Fp16Fields {
  const b = bits & 0xffff;
  return { sign: ((b >> 15) & 1) as 0 | 1, exponent: (b >> 10) & 0x1f, mantissa: b & 0x3ff };
}

/** Decode a 16-bit pattern: sign bit 15, exponent bits 10 to 14 (bias 15), mantissa bits 0 to 9. */
export function fp16Decode(bits: number): number {
  const { sign, exponent, mantissa } = fp16Fields(bits);
  const s = sign === 1 ? -1 : 1;
  if (exponent === 0x1f) return mantissa === 0 ? s * Infinity : Number.NaN;
  if (exponent === 0) return s * mantissa * 2 ** -24;
  return s * (1 + mantissa / 1024) * 2 ** (exponent - 15);
}

function roundHalfEven(v: number): number {
  const f = Math.floor(v);
  const d = v - f;
  if (d < 0.5) return f;
  if (d > 0.5) return f + 1;
  return f % 2 === 0 ? f : f + 1;
}

/** Encode to the nearest FP16 pattern (round to nearest, ties to even). */
export function fp16Encode(x: number): number {
  if (Number.isNaN(x)) return 0x7e00;
  const signBit = x < 0 || Object.is(x, -0) ? 0x8000 : 0;
  const a = Math.abs(x);
  if (a === 0) return signBit;
  if (a === Infinity || a >= 65520) return signBit | 0x7c00;
  if (a < FP16_MIN_NORMAL) {
    const m = roundHalfEven(a / 2 ** -24);
    return signBit | m; // m = 1024 correctly becomes the smallest normal, 0x0400
  }
  let e = Math.floor(Math.log2(a));
  while (2 ** e > a) e -= 1;
  while (2 ** (e + 1) <= a) e += 1;
  let m = roundHalfEven((a / 2 ** e - 1) * 1024);
  if (m === 1024) {
    m = 0;
    e += 1;
  }
  if (e > 15) return signBit | 0x7c00;
  return signBit | ((e + 15) << 10) | m;
}

/** Flip exactly one bit (XOR with 1 << k) of a 16-bit pattern. Self-inverse. */
export function flipBit(bits: number, k: number): number {
  if (!Number.isInteger(k) || k < 0 || k > 15) throw new RangeError(`Bit index ${k} is outside 0..15`);
  return ((bits & 0xffff) ^ (1 << k)) & 0xffff;
}

export function bitClass(k: number): BitClass {
  if (k === 15) return 'sign';
  if (k >= 10) return 'exponent';
  return 'mantissa';
}

export type FlipEffect = {
  bit: number;
  bitClass: BitClass;
  bitsBefore: number;
  bitsAfter: number;
  before: number;
  after: number;
  /** after / before. Infinite or NaN when the flip lands on the Inf/NaN pattern. */
  ratio: number;
  kind: 'finite' | 'inf-pattern' | 'nan-pattern';
  /** For exponent bits on a normal weight: log2 of the magnitude change, signed. Otherwise undefined. */
  log2Swing?: number;
};

/** Effect of flipping bit k of an FP16 pattern. */
export function flipEffect(bits: number, k: number): FlipEffect {
  const after = flipBit(bits, k);
  const before = fp16Decode(bits);
  const decoded = fp16Decode(after);
  const f0 = fp16Fields(bits);
  const f1 = fp16Fields(after);
  let kind: FlipEffect['kind'] = 'finite';
  if (f1.exponent === 0x1f) kind = f1.mantissa === 0 ? 'inf-pattern' : 'nan-pattern';
  const bothNormal = f0.exponent !== 0 && f0.exponent !== 0x1f && f1.exponent !== 0 && f1.exponent !== 0x1f;
  const cls = bitClass(k);
  return {
    bit: k,
    bitClass: cls,
    bitsBefore: bits & 0xffff,
    bitsAfter: after,
    before,
    after: decoded,
    ratio: before === 0 ? (decoded === 0 ? 1 : Infinity) : decoded / before,
    kind,
    log2Swing: cls === 'exponent' && bothNormal ? f1.exponent - f0.exponent : undefined,
  };
}

/**
 * Multiplicative factor 2^(+/- 2^(k-10)) from flipping exponent bit k (10..14)
 * on a normal weight: x2, x4, x16, x256, x65536. Direction up if the bit was 0.
 */
export function exponentFlipFactor(k: number, bitWasZero: boolean): number {
  if (k < 10 || k > 14) throw new RangeError('Exponent bits are 10..14');
  const log2 = 2 ** (k - 10);
  return 2 ** (bitWasZero ? log2 : -log2);
}

/** Probabilities for one uniform-random flip across the 16 bit positions. */
export const P_BIT_CLASS = { sign: 1 / 16, exponent: 5 / 16, mantissa: 10 / 16, bit14: 1 / 16 } as const;

/** P(at least one flip lands on bit 14) among n independent uniform flips. */
export function pAtLeastOneBit14(nFlips: number): number {
  return 1 - (15 / 16) ** Math.max(0, nFlips);
}

/** P(at least one flip lands on an exponent bit) among n independent uniform flips. */
export function pAtLeastOneExponent(nFlips: number): number {
  return 1 - (11 / 16) ** Math.max(0, nFlips);
}

/** Result of flipping bit 14 of a weight of the given magnitude (positive). */
export function bit14Effect(weightMagnitude: number): FlipEffect {
  return flipEffect(fp16Encode(weightMagnitude), 14);
}

/* ------------------------------------------------------------------ */
/* Dose conversion and footprint                                       */
/* ------------------------------------------------------------------ */

export function fpbFromFlips(flips: number, params: number): number {
  return (flips / params) * 1e9;
}

export function flipsFromFpb(fpb: number, params: number): number {
  return (fpb * params) / 1e9;
}

export function footprintBytes(params: number, bytesPerParam: number): number {
  return params * bytesPerParam;
}

export function bytesToGb(bytes: number): number {
  return bytes / BYTES_PER_GB;
}

/* ------------------------------------------------------------------ */
/* Measured survival curves                                            */
/* ------------------------------------------------------------------ */

export type CurvePoint = { flips: number; survival: number };

/** Survival as a fraction (0 to 1) for each row of a sweep. */
function rowsToPoints(rows: DoseRow[]): CurvePoint[] {
  return rows.map((r) => ({ flips: r.flips, survival: r.survivalPct / 100 }));
}

export function sweepRows(model: ModelId, batch: 'original' | 'replication'): DoseRow[] {
  const s = SWEEPS.find((x) => x.model === model && x.batch === batch);
  if (!s) throw new Error(`No sweep for model ${model}, batch ${batch}`);
  return s.rows;
}

/** Mean of the two batches at each dose (both batches share the same dose grid per model). */
export function meanSurvivalCurve(model: ModelId): CurvePoint[] {
  const a = rowsToPoints(sweepRows(model, 'original'));
  const b = rowsToPoints(sweepRows(model, 'replication'));
  return a.map((p, i) => {
    if (b[i].flips !== p.flips) throw new Error('Batch dose grids differ');
    return { flips: p.flips, survival: (p.survival + b[i].survival) / 2 };
  });
}

/** Linear interpolation inside a sorted curve. Caller guarantees x within the curve range. */
function lerpCurve(points: CurvePoint[], x: number): number {
  for (let i = 0; i < points.length - 1; i++) {
    const p = points[i];
    const q = points[i + 1];
    if (x >= p.flips && x <= q.flips) {
      const t = (x - p.flips) / (q.flips - p.flips);
      return p.survival + t * (q.survival - p.survival);
    }
  }
  throw new RangeError(`x = ${x} is outside the curve`);
}

export type SurvivalRegion = 'measured' | 'interpolated-low' | 'unmeasured-low' | 'unmeasured-high';

export type SurvivalSample = { survival: number; region: SurvivalRegion };

const MODEL_A_MEAN = meanSurvivalCurve('A');
const MODEL_B_MEAN = meanSurvivalCurve('B');

/**
 * Model A mean survival curve S_ref(n), n in absolute flips of the reference
 * model. Linear between measured doses. Below the lowest dose (20 flips) there
 * is no data: with assumeCleanAtZero the curve runs linearly from S(0) = 1
 * (an assumption, shaded "interpolated, not measured"); without it the curve is
 * held at the first measured value and flagged "unmeasured-low". Above the
 * highest dose (80 flips) the curve is held at its last measured value and
 * flagged "unmeasured-high": that is a stated assumption, not a measurement.
 */
export function survivalRef(n: number, assumeCleanAtZero: boolean): SurvivalSample {
  const first = MODEL_A_MEAN[0];
  const last = MODEL_A_MEAN[MODEL_A_MEAN.length - 1];
  if (n < MEASURED_FLIPS_MIN) {
    if (assumeCleanAtZero) {
      const t = Math.max(0, n) / MEASURED_FLIPS_MIN;
      return { survival: 1 + t * (first.survival - 1), region: 'interpolated-low' };
    }
    return { survival: first.survival, region: 'unmeasured-low' };
  }
  if (n > MEASURED_FLIPS_MAX) return { survival: last.survival, region: 'unmeasured-high' };
  return { survival: lerpCurve(MODEL_A_MEAN, n), region: 'measured' };
}

/* ------------------------------------------------------------------ */
/* Empirical crossings and the tolerance scaling                       */
/* ------------------------------------------------------------------ */

/**
 * First 50 % crossing of an observed survival curve by linear interpolation,
 * the paper's "model-free empirical crossing". Returns flips and FPB (using
 * the FPB printed in the paper's rows).
 */
export function empiricalCrossing(rows: DoseRow[]): { flips: number; fpb: number } {
  for (let i = 0; i < rows.length - 1; i++) {
    const p = rows[i];
    const q = rows[i + 1];
    if (p.survivalPct >= 50 && q.survivalPct < 50) {
      const t = (p.survivalPct - 50) / (p.survivalPct - q.survivalPct);
      return { flips: p.flips + t * (q.flips - p.flips), fpb: p.fpb + t * (q.fpb - p.fpb) };
    }
  }
  throw new Error('Survival curve does not cross 50 % within the ladder');
}

/** Absolute-flip empirical crossings for every batch, keyed "A-original" etc. */
export function allCrossings(): Record<string, { flips: number; fpb: number }> {
  const out: Record<string, { flips: number; fpb: number }> = {};
  for (const s of SWEEPS) out[`${s.model}-${s.batch}`] = empiricalCrossing(s.rows);
  return out;
}

const CROSSINGS = allCrossings();

/** Reference model parameter count (Model A). */
export const N_REF = MODELS.A.params;

/** Anchor: Model A crossing, mean of the two batches, absolute flips. */
export const N50_REF = (CROSSINGS['A-original'].flips + CROSSINGS['A-replication'].flips) / 2;

/** Batch band of the anchor, absolute flips (replication, original). */
export const N50_REF_BAND: [number, number] = [CROSSINGS['A-replication'].flips, CROSSINGS['A-original'].flips];

/** Exponent from one ratio of crossings (larger model / smaller model) and the parameter ratio. */
export function alphaFromRatio(crossingRatio: number, paramRatio: number): number {
  return Math.log(crossingRatio) / Math.log(paramRatio);
}

export type AlphaDerivation = {
  paramRatio: number;
  batchMatchedRatios: [number, number];
  batchMatchedAlpha: [number, number];
  crossBatchRatios: [number, number];
  crossBatchAlpha: [number, number];
  /** Mean of the two batch-matched exponents, used as the default. */
  twoPointAlpha: number;
};

/** Derive alpha from the two measured models. Computed, not typed in. */
export function deriveAlpha(): AlphaDerivation {
  const paramRatio = MODELS.A.params / MODELS.B.params;
  const ao = CROSSINGS['A-original'].flips;
  const ar = CROSSINGS['A-replication'].flips;
  const bo = CROSSINGS['B-original'].flips;
  const br = CROSSINGS['B-replication'].flips;
  const matchedOrig = ao / bo;
  const matchedRep = ar / br;
  const low = Math.min(ao, ar) / Math.max(bo, br);
  const high = Math.max(ao, ar) / Math.min(bo, br);
  const batchMatchedAlpha: [number, number] = [alphaFromRatio(matchedRep, paramRatio), alphaFromRatio(matchedOrig, paramRatio)];
  return {
    paramRatio,
    batchMatchedRatios: [matchedRep, matchedOrig],
    batchMatchedAlpha,
    crossBatchRatios: [low, high],
    crossBatchAlpha: [alphaFromRatio(low, paramRatio), alphaFromRatio(high, paramRatio)],
    twoPointAlpha: (batchMatchedAlpha[0] + batchMatchedAlpha[1]) / 2,
  };
}

export const ALPHA_DERIVATION = deriveAlpha();

/** Presets: alpha = 1 is scale-invariant per-parameter tolerance; the two-point fit is NOT a scaling law. */
export const ALPHA_PRESETS = [
  { id: 'scale-invariant', label: 'Scale-invariant per-parameter tolerance', alpha: 1 },
  { id: 'two-point', label: 'Two-point fit (not a scaling law)', alpha: 0.32 },
] as const;
export const DEFAULT_ALPHA = 0.32;

/** s = (N / N_ref)^alpha: the factor by which the curve is stretched along the flips axis. */
export function scaleFactor(params: number, alpha: number): number {
  return (params / N_REF) ** alpha;
}

/** N50(N) = N50_ref * (N / N_ref)^alpha, absolute flips. */
export function n50Flips(params: number, alpha: number): number {
  return N50_REF * scaleFactor(params, alpha);
}

/** Survival of an N-parameter model after n absolute flips, under curve collapse. */
export function survivalAt(nFlips: number, params: number, alpha: number, assumeCleanAtZero: boolean): SurvivalSample {
  return survivalRef(nFlips / scaleFactor(params, alpha), assumeCleanAtZero);
}

/**
 * Residual of the curve-collapse assumption against Model B's measured mean
 * curve: measured minus predicted, per Model B dose, at the given alpha.
 * Shows the user how good the assumption is at that alpha.
 */
export function collapseResidualsAgainstModelB(alpha: number): { flips: number; measured: number; predicted: number; residual: number; region: SurvivalRegion }[] {
  return MODEL_B_MEAN.map((p) => {
    const pred = survivalAt(p.flips, MODELS.B.params, alpha, true);
    return { flips: p.flips, measured: p.survival, predicted: pred.survival, residual: p.survival - pred.survival, region: pred.region };
  });
}

/** Root-mean-square of the collapse residuals over doses whose mapped point is inside the measured Model A range. */
export function collapseRmse(alpha: number): number {
  const r = collapseResidualsAgainstModelB(alpha).filter((x) => x.region === 'measured');
  if (r.length === 0) return Number.NaN;
  return Math.sqrt(r.reduce((s, x) => s + x.residual * x.residual, 0) / r.length);
}

/* ------------------------------------------------------------------ */
/* Exposure and accumulation                                           */
/* ------------------------------------------------------------------ */

/** Expected flips in an interval: lambda = r * GB * T, r in flips/GB/month, T in days. */
export function expectedFlips(rateFlipsPerGbMonth: number, gigabytes: number, intervalDays: number): number {
  return (rateFlipsPerGbMonth * gigabytes * intervalDays) / DAYS_PER_MONTH;
}

/** Mean time to reach N50 raw flips, days (no ECC): t50 = N50 / (r * GB). */
export function t50DaysNoEcc(n50: number, rateFlipsPerGbMonth: number, gigabytes: number): number {
  return (n50 / (rateFlipsPerGbMonth * gigabytes)) * DAYS_PER_MONTH;
}

export function poissonPmf(k: number, lambda: number): number {
  if (lambda === 0) return k === 0 ? 1 : 0;
  let logFact = 0;
  for (let i = 2; i <= k; i++) logFact += Math.log(i);
  return Math.exp(k * Math.log(lambda) - lambda - logFact);
}

/**
 * E[f(K)] for K ~ Poisson(lambda), summed until the remaining tail is below
 * 1e-12 of probability. Log-space recursion, stable for large lambda.
 */
export function poissonExpect(lambda: number, f: (k: number) => number): number {
  if (lambda <= 0) return f(0);
  const kMax = Math.ceil(lambda + 12 * Math.sqrt(lambda) + 40);
  let logP = -lambda; // k = 0
  let sum = 0;
  for (let k = 0; k <= kMax; k++) {
    if (k > 0) logP += Math.log(lambda) - Math.log(k);
    sum += Math.exp(logP) * f(k);
  }
  return sum;
}

/**
 * E[f(K)] where f is constant (= fSat) for k > kSat. Sums only to kSat and
 * adds fSat times the remaining Poisson mass, so large lambda stays cheap and exact.
 */
export function poissonExpectSaturating(lambda: number, f: (k: number) => number, kSat: number, fSat: number): number {
  if (lambda <= 0) return f(0);
  let logP = -lambda;
  let cdf = 0;
  let sum = 0;
  for (let k = 0; k <= kSat; k++) {
    if (k > 0) logP += Math.log(lambda) - Math.log(k);
    const p = Math.exp(logP);
    cdf += p;
    sum += p * f(k);
  }
  return sum + fSat * Math.max(0, 1 - cdf);
}

/** Poisson probability that K exceeds kSat (mass beyond the largest summed term). */
export function poissonTailAbove(lambda: number, kSat: number): number {
  if (lambda <= 0) return 0;
  let logP = -lambda;
  let cdf = 0;
  for (let k = 0; k <= kSat; k++) {
    if (k > 0) logP += Math.log(lambda) - Math.log(k);
    cdf += Math.exp(logP);
  }
  return Math.max(0, 1 - cdf);
}

/* ------------------------------------------------------------------ */
/* Optional SECDED analytics (not measured by RadiAI)                  */
/* ------------------------------------------------------------------ */

/** 64-bit data words in a store of the given size. */
export function secdedWords(bytes: number): number {
  return bytes / 8;
}

/** Expected words hit twice within an interval, independent single-bit upsets, lambda << W. */
export function expectedDoubleHits(lambda: number, words: number): number {
  return (lambda * lambda) / (2 * words);
}

/** Raw flips at which one double-hit is expected: sqrt(2 W). */
export function flipsBeforeOneDoubleHit(words: number): number {
  return Math.sqrt(2 * words);
}

/** Expected uncorrectable events U = m * lambda + lambda^2 / (2 W). */
export function uncorrectableEvents(lambda: number, words: number, mbuFraction: number): number {
  return mbuFraction * lambda + expectedDoubleHits(lambda, words);
}

/** Corrupted bits per uncorrectable event, worst case, no reload on detection. */
export const BITS_PER_UNCORRECTABLE = 2;

/** Effective flips n_eff = 2 U fed to the survival curve. */
export function effectiveFlipsEcc(lambda: number, words: number, mbuFraction: number): number {
  return BITS_PER_UNCORRECTABLE * uncorrectableEvents(lambda, words, mbuFraction);
}

/**
 * Raw flips lambda* at which the effective flips reach n_eff: the positive root of
 * lambda^2 / (2 W) + m * lambda = n_eff / 2, written in the cancellation-free form
 * lambda* = 2 h / (m + sqrt(m^2 + 2 h / W)) with h = n_eff / 2.
 */
export function rawFlipsToReachEffective(nEff: number, words: number, mbuFraction: number): number {
  const h = nEff / BITS_PER_UNCORRECTABLE;
  return (2 * h) / (mbuFraction + Math.sqrt(mbuFraction * mbuFraction + (2 * h) / words));
}

/* ------------------------------------------------------------------ */
/* Canary (single-prompt fluency probe) Bayes                          */
/* ------------------------------------------------------------------ */

/**
 * P(collapsed | probe passes) given the Semantic Collapse share s of the
 * (collapsed + intact) pool, the probe pass rate among collapsed trials and the
 * pass rate among intact trials (1 minus the false-alarm rate).
 */
export function canaryPosterior(share: number, passRateCollapsed: number, passRateIntact: number): number {
  const a = share * passRateCollapsed;
  const b = (1 - share) * passRateIntact;
  return a / (a + b);
}

export const CANARY = {
  sensitivityPct: SEMANTIC_COLLAPSE.probePassesCollapsedPct.map((x) => 100 - x).reverse() as [number, number],
  missPct: SEMANTIC_COLLAPSE.probePassesCollapsedPct,
  falseAlarmPct: SEMANTIC_COLLAPSE.probeFlagsIntactPct,
};

/* ------------------------------------------------------------------ */
/* Memory power (ports for composition)                                */
/* ------------------------------------------------------------------ */

export function memoryPowerW(gigabytes: number, wattsPerGb: number): number {
  return gigabytes * wattsPerGb;
}

export function eccExtraPowerW(gigabytes: number, wattsPerGb: number, eccEnabled: boolean): number {
  return eccEnabled ? SECDED_OVERHEAD * gigabytes * wattsPerGb : 0;
}

/* ------------------------------------------------------------------ */
/* Semantic Collapse share band (paper ranges only)                    */
/* ------------------------------------------------------------------ */

/**
 * Share of surviving trials in Semantic Collapse, as the paper's two reported
 * ranges: lowest two doses 12 to 35 %, highest two doses 35 to 67 %. Between
 * them the paper gives no resolved range, so the full envelope is returned.
 * The dose is the mapped flips n / s on Model A's axis.
 */
export function semanticCollapseSurvivorShareBand(mappedFlips: number): { low: number; high: number; basis: 'lowest-two-doses' | 'highest-two-doses' | 'envelope' } {
  const lo = SEMANTIC_COLLAPSE.survivorShareLowestTwoDosesPct;
  const hi = SEMANTIC_COLLAPSE.survivorShareHighestTwoDosesPct;
  if (mappedFlips <= 30 && mappedFlips >= MEASURED_FLIPS_MIN) return { low: lo[0] / 100, high: lo[1] / 100, basis: 'lowest-two-doses' };
  if (mappedFlips >= 70 && mappedFlips <= MEASURED_FLIPS_MAX) return { low: hi[0] / 100, high: hi[1] / 100, basis: 'highest-two-doses' };
  return { low: lo[0] / 100, high: hi[1] / 100, basis: 'envelope' };
}


/* ------------------------------------------------------------------ */
/* Per-dose outcome split (paper Figure 6; author-supplied counts)     */
/* ------------------------------------------------------------------ */

export type OutcomeBatchChoice = BatchId | 'both';

export type OutcomeDose = {
  flips: number;
  n: number;
  intact: number;
  impaired: number;
  semanticCollapse: number;
  dead: number;
  /** Semantic Collapse trials / (n - dead). NaN if nobody survived. */
  scShareOfSurvivors: number;
  /** Semantic Collapse trials / n. */
  scShareOfTrials: number;
  survivalFraction: number;
};

/** Counts per dose for a model, pooled over the chosen batch (or both batches). */
export function outcomeSplit(model: ModelId, batch: OutcomeBatchChoice): OutcomeDose[] {
  const byDose = new Map<number, OutcomeDose>();
  for (const r of OUTCOMES) {
    if (r.model !== model || (batch !== 'both' && r.batch !== batch)) continue;
    const d = byDose.get(r.flips) ?? { flips: r.flips, n: 0, intact: 0, impaired: 0, semanticCollapse: 0, dead: 0, scShareOfSurvivors: 0, scShareOfTrials: 0, survivalFraction: 0 };
    d.n += r.n; d.intact += r.intact; d.impaired += r.impaired; d.semanticCollapse += r.semanticCollapse; d.dead += r.dead;
    byDose.set(r.flips, d);
  }
  return [...byDose.values()].sort((a, b) => a.flips - b.flips).map((d) => {
    const surv = d.n - d.dead;
    return { ...d, scShareOfSurvivors: surv > 0 ? d.semanticCollapse / surv : Number.NaN, scShareOfTrials: d.semanticCollapse / d.n, survivalFraction: surv / d.n };
  });
}

/**
 * Semantic Collapse share of survivors pooled over the lowest two and the
 * highest two measured doses (the paper's comparison in Section 7.1).
 */
export function scSurvivorShareLowHigh(model: ModelId, batch: OutcomeBatchChoice): { low: number; high: number } {
  const d = outcomeSplit(model, batch);
  const pool = (xs: OutcomeDose[]) => {
    const sc = xs.reduce((a, x) => a + x.semanticCollapse, 0);
    const surv = xs.reduce((a, x) => a + x.n - x.dead, 0);
    return surv > 0 ? sc / surv : Number.NaN;
  };
  return { low: pool(d.slice(0, 2)), high: pool(d.slice(-2)) };
}

/** Semantic Collapse as a share of all trials in one batch (paper: 11 to 17 % in every batch). */
export function scShareOfTrialsInBatch(model: ModelId, batch: BatchId): number {
  const d = outcomeSplit(model, batch);
  return d.reduce((a, x) => a + x.semanticCollapse, 0) / d.reduce((a, x) => a + x.n, 0);
}

/** The measured model whose parameter count is nearest (in log terms) to the chosen size. */
export function nearestMeasuredModel(params: number): ModelId {
  const dA = Math.abs(Math.log(params / MODELS.A.params));
  const dB = Math.abs(Math.log(params / MODELS.B.params));
  return dA <= dB ? 'A' : 'B';
}

/** The measured dose nearest to a requested number of flips, for the chosen model. */
export function nearestMeasuredDose(model: ModelId, flips: number): number {
  const doses = outcomeSplit(model, 'both').map((d) => d.flips);
  return doses.reduce((best, f) => (Math.abs(f - flips) < Math.abs(best - flips) ? f : best), doses[0]);
}

/* ------------------------------------------------------------------ */
/* Bit 14 (the top exponent bit) on a normal weight                    */
/* ------------------------------------------------------------------ */

export type Bit14Case = 'times-2^16' | 'inf-nan-pattern' | 'divides-by-2^16' | 'subnormal-or-zero';

/**
 * What flipping bit 14 does, by weight magnitude (normal FP16 weights):
 * |w| < 1 gives x 2^16; 1 <= |w| < 2 lands on an all-ones exponent, the Inf bit
 * pattern for exactly 1.0 and a NaN pattern otherwise; |w| >= 2 has bit 14
 * already set, so the flip lowers the exponent by 16: an exact division by 2^16
 * from |w| >= 4 upward, and for 2 <= |w| < 4 a fall into the subnormal range
 * (the weight becomes about 1e-5 or less, precision lost).
 */
export function bit14Case(weightMagnitude: number): Bit14Case {
  const a = Math.abs(weightMagnitude);
  if (a < FP16_MIN_NORMAL) return 'subnormal-or-zero';
  if (a < 1) return 'times-2^16';
  if (a < 2) return 'inf-nan-pattern';
  return 'divides-by-2^16';
}

/* ------------------------------------------------------------------ */
/* Optional outcomes.csv loader                                        */
/* ------------------------------------------------------------------ */

export type OutcomeRow = {
  model: string;
  batch: string;
  flips: number;
  n: number;
  intact: number;
  impaired: number;
  semanticCollapse: number;
  dead: number;
};

/** Parse a per-dose outcomes CSV (model, batch, flips, n, intact, impaired, semantic_collapse, dead). Rejects rows whose counts do not sum to n. */
export function parseOutcomesCsv(text: string): OutcomeRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const want = ['model', 'batch', 'flips', 'n', 'intact', 'impaired', 'semantic_collapse', 'dead'];
  if (want.some((w, i) => header[i] !== w)) throw new Error(`outcomes.csv header must be: ${want.join(', ')}`);
  return lines.slice(1).map((line, i) => {
    const c = line.split(',').map((x) => x.trim());
    const nums = c.slice(2).map(Number);
    if (c.length !== 8 || nums.some((x) => !Number.isFinite(x))) throw new Error(`outcomes.csv line ${i + 2} is malformed`);
    const [flips, n, intact, impaired, semanticCollapse, dead] = nums;
    if (intact + impaired + semanticCollapse + dead !== n) throw new Error(`outcomes.csv line ${i + 2}: counts do not sum to n`);
    return { model: c[0], batch: c[1], flips, n, intact, impaired, semanticCollapse, dead };
  });
}

/* ------------------------------------------------------------------ */
/* Top-level kernel                                                    */
/* ------------------------------------------------------------------ */

export type KernelInputs = {
  modelParamsBillions: number;
  bytesPerParam: number;
  upsetRateFlipsPerGbMonth: number;
  scrubIntervalDays: number;
  toleranceExponent: number;
  weightMagnitude: number;
  injectedFlips: number;
  eccEnabled: number;
  mbuFraction: number;
  memoryWPerGb: number;
  assumeCleanAtZero: number;
};

export type KernelOutputs = {
  memoryFootprintGb: number;
  storageWithEccGb: number;
  fpb: number;
  n50Flips: number;
  fpb50: number;
  t50Days: number;
  timeToN50Ratio: number;
  expectedSurvival: number;
  survivalAtInjectedFlips: number;
  lambdaFlips: number;
  effectiveFlips: number;
  unmeasuredMass: number;
  pBit14AtLeastOne: number;
  pExponentAtLeastOne: number;
  bit14Factor: number;
  scSurvivorShareLow: number;
  scSurvivorShareHigh: number;
  memoryPowerW: number;
  eccExtraPowerW: number;
};

/** t50 for a given size, with or without SECDED. Days. */
export function t50Days(params: number, i: Pick<KernelInputs, 'bytesPerParam' | 'upsetRateFlipsPerGbMonth' | 'toleranceExponent' | 'eccEnabled' | 'mbuFraction'>): number {
  const gb = bytesToGb(footprintBytes(params, i.bytesPerParam));
  const n50 = n50Flips(params, i.toleranceExponent);
  const perDay = (i.upsetRateFlipsPerGbMonth * gb) / DAYS_PER_MONTH;
  if (i.eccEnabled >= 0.5) {
    const words = secdedWords(footprintBytes(params, i.bytesPerParam));
    return rawFlipsToReachEffective(n50, words, i.mbuFraction) / perDay;
  }
  return n50 / perDay;
}

export function runKernel(i: KernelInputs): KernelOutputs {
  const params = i.modelParamsBillions * 1e9;
  const bytes = footprintBytes(params, i.bytesPerParam);
  const gb = bytesToGb(bytes);
  const clean = i.assumeCleanAtZero >= 0.5;
  const ecc = i.eccEnabled >= 0.5;
  const alpha = i.toleranceExponent;
  const s = scaleFactor(params, alpha);
  const n50 = n50Flips(params, alpha);

  const lambda = expectedFlips(i.upsetRateFlipsPerGbMonth, gb, i.scrubIntervalDays);
  const words = secdedWords(bytes);

  // Number of surviving-curve arguments: raw flips, or 2 x uncorrectable events with SECDED.
  const mean = ecc ? uncorrectableEvents(lambda, words, i.mbuFraction) : lambda;
  const perEvent = ecc ? BITS_PER_UNCORRECTABLE : 1;
  const f = (k: number) => survivalAt(perEvent * k, params, alpha, clean).survival;
  const kSat = Math.ceil((MEASURED_FLIPS_MAX * s) / perEvent) + 1;
  const fSat = survivalAt(perEvent * (kSat + 1), params, alpha, clean).survival;
  const expectedSurvival = poissonExpectSaturating(mean, f, kSat, fSat);
  const unmeasuredMass = poissonTailAbove(mean, kSat);

  const smallParams = MODELS.B.params;
  const t50 = t50Days(params, i);
  const t50Small = t50Days(smallParams, i);

  const mappedInjected = i.injectedFlips / s;
  const band = semanticCollapseSurvivorShareBand(mappedInjected);
  const b14 = bit14Effect(i.weightMagnitude);

  return {
    memoryFootprintGb: gb,
    storageWithEccGb: ecc ? gb * (1 + SECDED_OVERHEAD) : gb,
    fpb: fpbFromFlips(i.injectedFlips, params),
    n50Flips: n50,
    fpb50: fpbFromFlips(n50, params),
    t50Days: t50,
    timeToN50Ratio: t50 / t50Small,
    expectedSurvival,
    survivalAtInjectedFlips: survivalAt(i.injectedFlips, params, alpha, clean).survival,
    lambdaFlips: lambda,
    effectiveFlips: ecc ? effectiveFlipsEcc(lambda, words, i.mbuFraction) : lambda,
    unmeasuredMass,
    pBit14AtLeastOne: pAtLeastOneBit14(i.injectedFlips),
    pExponentAtLeastOne: pAtLeastOneExponent(i.injectedFlips),
    bit14Factor: b14.ratio,
    scSurvivorShareLow: band.low,
    scSurvivorShareHigh: band.high,
    memoryPowerW: memoryPowerW(gb, i.memoryWPerGb),
    eccExtraPowerW: eccExtraPowerW(gb, i.memoryWPerGb, ecc),
  };
}

/** Human-readable warnings the kernel owns (extrapolation, unvalidated regions, fault-model limits). */
export function kernelWarnings(i: KernelInputs, o: KernelOutputs): string[] {
  const w: string[] = [];
  const bMin = MODELS.B.paramsBillions;
  const bMax = MODELS.A.paramsBillions;
  const [rMin, rMax] = CRUISE_RATE_RANGE_FLIPS_PER_GB_MONTH;
  if (i.bytesPerParam !== 2) {
    w.push('Dose-response not measured for this precision. The paper measured FP16 only; the footprint changes but the survival curve is applied unchanged.');
  }
  if (i.modelParamsBillions < bMin || i.modelParamsBillions > bMax) {
    w.push(`Extrapolation: ${i.modelParamsBillions} B parameters lies outside the two measured models (${bMin.toFixed(2)} B to ${bMax.toFixed(2)} B). Tolerance scaling is an assumption there.`);
  }
  if (i.upsetRateFlipsPerGbMonth > rMax || i.upsetRateFlipsPerGbMonth < rMin) {
    w.push(`Upset rate ${i.upsetRateFlipsPerGbMonth} flips/GB/month is outside the paper's illustrative cruise-altitude range (${rMin} to ${rMax} flips/GB/month). User-defined, unvalidated.`);
  }
  if (i.injectedFlips < MEASURED_FLIPS_MIN || i.injectedFlips > MEASURED_FLIPS_MAX) {
    w.push(`${i.injectedFlips} injected flips lies outside the measured dose range of ${MEASURED_FLIPS_MIN} to ${MEASURED_FLIPS_MAX} flips. Not measured.`);
  }
  if (o.unmeasuredMass > 0.01) {
    w.push(`${(o.unmeasuredMass * 100).toFixed(1)} % of the accumulation probability sits beyond the measured dose range; expected survival there is held at its last measured value (not measured).`);
  }
  const a = ALPHA_DERIVATION.crossBatchAlpha;
  if (i.toleranceExponent < a[0] || i.toleranceExponent > a[1]) {
    w.push(`Tolerance exponent ${i.toleranceExponent} is outside the range implied by the two measured models (${a[0].toFixed(2)} to ${a[1].toFixed(2)}). A hypothesis, not a fit.`);
  }
  if (i.eccEnabled >= 0.5) {
    w.push('SECDED analytics are an analytic extension, not measured by RadiAI. They ignore multi-cell upsets in logic, SRAM, caches and controllers, and upsets in the check bits themselves.');
    const words = secdedWords(footprintBytes(i.modelParamsBillions * 1e9, i.bytesPerParam));
    if (o.lambdaFlips > 0.01 * words) w.push('Expected flips exceed 1 % of the word count; the double-hit formula (valid for flips much fewer than words) is no longer reliable.');
  }
  if (i.assumeCleanAtZero < 0.5) {
    w.push('Below 20 flips there is no data and the clean-at-zero assumption is off: survival is held at the 20-flip value there.');
  }
  return w;
}
