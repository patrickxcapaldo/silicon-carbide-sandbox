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

/** Exact when the value is a whole number (2^16 must read 65,536, not 65,540); otherwise four significant figures. */
function fmtExactOrSig(v: number): string {
  const r = Math.round(v);
  if (v < 1e9 && Math.abs(v - r) <= 1e-9 * v) return r.toLocaleString('en-GB');
  return fmtNumber(v, 4);
}

export function fmtFactor(x: number): string {
  if (Number.isNaN(x)) return 'NaN bit pattern';
  if (!Number.isFinite(x)) return x > 0 ? 'Inf bit pattern' : '−Inf bit pattern';
  if (x === 0) return '→ 0';
  const sign = x < 0 ? '−' : '';
  const m = Math.abs(x);
  if (m >= 1) return `× ${sign}${fmtExactOrSig(m)}`;
  return `× ${sign}1/${fmtExactOrSig(1 / m)}`;
}

const SUPERSCRIPT: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };

/** Compact axis label for a power of ten, e.g. 10⁻³. */
export function fmtPow10(exponent: number): string {
  return `10${String(exponent).split('').map((c) => SUPERSCRIPT[c] ?? c).join('')}`;
}

export function bitString(bits: number): string {
  return (bits & 0xffff).toString(2).padStart(16, '0');
}

export function hex16(bits: number): string {
  return `0x${(bits & 0xffff).toString(16).toUpperCase().padStart(4, '0')}`;
}
