import { forwardRef, type ReactNode } from 'react';
import {
  accumulationSeries,
  alphaDataRange,
  collapsedCurve,
  crossingMarkers,
  curveReadingAtN50,
  flipsToAxis,
  intactMarkers,
  measuredSeries,
  measuredWindowFlips,
  n50OnAxis,
  ratioAtAlphaRange,
  TAIL_DECAY_FLIPS,
  toleranceBand,
  toleranceSeries,
  TOLERANCE_X_RANGE_B,
  type AxisMode,
} from './series';
import { MODELS, type ModelId } from '../data/radiai-measured';
import { collapseResidualsAgainstModelB, collapseRmse, outcomeSplit, type OutcomeBatchChoice } from '../sandbox/kernel';
import { InfoTip } from '../../../core/ui';
import { fmtDays, fmtNumber, fmtPct, fmtPow10 } from './format';

/* Palette variables are resolved on screen by .bfr-chart and replaced by exportChart.ts on download. */
const C = {
  bg: 'var(--c-bg)', text: 'var(--c-text)', mute: 'var(--c-mute)', grid: 'var(--c-grid)',
  a: 'var(--c-a)', dead: 'var(--c-dead)', b: 'var(--c-b)', accent: 'var(--c-accent)', shade: 'var(--c-shade)', ref: 'var(--c-ref)',
};

const W = 760;
const M = { l: 64, r: 64, t: 40, b: 56 };

type Scale = (v: number) => number;
const lin = (d0: number, d1: number, r0: number, r1: number): Scale => (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
const lg = (d0: number, d1: number, r0: number, r1: number): Scale => (v) =>
  r0 + ((Math.log10(Math.max(v, 1e-300)) - Math.log10(d0)) / (Math.log10(d1) - Math.log10(d0))) * (r1 - r0);

const txt = (extra: React.CSSProperties = {}): React.CSSProperties => ({ fill: C.text, fontSize: 12, fontFamily: 'var(--sans, Inter, system-ui, sans-serif)', ...extra });
const mono = (extra: React.CSSProperties = {}): React.CSSProperties => ({ fill: C.mute, fontSize: 11, fontFamily: 'var(--mono, ui-monospace, monospace)', ...extra });

function path(points: [number, number][]): string {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
}

function Frame({ title, subtitle, height, children, svgRef, label }: { title: string; subtitle?: string; height: number; children: ReactNode; svgRef: React.Ref<SVGSVGElement>; label: string }) {
  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${height}`} width="100%" role="img" aria-label={label} xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', maxWidth: '100%' }}>
      <rect x={0} y={0} width={W} height={height} style={{ fill: C.bg }} />
      <text x={M.l} y={22} style={txt({ fontSize: 14, fontWeight: 700 })}>{title}</text>
      {subtitle && <text x={M.l} y={36} style={mono()}>{subtitle}</text>}
      {children}
    </svg>
  );
}

function Marker({ x, y, shape, hollow, color, size = 4.5 }: { x: number; y: number; shape: 'circle' | 'square'; hollow: boolean; color: string; size?: number }) {
  const common = { style: { fill: hollow ? C.bg : color, stroke: color, strokeWidth: 1.6 } as React.CSSProperties };
  return shape === 'circle'
    ? <circle cx={x} cy={y} r={size} {...common} />
    : <rect x={x - size} y={y - size} width={size * 2} height={size * 2} {...common} />;
}

/* ------------------------------------------------------------------ */
/* View 2: survival versus dose                                         */
/* ------------------------------------------------------------------ */

export const SurvivalChart = forwardRef<SVGSVGElement, {
  params: number; alpha: number; assumeClean: boolean; axis: AxisMode; injectedFlips: number; sizeLabel: string; intervalFlips: number; intervalSurvival: number; showIntact: boolean;
}>(function SurvivalChart({ params, alpha, assumeClean, axis, injectedFlips, sizeLabel, intervalFlips, intervalSurvival, showIntact }, ref) {
  /* Layout: title and subtitle, a legend band, then the plot, then ticks, axis title and footnote, each on its own line. */
  const top = 114;
  const pb = 420;
  const H = pb + 118;
  const xMax = axis === 'flips' ? 120 : 30;
  const x = lin(0, xMax, M.l, W - M.r);
  const y = lin(0, 1, pb, top);
  const curve = collapsedCurve(params, alpha, assumeClean, axis, xMax);
  const [w0, w1] = measuredWindowFlips(params, alpha);
  const xa = Math.min(xMax, flipsToAxis(w0, params, axis));
  const xb = Math.min(xMax, flipsToAxis(w1, params, axis));
  const series = measuredSeries(axis);
  const marks = crossingMarkers(axis);
  const intact = intactMarkers(axis);
  const xTicks = axis === 'flips' ? [0, 20, 40, 60, 80, 100, 120] : [0, 5, 10, 15, 20, 25, 30];
  const n50x = n50OnAxis(params, alpha, axis);
  const n50Off = n50x > xMax;
  const n50Px = x(Math.min(n50x, xMax));
  const n50Right = n50Px > W - M.r - 170;
  const injX = flipsToAxis(injectedFlips, params, axis);
  const injPoint = curve.reduce((best, p) => (Math.abs(p.x - injX) < Math.abs(best.x - injX) ? p : best), curve[0]);
  const intX = flipsToAxis(intervalFlips, params, axis);
  const intOff = intX > xMax;
  const intPx = x(Math.min(intX, xMax));
  const intRight = intPx > W - M.r - (intOff ? 345 : 260);
  const leftWide = x(xa) - x(0) >= 84;
  const rightWide = x(xMax) - x(xb) >= 84;

  // Solid where the chosen curve sits inside the mapped measured window, dashed elsewhere.
  const runs: { measured: boolean; pts: [number, number][] }[] = [];
  for (const p of curve) {
    const measured = p.region === 'measured';
    const pt: [number, number] = [x(p.x), y(p.y)];
    const last = runs[runs.length - 1];
    if (last && last.measured === measured) last.pts.push(pt);
    else {
      if (last) last.pts.push(pt);
      runs.push({ measured, pts: [pt] });
    }
  }

  return (
    <Frame svgRef={ref} height={H} title="Survival versus dose" subtitle={`${sizeLabel} · curve collapse (assumed) · α = ${alpha.toFixed(2)} · survival = not dead (accuracy > 0)`} label="Survival fraction against injected bit flips for two measured models and a collapsed curve for the chosen size">
      {/* Legend band, kept clear of the plot so the curve can never be hidden behind it */}
      <rect x={M.l - 8} y={46} width={W - M.l - M.r + 16} height={58} rx={6} style={{ fill: C.bg, stroke: C.grid }} />
      <g transform={`translate(${M.l + 4} 60)`}>
        <Marker x={4} y={-2} shape="circle" hollow={false} color={C.a} /><text x={16} y={2} style={txt({ fontSize: 11 })}>{MODELS.A.shortName}, original</text>
        <Marker x={4} y={14} shape="circle" hollow color={C.a} /><text x={16} y={18} style={txt({ fontSize: 11 })}>{MODELS.A.shortName}, replication</text>
        <line x1={-2} x2={10} y1={30} y2={30} style={{ stroke: C.accent, strokeWidth: 2.4 }} /><text x={16} y={34} style={txt({ fontSize: 11 })}>Chosen size (assumed)</text>
        <Marker x={304} y={-2} shape="square" hollow={false} color={C.b} /><text x={316} y={2} style={txt({ fontSize: 11 })}>{MODELS.B.shortName}, original</text>
        <Marker x={304} y={14} shape="square" hollow color={C.b} /><text x={316} y={18} style={txt({ fontSize: 11 })}>{MODELS.B.shortName}, replication</text>
        {showIntact && <><path d="M304,26 l5,9 l-10,0 z" style={{ fill: 'none', stroke: C.text, strokeWidth: 1.6 }} /><text x={316} y={34} style={txt({ fontSize: 11 })}>Intact share, both batches pooled</text></>}
      </g>
      {/* Unmeasured regions */}
      <rect x={x(0)} y={top} width={Math.max(0, x(xa) - x(0))} height={pb - top} style={{ fill: C.shade }} />
      <rect x={x(xb)} y={top} width={Math.max(0, x(xMax) - x(xb))} height={pb - top} style={{ fill: C.shade }} />
      {leftWide && <text x={(x(xa) + x(0)) / 2} y={top + 14} textAnchor="middle" style={mono()}>{assumeClean ? 'interpolated,' : 'not measured'}</text>}
      {leftWide && assumeClean && <text x={(x(xa) + x(0)) / 2} y={top + 26} textAnchor="middle" style={mono()}>not measured</text>}
      {rightWide && <text x={(x(xb) + x(xMax)) / 2} y={top + 14} textAnchor="middle" style={mono()}>not measured</text>}
      {/* Grid and axes */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} style={{ stroke: C.grid, strokeWidth: t === 0.5 ? 1.4 : 0.8 }} />
          <text x={M.l - 8} y={y(t) + 4} textAnchor="end" style={mono()}>{Math.round(t * 100)} %</text>
        </g>
      ))}
      {xTicks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={pb} y2={pb + 5} style={{ stroke: C.mute }} />
          <text x={x(t)} y={pb + 18} textAnchor="middle" style={mono()}>{t}</text>
        </g>
      ))}
      <text x={(M.l + W - M.r) / 2} y={pb + 40} textAnchor="middle" style={txt()}>{axis === 'flips' ? 'Injected bit flips (flips)' : 'Dose (flips per billion parameters)'}</text>
      <text transform={`translate(18 ${(top + pb) / 2}) rotate(-90)`} textAnchor="middle" style={txt()}>Survival, not dead (fraction of trials)</text>
      {/* Chosen curve */}
      {runs.map((r, i) => (
        <path key={i} d={path(r.pts)} fill="none" style={{ stroke: C.accent, strokeWidth: 2.4, strokeDasharray: r.measured ? undefined : '5 4', opacity: r.measured ? 1 : 0.75 }} />
      ))}
      {/* 50 % tolerance. When it lies beyond the axis the line is pinned to the edge and the label says so. */}
      <line x1={n50Px} x2={n50Px} y1={top} y2={pb} style={{ stroke: C.accent, strokeDasharray: '2 3', strokeWidth: 1.2 }} />
      <text x={n50Right ? n50Px - 5 : n50Px + 5} y={pb - 8} textAnchor={n50Right ? 'end' : 'start'} style={mono({ fill: C.accent })}>N50 = {fmtNumber(n50x, 3)} {axis === 'flips' ? 'flips' : 'FPB'}{n50Off ? ' (beyond axis)' : ''}</text>
      {/* Where the scrub interval ends: expected raw flips accumulated after one interval (effective flips with SECDED) */}
      <line x1={intPx} x2={intPx} y1={top} y2={pb} style={{ stroke: C.text, strokeWidth: 1, strokeDasharray: '1 4' }} />
      <text x={intRight ? intPx - 5 : intPx + 5} y={pb - 26} textAnchor={intRight ? 'end' : 'start'} style={mono({ fill: C.text, stroke: C.bg, strokeWidth: 3, paintOrder: 'stroke' })}>one scrub interval: {fmtNumber(intervalFlips, 3)} flips{intOff ? ' (beyond axis)' : ''} → {fmtPct(intervalSurvival, 0)}</text>
      {/* Measured points */}
      {series.map((s) => s.points.map((p) => (
        <Marker key={`${s.model}${s.batch}${p.flips}`} x={x(p.x)} y={y(p.y)} shape={s.model === 'A' ? 'circle' : 'square'} hollow={s.batch === 'replication'} color={s.model === 'A' ? C.a : C.b} />
      )))}
      {/* Measured intact share (still usable), pooled over both batches */}
      {showIntact && intact.map((m) => (
        <g key={`intact${m.model}`}>
          <path d={path(m.points.map((p) => [x(p.x), y(p.y)] as [number, number]))} fill="none" style={{ stroke: m.model === 'A' ? C.a : C.b, strokeWidth: 1.2, strokeDasharray: '3 3' }} />
          {m.points.map((p) => <path key={p.flips} d={`M${x(p.x)},${y(p.y) - 6} l5.5,9.5 l-11,0 z`} style={{ fill: C.bg, stroke: m.model === 'A' ? C.a : C.b, strokeWidth: 1.6 }} />)}
        </g>
      ))}
      {/* Empirical crossings */}
      {marks.map((m) => (
        <path key={`${m.model}${m.batch}`} d={`M${x(m.x)},${y(0.5) - 7} l5,7 l-5,7 l-5,-7 z`} style={{ fill: m.model === 'A' ? C.a : C.b, stroke: C.bg, strokeWidth: 1 }} />
      ))}
      {/* Injected dose */}
      <circle cx={x(Math.min(injX, xMax))} cy={y(injPoint.y)} r={6} style={{ fill: 'none', stroke: C.text, strokeWidth: 1.6 }} />
      <text x={M.l} y={pb + 60} style={mono()}>Diamonds mark the four empirical 50 % crossings. Ring marks the injected dose.</text>
      <text x={M.l} y={pb + 74} style={mono()}>White dotted line: flips expected after one scrub interval.</text>
      <text x={M.l} y={pb + 88} style={mono()}>N50 is the mean of the two batch crossings, so the mean curve reads {fmtPct(curveReadingAtN50(), 0)} there, not 50 %.</text>
      <text x={M.l} y={pb + 102} style={mono()}>Dashed beyond the measured window: assumed constant-hazard decay (n0 ≈ {fmtNumber(TAIL_DECAY_FLIPS, 2)} flips).</text>
    </Frame>
  );
});

/** Residual of the collapse assumption against Model B, shown under the survival chart. */
export function ResidualTable({ alpha }: { alpha: number }) {
  const rows = collapseResidualsAgainstModelB(alpha);
  const rmse = collapseRmse(alpha);
  return (
    <div className="bfr-residual">
      <div className="bfr-residual-head">
        <InfoTip label="Why this table always shows Qwen" width={340}>The chosen-size curve is built by stretching the {MODELS.A.shortName} curve (the reference). A fair test needs data the curve was not built from, and {MODELS.B.shortName} is the only other measured model. So this table always compares the collapse prediction against Qwen, whatever model size the slider is on. It does not depend on the size slider, only on α: change α to see how well each exponent reproduces Qwen. Testing against Llama itself would be meaningless, since its residual is zero by construction.</InfoTip>
        Curve-collapse check against {MODELS.B.shortName} at α = {alpha.toFixed(2)}: root-mean-square residual{' '}
        <strong>{Number.isFinite(rmse) ? fmtPct(rmse) : 'n/a'}</strong> over the {rows.filter((r) => r.region === 'measured').length} doses mapped inside {MODELS.A.shortName}’s measured range (compare α values on the same doses; the count changes with α).
      </div>
      <div className="bfr-table-wrap">
        <table>
          <thead><tr><th>{MODELS.B.shortName} dose (flips)</th>{rows.map((r) => <th key={r.flips}>{r.flips}</th>)}</tr></thead>
          <tbody>
            <tr><th>Measured mean survival</th>{rows.map((r) => <td key={r.flips}>{fmtPct(r.measured, 0)}</td>)}</tr>
            <tr><th>Predicted by collapse</th>{rows.map((r) => <td key={r.flips} className={r.region === 'measured' ? '' : 'bfr-dim'}>{fmtPct(r.predicted, 0)}{r.region === 'measured' ? '' : ' *'}</td>)}</tr>
            <tr><th>Residual</th>{rows.map((r) => <td key={r.flips}>{(r.residual * 100).toFixed(0)} {Math.abs(Math.round(r.residual * 100)) === 1 ? 'pt' : 'pts'}</td>)}</tr>
          </tbody>
        </table>
      </div>
      <div className="sci-note">* Predicted from outside {MODELS.A.shortName}’s measured doses (continued at a constant decay rate beyond the measured range). Not measured.</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* View 3: tolerance versus exposure                                    */
/* ------------------------------------------------------------------ */

export const ToleranceChart = forwardRef<SVGSVGElement, {
  alpha: number; bytesPerParam: number; rate: number; ecc: number; mbu: number; ratioLargeVsSmall: number; currentBillions: number; t50Days: number;
}>(function ToleranceChart({ alpha, bytesPerParam, rate, ecc, mbu, ratioLargeVsSmall, currentBillions, t50Days }, ref) {
  const H = 664;
  const data = toleranceSeries(alpha, bytesPerParam, rate, ecc, mbu);
  const band = toleranceBand(bytesPerParam, rate, ecc, mbu);
  const [aLo, aHi] = alphaDataRange();
  const [rLoEnd, rHiEnd] = ratioAtAlphaRange(bytesPerParam, rate, ecc, mbu);
  const [b0, b1] = TOLERANCE_X_RANGE_B;
  const x = lg(b0, b1, M.l, W - M.r);
  const top = { t: M.t + 8, b: 300 };
  const bot = { t: 396, b: H - 56 };
  const n50Max = Math.max(...data.map((d) => d.n50Alpha1), ...data.map((d) => d.n50)) * 1.05;
  const gbMax = Math.max(...data.map((d) => d.footprintGb)) * 1.05;
  const yN = lin(0, n50Max, top.b, top.t);
  const yG = lin(0, gbMax, top.b, top.t);
  const rMin = 0.05;
  const rMax = 4;
  const yR = lg(rMin, rMax, bot.b, bot.t);
  const bTicks = [1, 2, 3.086, 5, 8.03, 10, 20, 50, 100];
  const mA = MODELS.A.paramsBillions;
  const mB = MODELS.B.paramsBillions;
  const shade = (y0: number, y1: number) => (
    <>
      <rect x={x(b0)} y={y0} width={x(mB) - x(b0)} height={y1 - y0} style={{ fill: C.shade }} />
      <rect x={x(mA)} y={y0} width={x(b1) - x(mA)} height={y1 - y0} style={{ fill: C.shade }} />
    </>
  );
  return (
    <Frame svgRef={ref} height={H} title="Tolerance and exposure both grow with size" subtitle={`illustrative model · α = ${alpha.toFixed(2)} · ${bytesPerParam} B per parameter · ${fmtNumber(rate, 3)} flips/GB/month${ecc >= 0.5 ? ' · SECDED (analytic)' : ''}`} label="Tolerance in flips and memory footprint against parameter count, with the ratio of time to tolerance">
      {shade(top.t, top.b)}
      {shade(bot.t, bot.b)}
      <text x={x(mB) - 8} y={top.t + 12} textAnchor="end" style={mono()}>extrapolation</text>
      <text x={x(mA) + 8} y={top.t + 12} style={mono()}>extrapolation</text>
      {/* Top panel: dual axis */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={M.l} x2={W - M.r} y1={yN(t * n50Max)} y2={yN(t * n50Max)} style={{ stroke: C.grid, strokeWidth: 0.8 }} />
          <text x={M.l - 8} y={yN(t * n50Max) + 4} textAnchor="end" style={mono({ fill: C.accent })}>{fmtNumber(t * n50Max, 2)}</text>
          <text x={W - M.r + 8} y={yG(t * gbMax) + 4} style={mono({ fill: C.a })}>{fmtNumber(t * gbMax, 2)}</text>
        </g>
      ))}
      <text transform={`translate(16 ${(top.t + top.b) / 2}) rotate(-90)`} textAnchor="middle" style={txt({ fill: C.accent })}>Tolerance N50 (flips)</text>
      <text transform={`translate(${W - 14} ${(top.t + top.b) / 2}) rotate(90)`} textAnchor="middle" style={txt({ fill: C.a })}>Weight store size, exposed (GB)</text>
      <path d={path(data.map((d) => [x(d.billions), yN(d.n50Alpha1)]))} fill="none" style={{ stroke: C.ref, strokeWidth: 1.6, strokeDasharray: '6 4' }} />
      <path d={path(data.map((d) => [x(d.billions), yN(d.n50)]))} fill="none" style={{ stroke: C.accent, strokeWidth: 2.6 }} />
      <path d={path(data.map((d) => [x(d.billions), yG(d.footprintGb)]))} fill="none" style={{ stroke: C.a, strokeWidth: 2.2 }} />
      {/* In-panel legend. Direct end-of-line labels collided: the alpha = 1 tolerance line and the footprint line are both proportional to size, so each sits exactly on the other once its axis is scaled to its own maximum. */}
      <g transform={`translate(${x(mA) + 12} ${top.t + 34})`}>
        <line x1={0} x2={22} y1={0} y2={0} style={{ stroke: C.accent, strokeWidth: 2.6 }} /><text x={28} y={4} style={txt({ fontSize: 11 })}>N50, α = {alpha.toFixed(2)} (left axis)</text>
        <line x1={0} x2={22} y1={16} y2={16} style={{ stroke: C.a, strokeWidth: 2.2 }} /><text x={28} y={20} style={txt({ fontSize: 11 })}>Weight store size (right axis)</text>
        <line x1={0} x2={22} y1={32} y2={32} style={{ stroke: C.ref, strokeWidth: 1.6, strokeDasharray: '6 4' }} /><text x={28} y={36} style={txt({ fontSize: 11 })}>N50, α = 1 (lies on the size line)</text>
      </g>
      {/* Bottom panel: time ratio */}
      {[0.1, 0.25, 0.5, 1, 2].map((t) => (
        <g key={t}>
          <line x1={M.l} x2={W - M.r} y1={yR(t)} y2={yR(t)} style={{ stroke: C.grid, strokeWidth: t === 1 ? 1.4 : 0.8 }} />
          <text x={M.l - 8} y={yR(t) + 4} textAnchor="end" style={mono()}>{t}</text>
        </g>
      ))}
      <text transform={`translate(16 ${(bot.t + bot.b) / 2}) rotate(-90)`} textAnchor="middle" style={txt()}>Time to tolerance, relative to 3.09 B model</text>
      <path d={`${path(band.map((d) => [x(d.billions), yR(Math.min(rMax, Math.max(rMin, d.hi)))] as [number, number]))} ${band.slice().reverse().map((d) => `L${x(d.billions).toFixed(2)},${yR(Math.min(rMax, Math.max(rMin, d.lo))).toFixed(2)}`).join(' ')} Z`} style={{ fill: C.accent, opacity: 0.16, stroke: 'none' }} />
      <path d={path(data.map((d) => [x(d.billions), yR(Math.min(rMax, Math.max(rMin, d.ratioAlpha1)))]))} fill="none" style={{ stroke: C.ref, strokeWidth: 1.8, strokeDasharray: '6 4' }} />
      <path d={path(data.map((d) => [x(d.billions), yR(Math.min(rMax, Math.max(rMin, d.ratio)))]))} fill="none" style={{ stroke: C.accent, strokeWidth: 2.6 }} />
      {/* Right of the 3.09 B crossing the curve is below the α = 1 line when α < 1 and above it when α > 1, so the label takes the other side. */}
      <text x={x(b1) - 6} y={alpha < 1 ? yR(1) - 6 : yR(1) + 15} textAnchor="end" style={mono({ fill: C.ref })}>α = 1: ratio 1.000 at every size</text>
      <text x={M.l} y={bot.t - 46} style={txt({ fontSize: 11, fill: C.accent })}>Chosen size, {fmtNumber(currentBillions, 3)} B: reaches its 50 % tolerance in {fmtDays(t50Days)} at {fmtNumber(rate, 3)} flips/GB/month{currentBillions < b0 || currentBillions > b1 ? ' (outside the 1–100 B axis)' : ''}</text>
      <text x={M.l} y={bot.t - 28} style={txt({ fontSize: 12, fontWeight: 700 })}>{MODELS.A.shortName} vs {MODELS.B.shortName} at α = {alpha.toFixed(2)}: {fmtNumber(ratioLargeVsSmall, 3)}× the time</text>
      <text x={M.l} y={bot.t - 10} style={txt({ fontSize: 11, fill: C.accent })}>Shaded band: α = {aLo.toFixed(2)} to {aHi.toFixed(2)}, the range the measured crossings imply, gives {fmtNumber(rLoEnd, 2)}× to {fmtNumber(rHiEnd, 2)}×</text>
      {/* Shared x axis and model markers */}
      {bTicks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={bot.b} y2={bot.b + 5} style={{ stroke: C.mute }} />
          <text x={x(t)} y={bot.b + 18} textAnchor="middle" style={mono()}>{t}</text>
        </g>
      ))}
      <text x={(M.l + W - M.r) / 2} y={H - 14} textAnchor="middle" style={txt()}>Parameters (billions, log scale)</text>
      {[mB, mA].map((m, i) => (
        <g key={m}>
          <line x1={x(m)} x2={x(m)} y1={top.t} y2={bot.b} style={{ stroke: C.mute, strokeDasharray: '2 4', strokeWidth: 1 }} />
          <text x={x(m) + (i === 0 ? -4 : 4)} y={top.b + 16} textAnchor={i === 0 ? 'end' : 'start'} style={mono({ fontSize: 10 })}>{i === 0 ? MODELS.B.shortName : MODELS.A.shortName}</text>
        </g>
      ))}
      {currentBillions >= b0 && currentBillions <= b1 && (
        <circle cx={x(currentBillions)} cy={yR(Math.min(rMax, Math.max(rMin, data.reduce((best, d) => (Math.abs(d.billions - currentBillions) < Math.abs(best.billions - currentBillions) ? d : best), data[0]).ratio)))} r={5.5} style={{ fill: 'none', stroke: C.text, strokeWidth: 1.6 }} />
      )}
      {currentBillions >= b0 && currentBillions <= b1 && (
        <circle cx={x(currentBillions)} cy={yN(data.reduce((best, d) => (Math.abs(d.billions - currentBillions) < Math.abs(best.billions - currentBillions) ? d : best), data[0]).n50)} r={5.5} style={{ fill: 'none', stroke: C.text, strokeWidth: 1.6 }} />
      )}
    </Frame>
  );
});

/* ------------------------------------------------------------------ */
/* View 4: accumulation                                                 */
/* ------------------------------------------------------------------ */

export const AccumulationChart = forwardRef<SVGSVGElement, { inputs: Record<string, number>; current: { surv: number; survEcc: number } }>(function AccumulationChart({ inputs, current }, ref) {
  /* Legend band above the plot: the survival curves start at 100 % on the left, exactly where an in-plot legend used to sit. */
  const top = 110;
  const H = 472;
  const pb = H - 56;
  const data = accumulationSeries(inputs);
  const x = lg(0.01, 3650, M.l, W - M.r);
  const y = lin(0, 1, pb, top);
  const lamMin = 1e-4;
  const lamMax = 1e8;
  const yL = lg(lamMin, lamMax, pb, top);
  const tickDays = [0.01, 0.1, 1, 10, 100, 1000];
  const lamTicks: [number, number][] = [[1e-3, -3], [1e-1, -1], [1e1, 1], [1e3, 3], [1e5, 5], [1e7, 7]];
  const cur = inputs.scrubIntervalDays;
  const firstBeyond = data.find((d) => d.beyondMeasured);
  const curX = x(Math.min(3650, Math.max(0.01, cur)));
  const curRight = curX > W - M.r - 265;
  return (
    <Frame svgRef={ref} height={H} title="Accumulation over a scrub interval" subtitle={`illustrative model · ${fmtNumber(inputs.upsetRateFlipsPerGbMonth, 3)} flips/GB/month (user-set) · ${fmtNumber(inputs.modelParamsBillions, 3)} B parameters`} label="Expected survival and expected raw flips against scrub interval, with and without SECDED">
      <rect x={M.l - 8} y={46} width={W - M.l - M.r + 16} height={58} rx={6} style={{ fill: C.bg, stroke: C.grid }} />
      <g transform={`translate(${M.l + 4} 60)`}>
        <line x1={0} x2={22} y1={0} y2={0} style={{ stroke: C.accent, strokeWidth: 2.6 }} /><text x={28} y={4} style={txt({ fontSize: 11 })}>No ECC (measured fault model)</text>
        <line x1={0} x2={22} y1={16} y2={16} style={{ stroke: C.ref, strokeWidth: 2.2, strokeDasharray: '7 4' }} /><text x={28} y={20} style={txt({ fontSize: 11 })}>SECDED (analytic extension, not measured)</text>
        <line x1={0} x2={22} y1={32} y2={32} style={{ stroke: C.a, strokeWidth: 1.8, strokeDasharray: '2 3' }} /><text x={28} y={36} style={txt({ fontSize: 11 })}>Expected raw flips (right axis)</text>
      </g>
      {firstBeyond && <rect x={x(firstBeyond.days)} y={top} width={x(3650) - x(firstBeyond.days)} height={pb - top} style={{ fill: C.shade }} />}
      {firstBeyond && x(3650) - x(firstBeyond.days) >= 130 && <text x={(x(firstBeyond.days) + x(3650)) / 2} y={top + 14} textAnchor="middle" style={mono()}>beyond measured dose</text>}
      {firstBeyond && x(3650) - x(firstBeyond.days) >= 130 && <text x={(x(firstBeyond.days) + x(3650)) / 2} y={top + 26} textAnchor="middle" style={mono()}>(decay assumed)</text>}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} style={{ stroke: C.grid, strokeWidth: 0.8 }} />
          <text x={M.l - 8} y={y(t) + 4} textAnchor="end" style={mono()}>{Math.round(t * 100)} %</text>
        </g>
      ))}
      {lamTicks.map(([t, e]) => (
        <text key={e} x={W - M.r + 8} y={yL(t) + 4} style={mono({ fill: C.a })}>{fmtPow10(e)}</text>
      ))}
      {tickDays.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={pb} y2={pb + 5} style={{ stroke: C.mute }} />
          <text x={x(t)} y={pb + 18} textAnchor="middle" style={mono()}>{t}</text>
        </g>
      ))}
      <text x={(M.l + W - M.r) / 2} y={H - 14} textAnchor="middle" style={txt()}>Scrub or reload interval (days, log scale)</text>
      <text transform={`translate(18 ${(top + pb) / 2}) rotate(-90)`} textAnchor="middle" style={txt()}>Expected survival</text>
      <text transform={`translate(${W - 8} ${(top + pb) / 2}) rotate(90)`} textAnchor="middle" style={txt({ fill: C.a })}>Expected raw flips per interval</text>
      <path d={path(data.map((d) => [x(d.days), yL(Math.min(lamMax, Math.max(lamMin, d.lambda)))]))} fill="none" style={{ stroke: C.a, strokeWidth: 1.8, strokeDasharray: '2 3' }} />
      <path d={path(data.map((d) => [x(d.days), y(d.surv)]))} fill="none" style={{ stroke: C.accent, strokeWidth: 2.6 }} />
      <path d={path(data.map((d) => [x(d.days), y(d.survEcc)]))} fill="none" style={{ stroke: C.ref, strokeWidth: 2.2, strokeDasharray: '7 4' }} />
      <line x1={x(Math.min(3650, Math.max(0.01, cur)))} x2={x(Math.min(3650, Math.max(0.01, cur)))} y1={top} y2={pb} style={{ stroke: C.text, strokeWidth: 1, strokeDasharray: '1 4' }} />
      <circle cx={curX} cy={y(current.surv)} r={5} style={{ fill: C.bg, stroke: C.accent, strokeWidth: 1.8 }} />
      <circle cx={curX} cy={y(current.survEcc)} r={5} style={{ fill: C.bg, stroke: C.ref, strokeWidth: 1.8 }} />
      <text x={curRight ? curX - 8 : curX + 8} y={pb - 24} textAnchor={curRight ? 'end' : 'start'} style={mono({ fill: C.text, stroke: C.bg, strokeWidth: 3, paintOrder: 'stroke' })}>{fmtNumber(cur, 3)} d: {fmtPct(current.surv, 1)} no ECC · {fmtPct(current.survEcc, 1)} SECDED</text>
    </Frame>
  );
});

/* ------------------------------------------------------------------ */
/* View: per-dose outcome split (paper Figure 6)                        */
/* ------------------------------------------------------------------ */

export const OutcomeChart = forwardRef<SVGSVGElement, { model: ModelId; batch: OutcomeBatchChoice; highlightFlips: number }>(function OutcomeChart({ model, batch, highlightFlips }, ref) {
  const H = 470;
  const data = outcomeSplit(model, batch);
  const x0 = M.l;
  const x1 = W - M.r;
  const slot = (x1 - x0) / data.length;
  const bw = Math.min(64, slot * 0.62);
  const barTop = M.t + 26; // legend row sits between the subtitle and the bars
  const y = lin(0, 1, H - M.b - 22, barTop);
  const layers = [
    { key: 'intact', label: 'Intact (within 10 points of clean)', fill: C.a },
    { key: 'impaired', label: 'Impaired', fill: C.b },
    { key: 'semanticCollapse', label: 'Semantic Collapse (accuracy ≤ 40 %)', fill: C.accent },
    { key: 'dead', label: 'Dead (no parseable answers)', fill: C.dead },
  ] as const;
  return (
    <Frame svgRef={ref} height={H} title="Trial outcomes by dose" subtitle={`${MODELS[model].uiName} · ${batch === 'both' ? 'both batches pooled' : `${batch} batch`} · n = ${data[0]?.n ?? 0} trials per dose`} label="Stacked bars of intact, impaired, Semantic Collapse and dead trial shares at each measured dose">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={x0} x2={x1} y1={y(t)} y2={y(t)} style={{ stroke: C.grid, strokeWidth: 0.8 }} />
          <text x={x0 - 8} y={y(t) + 4} textAnchor="end" style={mono()}>{Math.round(t * 100)} %</text>
        </g>
      ))}
      {data.map((d, i) => {
        const cx = x0 + slot * (i + 0.5);
        let acc = 0;
        return (
          <g key={d.flips}>
            {d.flips === highlightFlips && <rect x={cx - slot / 2 + 2} y={barTop - 4} width={slot - 4} height={H - M.b - barTop + 4} style={{ fill: C.shade }} />}
            {layers.map((l) => {
              const frac = d[l.key] / d.n;
              const top = y(acc + frac);
              const h = y(acc) - top;
              acc += frac;
              return <rect key={l.key} x={cx - bw / 2} y={top} width={bw} height={h} style={{ fill: l.fill, stroke: C.bg, strokeWidth: 0.8 }}><title>{`${l.label}: ${d[l.key]} of ${d.n}`}</title></rect>;
            })}
            <text x={cx} y={H - M.b - 6} textAnchor="middle" style={mono()}>{d.flips}</text>
            <text x={cx} y={H - M.b + 10} textAnchor="middle" style={mono({ fill: C.accent })}>{Number.isFinite(d.scShareOfSurvivors) ? fmtPct(d.scShareOfSurvivors, 0) : 'n/a'}</text>
          </g>
        );
      })}
      <text x={M.l - 54} y={H - M.b - 6} style={mono()}>flips</text>
      <text x={M.l} y={H - M.b + 28} style={mono({ fill: C.accent })}>Purple figures: Semantic Collapse share of the trials that survived</text>
      <text x={(x0 + x1) / 2} y={H - 14} textAnchor="middle" style={txt()}>Injected bit flips (measured doses only)</text>
      <g transform={`translate(${M.l} ${M.t + 6})`}>
        {layers.map((l, i) => (
          <g key={l.key} transform={`translate(${i * 172} 0)`}>
            <rect width={10} height={10} y={-2} style={{ fill: l.fill }} /><text x={14} y={7} style={mono({ fontSize: 9.5 })}>{l.label.split(' (')[0]}</text>
          </g>
        ))}
      </g>
    </Frame>
  );
});
