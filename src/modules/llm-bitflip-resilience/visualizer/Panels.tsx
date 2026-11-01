import { useState } from 'react';
import { CANARY, canaryPosterior } from '../sandbox/kernel';
import { MODELS, SEMANTIC_COLLAPSE } from '../data/radiai-measured';
import { fmtPct } from './format';
import { Metric } from '../../../core/ui';

/** View 5: canary panel, Bayes readout and optional outcomes.csv bars. */
export function CanaryPanel() {
  const [share, setShare] = useState(0.3);
  const lo = canaryPosterior(share, CANARY.missPct[0] / 100, 1 - CANARY.falseAlarmPct[0] / 100);
  const hi = canaryPosterior(share, CANARY.missPct[1] / 100, 1 - CANARY.falseAlarmPct[1] / 100);
  return (
    <div className="bfr-canary">
      <p className="bfr-lede">A single-prompt fluency probe is a cheap canary. It is informative but cannot certify that answers are right.</p>
      <div className="sci-metrics">
        <Metric label={<>Probe sensitivity to Semantic Collapse</>} value={<>{CANARY.sensitivityPct[0]}–{CANARY.sensitivityPct[1]} %</>} note={<>fails the probe</>} />
        <Metric label={<>Miss rate (collapsed, probe passes)</>} value={<>{CANARY.missPct[0]}–{CANARY.missPct[1]} %</>} note={<>paper Section 7.1</>} />
        <Metric label={<>False alarm (intact, probe fails)</>} value={<>{CANARY.falseAlarmPct[0]}–{CANARY.falseAlarmPct[1]} %</>} note={<>paper Section 7.1</>} />
        <Metric label={<>Semantic Collapse, share of all trials</>} value={<>{SEMANTIC_COLLAPSE.shareOfTrialsPct[0]}–{SEMANTIC_COLLAPSE.shareOfTrialsPct[1]} %</>} note={<>every batch</>} />
      </div>
      <label className="bfr-slider-row">Semantic Collapse share of (collapsed + intact) trials, s = {fmtPct(share, 0)}
        <input type="range" min={0.01} max={0.99} step={0.01} value={share} onChange={(e) => setShare(parseFloat(e.target.value))} />
      </label>
      <div className="sci-callout-dark">If the probe passes, the chance the answers are collapsed is still <strong>{fmtPct(lo)} to {fmtPct(hi)}</strong>. Passing lowers the odds but does not clear the model. Task-level evaluation is needed.</div>
      <h4>Share of surviving trials in Semantic Collapse</h4>
      <p className="sci-note">Lowest two doses: {SEMANTIC_COLLAPSE.survivorShareLowestTwoDosesPct[0]}–{SEMANTIC_COLLAPSE.survivorShareLowestTwoDosesPct[1]} %. Highest two doses: {SEMANTIC_COLLAPSE.survivorShareHighestTwoDosesPct[0]}–{SEMANTIC_COLLAPSE.survivorShareHighestTwoDosesPct[1]} %. The per-dose split is in the Outcomes view.</p>
    </div>
  );
}

/** View 6: parameter split. */
export function ParamSplit() {
  return (
    <div className="bfr-split">
      <p className="bfr-lede">Memory cost of possible targeted protection. Ablations do not establish which is more vulnerable.</p>
      {(['A', 'B'] as const).map((id) => {
        const p = MODELS[id].paramShare;
        return (
          <div key={id} className="bfr-split-row">
            <span>{MODELS[id].uiName}</span>
            <div className="bfr-stack" role="img" aria-label={`Self-attention ${p.selfAttentionPct} %, MLP ${p.mlpPct} %, other ${p.otherPct} %`}>
              <i className="bfr-seg bfr-seg-attn" style={{ width: `${p.selfAttentionPct}%` }}>{p.selfAttentionPct} %</i>
              <i className="bfr-seg bfr-seg-mlp" style={{ width: `${p.mlpPct}%` }}>{p.mlpPct} %</i>
              <i className="bfr-seg bfr-seg-other" style={{ width: `${p.otherPct}%` }}>{p.otherPct} %</i>
            </div>
          </div>
        );
      })}
      <div className="bfr-bit-legend"><span className="bfr-sw bfr-seg-attn" /> self-attention <span className="bfr-sw bfr-seg-mlp" /> MLP / feed-forward <span className="bfr-sw bfr-seg-other" /> other (embeddings and the rest)</div>
      <p className="sci-note">Fractions are derived by the paper from published architecture configurations (paper Section 7.5, Figure 8). They describe implementation cost only.</p>
    </div>
  );
}
