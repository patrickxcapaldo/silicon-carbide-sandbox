/**
 * Chart series for the Explore views. Every number comes from the kernel or
 * the module run; this file only samples them on a grid and maps values onto
 * chart axes. No model logic lives in the React components.
 */
import { MODELS, SWEEPS, MEASURED_FLIPS_MAX, MEASURED_FLIPS_MIN, type BatchId, type ModelId } from '../data/radiai-measured';
import {
  N50_REF,
  allCrossings,
  fpbFromFlips,
  n50Flips,
  survivalAt,
  t50Days,
  bytesToGb,
  footprintBytes,
  scaleFactor,
  type SurvivalRegion,
} from '../sandbox/kernel';
import { llmBitflipResilience } from '../sandbox/module';

export type AxisMode = 'flips' | 'fpb';

export type MeasuredSeries = { model: ModelId; batch: BatchId; points: { x: number; flips: number; y: number }[] };

/** Measured survival points for the four batches, on the chosen axis. */
export function measuredSeries(axis: AxisMode): MeasuredSeries[] {
  return SWEEPS.map((s) => ({
    model: s.model,
    batch: s.batch,
    points: s.rows.map((r) => ({
      x: axis === 'flips' ? r.flips : fpbFromFlips(r.flips, MODELS[s.model].params),
      flips: r.flips,
      y: r.survivalPct / 100,
    })),
  }));
}

export type CurveSample = { x: number; flips: number; y: number; region: SurvivalRegion };

/** Curve-collapse survival curve for a model of the given size. */
export function collapsedCurve(params: number, alpha: number, assumeClean: boolean, axis: AxisMode, xMax: number, steps = 240): CurveSample[] {
  const out: CurveSample[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (xMax * i) / steps;
    const flips = axis === 'flips' ? x : (x * params) / 1e9;
    const s = survivalAt(flips, params, alpha, assumeClean);
    out.push({ x, flips, y: s.survival, region: s.region });
  }
  return out;
}

/** Axis position of a flips value for a model. */
export function flipsToAxis(flips: number, params: number, axis: AxisMode): number {
  return axis === 'flips' ? flips : fpbFromFlips(flips, params);
}

/** Edges of the mapped measured window for the chosen size, in absolute flips. */
export function measuredWindowFlips(params: number, alpha: number): [number, number] {
  const s = scaleFactor(params, alpha);
  return [MEASURED_FLIPS_MIN * s, MEASURED_FLIPS_MAX * s];
}

export function crossingMarkers(axis: AxisMode): { model: ModelId; batch: BatchId; x: number }[] {
  const c = allCrossings();
  return Object.entries(c).map(([key, v]) => {
    const [model, batch] = key.split('-') as [ModelId, BatchId];
    return { model, batch, x: axis === 'flips' ? v.flips : v.fpb };
  });
}

export function n50OnAxis(params: number, alpha: number, axis: AxisMode): number {
  const n = n50Flips(params, alpha);
  return axis === 'flips' ? n : fpbFromFlips(n, params);
}

/* ---------- tolerance versus exposure ---------- */

export type TolerancePoint = { billions: number; n50: number; n50Alpha1: number; footprintGb: number; ratio: number; ratioAlpha1: number };

const LOG_MIN_B = 1;
const LOG_MAX_B = 100;

export function toleranceSeries(alpha: number, bytesPerParam: number, rate: number, eccEnabled: number, mbu: number, steps = 120): TolerancePoint[] {
  const out: TolerancePoint[] = [];
  const small = MODELS.B.params;
  const base = { bytesPerParam, upsetRateFlipsPerGbMonth: rate, eccEnabled, mbuFraction: mbu };
  for (let i = 0; i <= steps; i++) {
    const billions = LOG_MIN_B * (LOG_MAX_B / LOG_MIN_B) ** (i / steps);
    const params = billions * 1e9;
    out.push({
      billions,
      n50: n50Flips(params, alpha),
      n50Alpha1: n50Flips(params, 1),
      footprintGb: bytesToGb(footprintBytes(params, bytesPerParam)),
      ratio: t50Days(params, { ...base, toleranceExponent: alpha }) / t50Days(small, { ...base, toleranceExponent: alpha }),
      ratioAlpha1: t50Days(params, { ...base, toleranceExponent: 1 }) / t50Days(small, { ...base, toleranceExponent: 1 }),
    });
  }
  return out;
}

export const TOLERANCE_X_RANGE_B: [number, number] = [LOG_MIN_B, LOG_MAX_B];

/* ---------- accumulation ---------- */

export type AccumulationPoint = { days: number; lambda: number; surv: number; survEcc: number; lambdaEccEffective: number; beyondMeasured: boolean };

export function accumulationSeries(inputs: Record<string, number>, steps = 80): AccumulationPoint[] {
  const lo = 0.01;
  const hi = 3650;
  const out: AccumulationPoint[] = [];
  const limit = MEASURED_FLIPS_MAX * scaleFactor(inputs.modelParamsBillions * 1e9, inputs.toleranceExponent);
  for (let i = 0; i <= steps; i++) {
    const days = lo * (hi / lo) ** (i / steps);
    const off = llmBitflipResilience.run({ ...inputs, scrubIntervalDays: days, eccEnabled: 0 }).values;
    const on = llmBitflipResilience.run({ ...inputs, scrubIntervalDays: days, eccEnabled: 1 }).values;
    out.push({ days, lambda: off.lambdaFlips, surv: off.expectedSurvival, survEcc: on.expectedSurvival, lambdaEccEffective: on.effectiveFlips, beyondMeasured: off.lambdaFlips > limit });
  }
  return out;
}

/* ---------- log slider mapping ---------- */

export function logToPos(value: number, min: number, max: number): number {
  return (Math.log10(value) - Math.log10(min)) / (Math.log10(max) - Math.log10(min));
}

export function posToLog(pos: number, min: number, max: number): number {
  return 10 ** (Math.log10(min) + pos * (Math.log10(max) - Math.log10(min)));
}

/** Reference anchor, for labels. */
export const ANCHOR_FLIPS = N50_REF;
