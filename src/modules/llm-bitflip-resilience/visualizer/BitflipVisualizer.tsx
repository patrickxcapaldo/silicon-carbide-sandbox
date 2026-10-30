import { useMemo, useRef, useState } from 'react';
import { llmBitflipResilience, INPUT_SPECS } from '../sandbox/module';
import { nearestMeasuredDose, nearestMeasuredModel, scSurvivorShareLowHigh, t50Days, scShareOfTrialsInBatch, type OutcomeBatchChoice } from '../sandbox/kernel';
import { MODELS, type ModelId } from '../data/radiai-measured';
import { AccumulationChart, OutcomeChart, ResidualTable, SurvivalChart, ToleranceChart } from './Charts';
import { BitAnatomy } from './BitAnatomy';
import { CanaryPanel, ParamSplit } from './Panels';
import { ProvenancePanel } from './ProvenancePanel';
import { ControlPanel, SegButton } from './ControlPanel';
import { exportPng, exportSvg, screenPaletteStyle, type ExportTheme } from './exportChart';
import { fmtDays, fmtNumber, fmtPct } from './format';
import type { AxisMode } from './series';

type ViewId = 'anatomy' | 'survival' | 'tolerance' | 'accumulation' | 'outcomes' | 'canary' | 'split' | 'provenance';
const VIEWS: { id: ViewId; label: string }[] = [
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
  const [view, setView] = useState<ViewId>('survival');
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
  const ratioAB = useMemo(() => {
    const base = { bytesPerParam: result.resolvedInputs.bytesPerParam, upsetRateFlipsPerGbMonth: result.resolvedInputs.upsetRateFlipsPerGbMonth, toleranceExponent: alpha, eccEnabled: result.resolvedInputs.eccEnabled, mbuFraction: result.resolvedInputs.mbuFraction };
    return t50Days(MODELS.A.params, base) / t50Days(MODELS.B.params, base);
  }, [result.resolvedInputs, alpha]);
  const reset = () => INPUT_SPECS.forEach((s) => onChange(s.key, s.defaultValue));
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
          <div className="bfr-view" role="tabpanel">
            {view === 'anatomy' && <BitAnatomy key={result.resolvedInputs.weightMagnitude} weightMagnitude={result.resolvedInputs.weightMagnitude} injectedFlips={result.resolvedInputs.injectedFlips} pBit14={v.pBit14AtLeastOne} pExponent={v.pExponentAtLeastOne} />}
            {view === 'survival' && (
              <>
                <div className="bfr-subtabs"><SegButton active={axis === 'flips'} onClick={() => setAxis('flips')}>Absolute Flips</SegButton><SegButton active={axis === 'fpb'} onClick={() => setAxis('fpb')}>Flips Per Billion Parameters</SegButton></div>
                <SurvivalChart ref={svgRef} params={params} alpha={alpha} assumeClean={clean} axis={axis} injectedFlips={result.resolvedInputs.injectedFlips} sizeLabel={`${fmtNumber(result.resolvedInputs.modelParamsBillions, 3)} B parameters`} />
                <ResidualTable alpha={alpha} />
              </>
            )}
            {view === 'tolerance' && <ToleranceChart ref={svgRef} alpha={alpha} bytesPerParam={result.resolvedInputs.bytesPerParam} rate={result.resolvedInputs.upsetRateFlipsPerGbMonth} ecc={result.resolvedInputs.eccEnabled} mbu={result.resolvedInputs.mbuFraction} ratioLargeVsSmall={ratioAB} currentBillions={result.resolvedInputs.modelParamsBillions} />}
            {view === 'accumulation' && <AccumulationChart ref={svgRef} inputs={result.resolvedInputs} />}
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
        <ControlPanel inputs={result.resolvedInputs} onChange={onChange} onReset={reset} onExport={onExport} />
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
