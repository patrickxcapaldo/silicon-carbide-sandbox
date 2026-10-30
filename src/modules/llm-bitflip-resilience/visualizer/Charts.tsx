import { forwardRef, type ReactNode } from 'react';
import {
  accumulationSeries,
  collapsedCurve,
  crossingMarkers,
  flipsToAxis,
  measuredSeries,
  measuredWindowFlips,
  n50OnAxis,
  toleranceSeries,
  TOLERANCE_X_RANGE_B,
  type AxisMode,
} from './series';
import { MODELS, type ModelId } from '../data/radiai-measured';
import { collapseResidualsAgainstModelB, collapseRmse, outcomeSplit, type OutcomeBatchChoice } from '../sandbox/kernel';
import { fmtNumber, fmtPct } from './format';

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
  params: number; alpha: number; assumeClean: boolean; axis: AxisMode; injectedFlips: number; sizeLabel: string;
}>(function SurvivalChart({ params, alpha, assumeClean, axis, injectedFlips, sizeLabel }, ref) {
  const H = 440;
  const xMax = axis === 'flips' ? 120 : 30;
  const x = lin(0, xMax, M.l, W - M.r);
  const y = lin(0, 1, H - M.b, M.t);
  const curve = collapsedCurve(params, alpha, assumeClean, axis, xMax);
  const [w0, w1] = measuredWindowFlips(params, alpha);
  const xa = Math.min(xMax, flipsToAxis(w0, params, axis));
  const xb = Math.min(xMax, flipsToAxis(w1, params, axis));
  const series = measuredSeries(axis);
  const marks = crossingMarkers(axis);
  const xTicks = axis === 'flips' ? [0, 20, 40, 60, 80, 100, 120] : [0, 5, 10, 15, 20, 25, 30];
  const n50x = n50OnAxis(params, alpha, axis);
  const injS = collapsedCurve(params, alpha, assumeClean, axis, xMax, 1);
  void injS;
  const injX = flipsToAxis(injectedFlips, params, axis);
  const injPoint = curve.reduce((best, p) => (Math.abs(p.x - injX) < Math.abs(best.x - injX) ? p : best), curve[0]);

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
    <Frame svgRef={ref} height={H} title="Survival versus dose" subtitle={`${sizeLabel} · curve collapse · α = ${alpha.toFixed(2)} · survival = accuracy > 0`} label="Survival fraction against injected bit flips for two measured models and a collapsed curve for the chosen size">
      {/* Unmeasured regions */}
      <rect x={x(0)} y={M.t} width={Math.max(0, x(xa) - x(0))} height={H - M.b - M.t} style={{ fill: C.shade }} />
      <rect x={x(xb)} y={M.t} width={Math.max(0, x(xMax) - x(xb))} height={H - M.b - M.t} style={{ fill: C.shade }} />
      <text x={x(xa) / 2 + x(0) / 2} y={M.t + 14} textAnchor="middle" style={mono()}>{assumeClean ? 'interpolated,' : 'not measured'}</text>
      {assumeClean && <text x={x(xa) / 2 + x(0) / 2} y={M.t + 26} textAnchor="middle" style={mono()}>not measured</text>}
      <text x={(x(xb) + x(xMax)) / 2} y={M.t + 14} textAnchor="middle" style={mono()}>not measured</text>
      {/* Grid and axes */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} style={{ stroke: C.grid, strokeWidth: t === 0.5 ? 1.4 : 0.8 }} />
          <text x={M.l - 8} y={y(t) + 4} textAnchor="end" style={mono()}>{Math.round(t * 100)} %</text>
        </g>
      ))}
      {xTicks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={H - M.b} y2={H - M.b + 5} style={{ stroke: C.mute }} />
          <text x={x(t)} y={H - M.b + 18} textAnchor="middle" style={mono()}>{t}</text>
        </g>
      ))}
      <text x={(M.l + W - M.r) / 2} y={H - 14} textAnchor="middle" style={txt()}>{axis === 'flips' ? 'Injected bit flips (flips)' : 'Dose (flips per billion parameters)'}</text>
      <text transform={`translate(18 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle" style={txt()}>Survival (fraction of trials)</text>
      {/* Chosen curve */}
      {runs.map((r, i) => (
        <path key={i} d={path(r.pts)} fill="none" style={{ stroke: C.accent, strokeWidth: 2.4, strokeDasharray: r.measured ? undefined : '5 4', opacity: r.measured ? 1 : 0.75 }} />
      ))}
      {/* 50 % tolerance */}
      <line x1={x(Math.min(n50x, xMax))} x2={x(Math.min(n50x, xMax))} y1={M.t} y2={H - M.b} style={{ stroke: C.accent, strokeDasharray: '2 3', strokeWidth: 1.2 }} />
      <text x={x(Math.min(n50x, xMax)) + 5} y={H - M.b - 8} style={mono({ fill: C.accent })}>N50 = {fmtNumber(axis === 'flips' ? n50x : n50x, 3)} {axis === 'flips' ? 'flips' : 'FPB'}</text>
      {/* Measured points */}
      {series.map((s) => s.points.map((p) => (
        <Marker key={`${s.model}${s.batch}${p.flips}`} x={x(p.x)} y={y(p.y)} shape={s.model === 'A' ? 'circle' : 'square'} hollow={s.batch === 'replication'} color={s.model === 'A' ? C.a : C.b} />
      )))}
      {/* Empirical crossings */}
      {marks.map((m) => (
        <path key={`${m.model}${m.batch}`} d={`M${x(m.x)},${y(0.5) - 7} l5,7 l-5,7 l-5,-7 z`} style={{ fill: m.model === 'A' ? C.a : C.b, stroke: C.bg, strokeWidth: 1 }} />
      ))}
      {/* Injected dose */}
      <circle cx={x(Math.min(injX, xMax))} cy={y(injPoint.y)} r={6} style={{ fill: 'none', stroke: C.text, strokeWidth: 1.6 }} />
      {/* Legend */}
      <g transform={`translate(${W - M.r - 262} ${M.t + 38})`}>
        <rect x={-8} y={-14} width={270} height={86} rx={6} style={{ fill: C.bg, stroke: C.grid, opacity: 0.94 }} />
        <Marker x={4} y={-2} shape="circle" hollow={false} color={C.a} /><text x={16} y={2} style={txt({ fontSize: 11 })}>{MODELS.A.shortName}, original</text>
        <Marker x={4} y={14} shape="circle" hollow color={C.a} /><text x={16} y={18} style={txt({ fontSize: 11 })}>{MODELS.A.shortName}, replication</text>
        <Marker x={4} y={30} shape="square" hollow={false} color={C.b} /><text x={16} y={34} style={txt({ fontSize: 11 })}>{MODELS.B.shortName}, original</text>
        <Marker x={4} y={46} shape="square" hollow color={C.b} /><text x={16} y={50} style={txt({ fontSize: 11 })}>{MODELS.B.shortName}, replication</text>
        <line x1={-2} x2={10} y1={62} y2={62} style={{ stroke: C.accent, strokeWidth: 2.4 }} /><text x={16} y={66} style={txt({ fontSize: 11 })}>Chosen size (assumed)</text>
      </g>
      <text x={M.l} y={H - 34} style={mono()}>Diamonds mark the four empirical 50 % crossings. Ring marks the injected dose.</text>
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
        Curve-collapse check against {MODELS.B.shortName} at α = {alpha.toFixed(2)}: root-mean-square residual{' '}
        <strong>{Number.isFinite(rmse) ? fmtPct(rmse) : 'n/a'}</strong> over the doses mapped inside {MODELS.A.shortName}’s measured range.
      </div>
      <div className="bfr-table-wrap">
        <table>
          <thead><tr><th>{MODELS.B.shortName} dose (flips)</th>{rows.map((r) => <th key={r.flips}>{r.flips}</th>)}</tr></thead>
          <tbody>
            <tr><th>Measured mean survival</th>{rows.map((r) => <td key={r.flips}>{fmtPct(r.measured, 0)}</td>)}</tr>
            <tr><th>Predicted by collapse</th>{rows.map((r) => <td key={r.flips} className={r.region === 'measured' ? '' : 'bfr-dim'}>{fmtPct(r.predicted, 0)}{r.region === 'measured' ? '' : ' *'}</td>)}</tr>
            <tr><th>Residual</th>{rows.map((r) => <td key={r.flips}>{(r.residual * 100).toFixed(0)} pts</td>)}</tr>
          </tbody>
        </table>
      </div>
      <div className="bfr-note">* Predicted from outside {MODELS.A.shortName}’s measured doses (held at the last measured value). Not measured.</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* View 3: tolerance versus exposure                                    */
/* ------------------------------------------------------------------ */

export const ToleranceChart = forwardRef<SVGSVGElement, {
  alpha: number; bytesPerParam: number; rate: number; ecc: number; mbu: number; ratioLargeVsSmall: number; currentBillions: number;
}>(function ToleranceChart({ alpha, bytesPerParam, rate, ecc, mbu, ratioLargeVsSmall, currentBillions }, ref) {
  const H = 640;
  const data = toleranceSeries(alpha, bytesPerParam, rate, ecc, mbu);
  const [b0, b1] = TOLERANCE_X_RANGE_B;
  const x = lg(b0, b1, M.l, W - M.r);
  const top = { t: M.t + 8, b: 300 };
  const bot = { t: 372, b: H - 56 };
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
    <Frame svgRef={ref} height={H} title="Tolerance and exposure both grow with size" subtitle={`α = ${alpha.toFixed(2)} · ${bytesPerParam} B per parameter · ${fmtNumber(rate, 3)} flips/GB/month${ecc >= 0.5 ? ' · SECDED (analytic)' : ''}`} label="Tolerance in flips and memory footprint against parameter count, with the ratio of time to tolerance">
      {shade(top.t, top.b)}
      {shade(bot.t, bot.b)}
      <text x={(x(b0) + x(mB)) / 2} y={top.t + 12} textAnchor="middle" style={mono()}>extrapolation</text>
      <text x={(x(mA) + x(b1)) / 2} y={top.t + 12} textAnchor="middle" style={mono()}>extrapolation</text>
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
      <text x={x(b1) - 6} y={yN(data[data.length - 1].n50Alpha1) - 6} textAnchor="end" style={mono({ fill: C.ref })}>N50, α = 1</text>
      <text x={x(b1) - 6} y={yN(data[data.length - 1].n50) - 6} textAnchor="end" style={mono({ fill: C.accent })}>N50, α = {alpha.toFixed(2)}</text>
      <text x={x(b1) - 6} y={yG(data[data.length - 1].footprintGb) - 6} textAnchor="end" style={mono({ fill: C.a })}>footprint</text>
      {/* Bottom panel: time ratio */}
      {[0.1, 0.25, 0.5, 1, 2].map((t) => (
        <g key={t}>
          <line x1={M.l} x2={W - M.r} y1={yR(t)} y2={yR(t)} style={{ stroke: C.grid, strokeWidth: t === 1 ? 1.4 : 0.8 }} />
          <text x={M.l - 8} y={yR(t) + 4} textAnchor="end" style={mono()}>{t}</text>
        </g>
      ))}
      <text transform={`translate(16 ${(bot.t + bot.b) / 2}) rotate(-90)`} textAnchor="middle" style={txt()}>Time to tolerance, relative to 3.09 B model</text>
      <path d={path(data.map((d) => [x(d.billions), yR(Math.min(rMax, Math.max(rMin, d.ratioAlpha1)))]))} fill="none" style={{ stroke: C.ref, strokeWidth: 1.8, strokeDasharray: '6 4' }} />
      <path d={path(data.map((d) => [x(d.billions), yR(Math.min(rMax, Math.max(rMin, d.ratio)))]))} fill="none" style={{ stroke: C.accent, strokeWidth: 2.6 }} />
      <text x={x(b1) - 6} y={yR(1) - 6} textAnchor="end" style={mono({ fill: C.ref })}>α = 1: ratio 1.000 at every size</text>
      <text x={M.l + 6} y={bot.t + 14} style={txt({ fontSize: 12, fontWeight: 700 })}>{MODELS.A.shortName} vs {MODELS.B.shortName} at α = {alpha.toFixed(2)}: {fmtNumber(ratioLargeVsSmall, 3)}× the time</text>
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
        <circle cx={x(currentBillions)} cy={yN(data.reduce((best, d) => (Math.abs(d.billions - currentBillions) < Math.abs(best.billions - currentBillions) ? d : best), data[0]).n50)} r={5.5} style={{ fill: 'none', stroke: C.text, strokeWidth: 1.6 }} />
      )}
    </Frame>
  );
});

/* ------------------------------------------------------------------ */
/* View 4: accumulation                                                 */
/* ------------------------------------------------------------------ */

export const AccumulationChart = forwardRef<SVGSVGElement, { inputs: Record<string, number> }>(function AccumulationChart({ inputs }, ref) {
  const H = 420;
  const data = accumulationSeries(inputs);
  const x = lg(0.01, 3650, M.l, W - M.r);
  const y = lin(0, 1, H - M.b, M.t);
  const lamMin = 1e-4;
  const lamMax = 1e8;
  const yL = lg(lamMin, lamMax, H - M.b, M.t);
  const tickDays = [0.01, 0.1, 1, 10, 100, 1000];
  const cur = inputs.scrubIntervalDays;
  const firstBeyond = data.find((d) => d.beyondMeasured);
  return (
    <Frame svgRef={ref} height={H} title="Accumulation over a scrub interval" subtitle={`${fmtNumber(inputs.upsetRateFlipsPerGbMonth, 3)} flips/GB/month (user-set) · ${fmtNumber(inputs.modelParamsBillions, 3)} B parameters`} label="Expected survival and expected raw flips against scrub interval, with and without SECDED">
      {firstBeyond && <rect x={x(firstBeyond.days)} y={M.t} width={x(3650) - x(firstBeyond.days)} height={H - M.b - M.t} style={{ fill: C.shade }} />}
      {firstBeyond && <text x={(x(firstBeyond.days) + x(3650)) / 2} y={M.t + 14} textAnchor="middle" style={mono()}>beyond measured dose</text>}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} style={{ stroke: C.grid, strokeWidth: 0.8 }} />
          <text x={M.l - 8} y={y(t) + 4} textAnchor="end" style={mono()}>{Math.round(t * 100)} %</text>
        </g>
      ))}
      {[1e-3, 1e-1, 1e1, 1e3, 1e5, 1e7].map((t) => (
        <text key={t} x={W - M.r + 8} y={yL(t) + 4} style={mono({ fill: C.a })}>{fmtNumber(t, 1)}</text>
      ))}
      {tickDays.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={H - M.b} y2={H - M.b + 5} style={{ stroke: C.mute }} />
          <text x={x(t)} y={H - M.b + 18} textAnchor="middle" style={mono()}>{t}</text>
        </g>
      ))}
      <text x={(M.l + W - M.r) / 2} y={H - 14} textAnchor="middle" style={txt()}>Scrub or reload interval (days, log scale)</text>
      <text transform={`translate(18 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle" style={txt()}>Expected survival</text>
      <text transform={`translate(${W - 12} ${(M.t + H - M.b) / 2}) rotate(90)`} textAnchor="middle" style={txt({ fill: C.a })}>Expected raw flips per interval</text>
      <path d={path(data.map((d) => [x(d.days), yL(Math.min(lamMax, Math.max(lamMin, d.lambda)))]))} fill="none" style={{ stroke: C.a, strokeWidth: 1.8, strokeDasharray: '2 3' }} />
      <path d={path(data.map((d) => [x(d.days), y(d.surv)]))} fill="none" style={{ stroke: C.accent, strokeWidth: 2.6 }} />
      <path d={path(data.map((d) => [x(d.days), y(d.survEcc)]))} fill="none" style={{ stroke: C.ref, strokeWidth: 2.2, strokeDasharray: '7 4' }} />
      <line x1={x(Math.min(3650, Math.max(0.01, cur)))} x2={x(Math.min(3650, Math.max(0.01, cur)))} y1={M.t} y2={H - M.b} style={{ stroke: C.text, strokeWidth: 1, strokeDasharray: '1 4' }} />
      <g transform={`translate(${M.l + 12} ${M.t + 14})`}>
        <line x1={0} x2={22} y1={0} y2={0} style={{ stroke: C.accent, strokeWidth: 2.6 }} /><text x={28} y={4} style={txt({ fontSize: 11 })}>No ECC (measured fault model)</text>
        <line x1={0} x2={22} y1={16} y2={16} style={{ stroke: C.ref, strokeWidth: 2.2, strokeDasharray: '7 4' }} /><text x={28} y={20} style={txt({ fontSize: 11 })}>SECDED (analytic extension, not measured)</text>
        <line x1={0} x2={22} y1={32} y2={32} style={{ stroke: C.a, strokeWidth: 1.8, strokeDasharray: '2 3' }} /><text x={28} y={36} style={txt({ fontSize: 11 })}>Expected raw flips (right axis)</text>
      </g>
    </Frame>
  );
});

/* ------------------------------------------------------------------ */
/* View: per-dose outcome split (paper Figure 6)                        */
/* ------------------------------------------------------------------ */

export const OutcomeChart = forwardRef<SVGSVGElement, { model: ModelId; batch: OutcomeBatchChoice; highlightFlips: number }>(function OutcomeChart({ model, batch, highlightFlips }, ref) {
  const H = 440;
  const data = outcomeSplit(model, batch);
  const x0 = M.l;
  const x1 = W - M.r;
  const slot = (x1 - x0) / data.length;
  const bw = Math.min(64, slot * 0.62);
  const y = lin(0, 1, H - M.b - 22, M.t + 8);
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
            {d.flips === highlightFlips && <rect x={cx - slot / 2 + 2} y={M.t} width={slot - 4} height={H - M.b - M.t} style={{ fill: C.shade }} />}
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
      <text x={M.l - 54} y={H - M.b + 10} style={mono({ fill: C.accent })}>SC share of survivors</text>
      <text x={(x0 + x1) / 2} y={H - 14} textAnchor="middle" style={txt()}>Injected bit flips (measured doses only)</text>
      <g transform={`translate(${M.l} ${M.t - 2})`}>
        {layers.map((l, i) => (
          <g key={l.key} transform={`translate(${i * 172} 0)`}>
            <rect width={10} height={10} y={-2} style={{ fill: l.fill }} /><text x={14} y={7} style={mono({ fontSize: 9.5 })}>{l.label.split(' (')[0]}</text>
          </g>
        ))}
      </g>
    </Frame>
  );
});
