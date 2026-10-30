/** Presentation formatting only. No model logic. */

export function fmtNumber(x: number, digits = 3): string {
  if (!Number.isFinite(x)) return x > 0 ? '∞' : x < 0 ? '−∞' : 'n/a';
  if (x === 0) return '0';
  const a = Math.abs(x);
  if (a >= 1e6 || a < 1e-3) return x.toExponential(digits - 1).replace('e', ' × 10^').replace('^+', '^');
  return parseFloat(x.toPrecision(digits)).toLocaleString('en-GB', { maximumFractionDigits: 6 });
}

export function fmtPct(x: number, digits = 1): string {
  return Number.isFinite(x) ? `${(x * 100).toFixed(digits)} %` : 'n/a';
}

export function fmtDays(days: number): string {
  if (!Number.isFinite(days)) return 'n/a';
  if (days < 1) return `${fmtNumber(days * 24, 3)} h`;
  if (days < 365.25 * 2) return `${fmtNumber(days, 3)} days`;
  return `${fmtNumber(days / 365.25, 3)} years`;
}

export function fmtFactor(x: number): string {
  if (!Number.isFinite(x)) return 'Inf bit pattern';
  if (x >= 1) return `× ${fmtNumber(x, 4)}`;
  return `× 1/${fmtNumber(1 / x, 4)}`;
}

export function bitString(bits: number): string {
  return (bits & 0xffff).toString(2).padStart(16, '0');
}

export function hex16(bits: number): string {
  return `0x${(bits & 0xffff).toString(16).toUpperCase().padStart(4, '0')}`;
}
