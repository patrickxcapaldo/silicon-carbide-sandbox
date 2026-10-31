import { useEffect, useMemo, useRef, useState } from 'react';
import { llmBitflipResilience, INPUT_SPECS } from '../sandbox/module';
import { nearestMeasuredDose, nearestMeasuredModel, scSurvivorShareLowHigh, t50Days, scShareOfTrialsInBatch, type OutcomeBatchChoice } from '../sandbox/kernel';
import { MODELS, type ModelId } from '../data/radiai-measured';
import { AccumulationChart, OutcomeChart, ResidualTable, SurvivalChart, ToleranceChart } from './Charts';
import { BitAnatomy } from './BitAnatomy';
import { CanaryPanel, ParamSplit } from './Panels';
import { ProvenancePanel } from './ProvenancePanel';
import { ControlPanel, SegButton } from './ControlPanel';
import { exportPng, exportSvg, screenPaletteStyle, type ExportTheme } from './exportChart';
import { HOME_CARDS, ViewHeader } from './Help';
import { fmtDays, fmtNumber, fmtPct } from './format';
import { accumulationAt, type AxisMode } from './series';

type ViewId = 'home' | 'anatomy' | 'survival' | 'tolerance' | 'accumulation' | 'outcomes' | 'canary' | 'split' | 'provenance';
const VIEWS: { id: ViewId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'anatomy', label: 'Bit Anatomy' },
  { id: 'survival', label: 'Survival Vs Dose' },
  { id: 'tolerance', label: 'Tolerance Vs Exposure' },
  { id: 'accumulation', label: 'Accumulation' },
  { id: 'outcomes', label: 'Outcomes' },
  { id: 'canary', label: 'Canary' },
  { id: 'split', label: 'Parameter Split' },
  { id: 'provenance', label: 'Provenance' },
];

export function BitflipVisualizer({ inputs, onChange, onExport }: { inputs: Record<string, number>; onChange: (id: string, value: number) => void; onExport: () => void }) {
  const [view, setView] = useState<ViewId>('home');
  const [axis, setAxis] = useState<AxisMode>('flips');
  const [theme, setTheme] = useState<ExportTheme>('dark');
  const svgRef = useRef<SVGSVGElement>(null);
  const [showOutcomes, setShowOutcomes] = useState(true);
  const [outcomeModel, setOutcomeModel] = useState<'follow' | ModelId>('follow');
  const [outcomeBatch, setOutcomeBatch] = useState<OutcomeBatchChoice>('both');
  const result = useMemo(() => llmBitflipResilience.run(inputs), [inputs]);
  const v = result.values;
  const params = result.resolvedInputs.modelParamsBillions * 1e9;
  const alpha = result.resolvedInputs.toleranceExponent;
  const clean = result.resolvedInputs.assumeCleanAtZero >= 0.5;
  const accNow = useMemo(() => accumulationAt(result.resolvedInputs), [result.resolvedInputs]);
  const ratioAB = useMemo(() => {
    const base = { bytesPerParam: result.resolvedInputs.bytesPerParam, upsetRateFlipsPerGbMonth: result.resolvedInputs.upsetRateFlipsPerGbMonth, toleranceExponent: alpha, eccEnabled: result.resolvedInputs.eccEnabled, mbuFraction: result.resolvedInputs.mbuFraction };
    return t50Days(MODELS.A.params, base) / t50Days(MODELS.B.params, base);
  }, [result.resolvedInputs, alpha]);
  /* Reset restores only the inputs that differ from their defaults, one per tick, always through the latest onChange.
     Firing every onChange synchronously is unsafe: a parent that writes setInputs({ ...inputs, [id]: v }) would apply each call to the same
     stale snapshot, so only the last one would survive and the rest of the reset would be lost. */
  const latestOnChange = useRef(onChange);
  const resetTimer = useRef<number | undefined>(undefined);
  useEffect(() => { latestOnChange.current = onChange; });
  useEffect(() => () => window.clearTimeout(resetTimer.current), []);
  const reset = () => {
    window.clearTimeout(resetTimer.current);
    const pending = INPUT_SPECS.filter((s) => result.resolvedInputs[s.key] !== s.defaultValue);
    const step = (i: number) => {
      if (i >= pending.length) return;
      latestOnChange.current(pending[i].key, pending[i].defaultValue);
      resetTimer.current = window.setTimeout(() => step(i + 1), 30);
    };
    step(0);
  };
  const shownOutcomeModel: ModelId = outcomeModel === 'follow' ? nearestMeasuredModel(params) : outcomeModel;
  const outcomeShare = scSurvivorShareLowHigh(shownOutcomeModel, outcomeBatch);
  const exportable = view === 'survival' || view === 'tolerance' || view === 'accumulation' || (view === 'outcomes' && showOutcomes);
  const warnings = result.diagnostics.filter((d) => d.severity !== 'info');

  return (
    <>
      <section className="bfr-canvas" style={screenPaletteStyle() as React.CSSProperties}>
        <div className="bfr-main">
          <div className="bfr-tabs" role="tablist" aria-label="Views">
            {VIEWS.map((t) => <SegButton key={t.id} active={view === t.id} onClick={() => setView(t.id)}>{t.label}</SegButton>)}
          </div>
          <div className="bfr-readouts bfr-live" aria-live="polite" aria-label="Live results">
            <div><span>Time to tolerance</span><strong>{fmtDays(v.t50Days)}</strong><em>{fmtNumber(v.n50Flips, 3)} flips at {fmtNumber(result.resolvedInputs.upsetRateFlipsPerGbMonth, 3)} flips/GB/month</em></div>
            <div><span>Expected survival, one interval</span><strong>{fmtPct(v.expectedSurvival)}</strong><em>{fmtNumber(v.effectiveFlips, 3)} {result.resolvedInputs.eccEnabled >= 0.5 ? 'effective' : 'raw'} flips in {fmtNumber(result.resolvedInputs.scrubIntervalDays, 3)} d</em></div>
            <div><span>Survival at {fmtNumber(result.resolvedInputs.injectedFlips, 3)} injected flips</span><strong>{fmtPct(v.survivalAtInjectedFlips)}</strong><em>{fmtNumber(v.fpb, 3)} flips per billion parameters</em></div>
            <div><span>Memory power</span><strong>{fmtNumber(v.memoryPowerW, 3)} W</strong><em>{v.eccExtraPowerW > 0 ? `incl. ${fmtNumber(v.eccExtraPowerW, 3)} W for ECC` : `${fmtNumber(v.memoryFootprintGb, 4)} GB, no ECC`}</em></div>
          </div>
          <div className="bfr-view" role="tabpanel">
            {view !== 'home' && <ViewHeader view={view} />}
            {view === 'home' && (
              <div className="bfr-home">
                <p className="bfr-lede">Question: how long does a language model’s weight memory survive accumulating bit flips? Tolerance goes up with model size, but so does the memory that can be hit. The tabs look at this from different angles.</p>
                <div className="bfr-home-grid">
                  {HOME_CARDS.map((c) => (
                    <button key={c.id} type="button" className="bfr-home-card" onClick={() => setView(c.id as ViewId)}><strong>{c.title}</strong><span>{c.shows}</span><em>{c.use}</em></button>
                  ))}
                </div>
                <div className="bfr-callout">How the controls work: the panel on the right feeds the four live figures above the views, and each tab uses the controls that apply to it. Press the <strong>i</strong> buttons for plain-language explanations. Presets set one slider each; the three preset groups are independent. Canary, Parameter Split and Provenance show fixed paper data.</div>
              </div>
            )}
            {view === 'anatomy' && <BitAnatomy key={result.resolvedInputs.weightMagnitude} weightMagnitude={result.resolvedInputs.weightMagnitude} injectedFlips={result.resolvedInputs.injectedFlips} pBit14={v.pBit14AtLeastOne} pExponent={v.pExponentAtLeastOne} />}
            {view === 'survival' && (
              <>
                <div className="bfr-subtabs"><SegButton active={axis === 'flips'} onClick={() => setAxis('flips')}>Absolute Flips</SegButton><SegButton active={axis === 'fpb'} onClick={() => setAxis('fpb')}>Flips Per Billion Parameters</SegButton></div>
                <SurvivalChart ref={svgRef} params={params} alpha={alpha} assumeClean={clean} axis={axis} injectedFlips={result.resolvedInputs.injectedFlips} sizeLabel={`${fmtNumber(result.resolvedInputs.modelParamsBillions, 3)} B parameters`} intervalFlips={v.effectiveFlips} intervalSurvival={v.expectedSurvival} />
                <ResidualTable alpha={alpha} />
              </>
            )}
            {view === 'tolerance' && <ToleranceChart ref={svgRef} alpha={alpha} bytesPerParam={result.resolvedInputs.bytesPerParam} rate={result.resolvedInputs.upsetRateFlipsPerGbMonth} ecc={result.resolvedInputs.eccEnabled} mbu={result.resolvedInputs.mbuFraction} ratioLargeVsSmall={ratioAB} currentBillions={result.resolvedInputs.modelParamsBillions} t50Days={v.t50Days} />}
            {view === 'accumulation' && <AccumulationChart ref={svgRef} inputs={result.resolvedInputs} current={accNow} />}
            {view === 'outcomes' && (
              <>
                <div className="bfr-subtabs">
                  <SegButton active={showOutcomes} onClick={() => setShowOutcomes(!showOutcomes)}>{showOutcomes ? 'Hide outcome split' : 'Show outcome split'}</SegButton>
                  {showOutcomes && (
                    <>
                      <SegButton active={outcomeModel === 'follow'} onClick={() => setOutcomeModel('follow')}>Follow size control</SegButton>
                      <SegButton active={outcomeModel === 'A'} onClick={() => setOutcomeModel('A')}>{MODELS.A.shortName}</SegButton>
                      <SegButton active={outcomeModel === 'B'} onClick={() => setOutcomeModel('B')}>{MODELS.B.shortName}</SegButton>
                      <SegButton active={outcomeBatch === 'both'} onClick={() => setOutcomeBatch('both')}>Both batches</SegButton>
                      <SegButton active={outcomeBatch === 'original'} onClick={() => setOutcomeBatch('original')}>Original</SegButton>
                      <SegButton active={outcomeBatch === 'replication'} onClick={() => setOutcomeBatch('replication')}>Replication</SegButton>
                    </>
                  )}
                </div>
                {showOutcomes ? (
                  <>
                    <OutcomeChart ref={svgRef} model={shownOutcomeModel} batch={outcomeBatch} highlightFlips={nearestMeasuredDose(shownOutcomeModel, result.resolvedInputs.injectedFlips)} />
                    <div className="bfr-callout">
                      Among surviving trials, Semantic Collapse is <strong>{fmtPct(outcomeShare.low, 0)}</strong> at the lowest two doses and <strong>{fmtPct(outcomeShare.high, 0)}</strong> at the highest two for {MODELS[shownOutcomeModel].shortName}. Fluent-but-wrong answers become a larger share of what survives as dose rises.
                    </div>
                    <p className="bfr-note">Each batch has Semantic Collapse in {fmtPct(scShareOfTrialsInBatch(shownOutcomeModel, 'original'), 1)} (original) and {fmtPct(scShareOfTrialsInBatch(shownOutcomeModel, 'replication'), 1)} (replication) of all trials; the paper reports 11–17 % across four batches. The highlighted column is the measured dose nearest to the injected-flips control ({result.resolvedInputs.injectedFlips} flips).{outcomeModel === 'follow' && ` The chart follows the size control, showing the nearest measured model (${fmtNumber(result.resolvedInputs.modelParamsBillions, 3)} B parameters); outcomes at other sizes are not measured.`} Counts are author-supplied (paper Figure 6 prints them only graphically).</p>
                  </>
                ) : <p className="bfr-note">The outcome split is hidden. Use the button above to show it.</p>}
              </>
            )}
            {view === 'canary' && <CanaryPanel />}
            {view === 'split' && <ParamSplit />}
            {view === 'provenance' && <ProvenancePanel />}
          </div>
          {exportable && (
            <div className="bfr-export">
              <span>Slide export</span>
              <SegButton active={theme === 'dark'} onClick={() => setTheme('dark')}>Dark</SegButton>
              <SegButton active={theme === 'light'} onClick={() => setTheme('light')}>Light</SegButton>
              <button type="button" onClick={() => svgRef.current && exportSvg(svgRef.current, theme, `llm-bitflip-${view}`)}>SVG</button>
              <button type="button" onClick={() => svgRef.current && exportPng(svgRef.current, theme, `llm-bitflip-${view}`)}>PNG</button>
            </div>
          )}
        </div>
        <ControlPanel inputs={result.resolvedInputs} view={view} onChange={onChange} onJump={(id) => setView(id as ViewId)} viewLabel={(id) => VIEWS.find((t) => t.id === id)?.label ?? id} onReset={reset} onExport={onExport} />
      </section>
      <details open className="challenge-explorer-limits bfr-readout">
        <summary>Results</summary>
        <div className="bfr-readouts">
          <div><span>Weight store</span><strong>{fmtNumber(v.memoryFootprintGb, 4)} GB</strong><em>{v.storageWithEccGb > v.memoryFootprintGb ? `${fmtNumber(v.storageWithEccGb, 4)} GB with ECC check bits` : 'exposed area'}</em></div>
          <div><span>50 % tolerance</span><strong>{fmtNumber(v.n50Flips, 3)} flips</strong><em>{fmtNumber(v.fpb50, 3)} FPB</em></div>
          <div><span>Mean time to tolerance</span><strong>{fmtDays(v.t50Days)}</strong><em>{fmtNumber(v.timeToN50Ratio, 3)}× the {MODELS.B.shortName}-size model</em></div>
          <div><span>Expected survival, one interval</span><strong>{fmtPct(v.expectedSurvival)}</strong><em>{fmtNumber(v.lambdaFlips, 3)} expected raw flips</em></div>
          <div><span>Memory power</span><strong>{fmtNumber(v.memoryPowerW, 3)} W</strong><em>{v.eccExtraPowerW > 0 ? `+ ${fmtNumber(v.eccExtraPowerW, 3)} W for ECC` : 'no ECC'}</em></div>
        </div>
        {warnings.length > 0 && <ul className="bfr-warnings">{warnings.map((w, i) => <li key={i}>{w.message}</li>)}</ul>}
      </details>
      <details className="challenge-explorer-limits bfr-readout">
        <summary>Where this connects</summary>
        <p className="bfr-note">Memory power is a heat source. The <code>memoryPowerW</code> and <code>eccExtraPowerW</code> outputs are in watts and connect to the thermal module’s parasitic heat and compute-power inputs: more memory means more heat to reject, which means more radiator area. See <a href="/?module=orbital-thermal-limits">Orbital Thermal Limits</a> for the heat path and <a href="/?module=solar-power-budget">Solar Power Budget</a> for the electrical supply behind it. This module adds no orbit-dependent flux physics.</p>
      </details>
    </>
  );
}
