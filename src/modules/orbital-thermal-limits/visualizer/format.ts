// Single source of truth for turning a raw SI value into a compact, human
// string, shared by ParamSlider, the telemetry bar and the host adapter's
// derived-value list. kernel.ts deliberately keeps its own tiny, self-
// contained copy of the watts formatter rather than importing this file --
// it "contains the entire model and nothing else" by design, so it can be
// compiled standalone with tsc outside the app build (see its own header
// comment) -- so there are two copies of the watts logic on purpose, not by
// accident. Everything else calls this module.

/**
 * Format a value in watts as W, kW, MW or GW, choosing the largest unit
 * that keeps the mantissa readable. Used for compute power, heat flow and
 * electrical power, which is most quantities in this module.
 */
export function formatWatts(watts: number, decimals = 2): string {
  const { value, unit } = splitWatts(watts);
  // splitWatts rounds to a fixed 2 decimals; redo with the caller's
  // decimals if they asked for something else.
  if (decimals === 2) return `${value} ${unit}`;
  const a = Math.abs(watts);
  if (a >= 1e9) return `${(watts / 1e9).toFixed(decimals)} GW`;
  if (a >= 1e6) return `${(watts / 1e6).toFixed(decimals)} MW`;
  if (a >= 1e3) return `${(watts / 1e3).toFixed(decimals)} kW`;
  return `${Math.round(watts)} W`;
}

/**
 * Same thresholds as formatWatts, but returns the numeric value and unit
 * separately rather than a formatted string -- for callers like model.ts's
 * host adapter whose output contract is {value: number, unit: string}.
 */
export function splitWatts(watts: number): { value: number; unit: 'GW' | 'MW' | 'kW' | 'W' } {
  const a = Math.abs(watts);
  if (a >= 1e9) return { value: parseFloat((watts / 1e9).toFixed(2)), unit: 'GW' };
  if (a >= 1e6) return { value: parseFloat((watts / 1e6).toFixed(2)), unit: 'MW' };
  if (a >= 1e3) return { value: parseFloat((watts / 1e3).toFixed(2)), unit: 'kW' };
  return { value: Math.round(watts), unit: 'W' };
}

/**
 * Format an arbitrary quantity (area in m^2, flow in kg/s, etc.) with a
 * compact k / M / G suffix once it crosses 1,000, rather than watts'
 * kW/MW/GW convention, since "10 Mm^2" isn't how anyone writes ten million
 * square metres. Small values keep their normal decimal formatting.
 */
export function formatCompact(value: number, unit: string, step: number): string {
  const a = Math.abs(value);
  let num: string;
  if (a >= 1e9) num = `${(value / 1e9).toFixed(2)}B`;
  else if (a >= 1e6) num = `${(value / 1e6).toFixed(2)}M`;
  else if (a >= 1e4) num = Math.round(value).toLocaleString('en-US');
  else {
    const decimals = step >= 1 ? 0 : Math.min(2, (String(step).split('.')[1] || '').length);
    num = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
  }
  return unit ? `${num} ${unit}` : num;
}

/** Dispatches to formatWatts for watts, formatCompact for everything else. */
export function formatQuantity(value: number, unit: string, step: number): string {
  if (unit === 'W') return formatWatts(value);
  return formatCompact(value, unit, step);
}
