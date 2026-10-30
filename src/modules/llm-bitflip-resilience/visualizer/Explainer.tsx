import { useEffect, useMemo, useRef } from 'react';
import katex from 'katex';
import { llmBitflipResilience } from '../sandbox/module';
import { ALPHA_DERIVATION, N50_REF, N50_REF_BAND } from '../sandbox/kernel';
import { equations } from '../equations';
import { REALISM_LABEL } from '../version';
import { fmtDays, fmtNumber, fmtPct } from './format';
import 'katex/dist/katex.min.css';
import './Explore.css';

function Equation({ latex }: { latex: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) katex.render(latex, ref.current, { throwOnError: false, displayMode: true }); }, [latex]);
  return <div className="bfr-equation" ref={ref} />;
}

const eq = (id: string) => equations.find((e) => e.id === id)!;

export function Explainer() {
  const big = useMemo(() => llmBitflipResilience.run({ modelParamsBillions: 8.03 }).values, []);
  const small = useMemo(() => llmBitflipResilience.run({ modelParamsBillions: 3.086 }).values, []);
  const inv = useMemo(() => llmBitflipResilience.run({ modelParamsBillions: 8.03, toleranceExponent: 1 }).values, []);
  const d = ALPHA_DERIVATION;
  return (
    <article className="bfr-chapter">
      <a className="bfr-skip" href="#module-tool">Skip to tool</a>
      <p className="bfr-badge">Realism: <strong>{REALISM_LABEL}</strong> · two measured models, one software stack, a software fault model, no flux model</p>
      <h2>The question: how long does a language model’s memory survive bit flips?</h2>
      <p>A model’s weights sit in memory, and radiation can flip bits there. Injecting random single-bit flips into two FP16 models showed that failure is graded rather than sudden, and that survival falls as flips accumulate. A larger model tolerates more flips in absolute terms, but its weight store is larger, so it also catches more of them. <strong>Survival time is set by tolerance divided by exposure, and scale changes both.</strong></p>
      <h3>Concepts</h3>
      <ul>
        <li><strong>Dose.</strong> Flips per billion parameters (FPB) puts models of different sizes on one axis.</li>
        <li><strong>One bit can matter a lot.</strong> An FP16 weight has a sign bit, five exponent bits and ten mantissa bits. Flipping an exponent bit can multiply a weight by up to 2<sup>16</sup>; flipping a mantissa bit changes it by at most a factor of 2. For the top exponent bit (bit 14) on a normal weight: |w| &lt; 1 gives × 2<sup>16</sup>; 1 ≤ |w| &lt; 2 lands on an Inf or NaN bit pattern (exponent all ones); |w| ≥ 2 already has the bit set, so the flip divides it by 2<sup>16</sup> (exactly so from |w| ≥ 4; between 2 and 4 the result falls into the subnormal range, close to zero).</li>
        <li><strong>Failure is graded.</strong> Between 11 % and 17 % of trials gave fluent, well-formed answers with accuracy at or below 40 % (Semantic Collapse), and a single-prompt fluency probe passed 17–24 % of them. Among surviving trials their share roughly doubles from the lowest to the highest doses.</li>
        <li><strong>Scrubbing and ECC</strong> change the question from “how many flips” to “how long can they accumulate”.</li>
        <li><strong>The upset rate is yours.</strong> The paper measures no radiation flux. The rate is an input, and only the paper’s illustrative cruise-altitude range is offered as a preset.</li>
      </ul>
      <h3>Equations</h3>
      {['fpb-dose', 'fp16-exponent-swing', 'tolerance-scaling', 'exposure-time'].map((id) => (
        <div key={id}><p><strong>{eq(id).label}.</strong> {eq(id).description}</p><Equation latex={eq(id).latex} /></div>
      ))}
      <details className="bfr-working">
        <summary>Show the rest of the working</summary>
        {['bit-hit-probability', 'curve-collapse', 'poisson-accumulation', 'secded-double-hit', 'canary-bayes'].map((id) => (
          <div key={id}><p><strong>{eq(id).label}.</strong> {eq(id).description}</p><Equation latex={eq(id).latex} /></div>
        ))}
      </details>
      <h3>Worked example</h3>
      <p>Meta-Llama-3-8B-Instruct has 8.03 B parameters, so 16.06 GB at 2 bytes each in FP16. Its 50 % survival crossing sits at about {fmtNumber(N50_REF, 3)} flips (batches {fmtNumber(N50_REF_BAND[0], 3)}–{fmtNumber(N50_REF_BAND[1], 3)}), or {fmtNumber(big.fpb50, 3)} FPB. Qwen2.5-3B-Instruct (3.09 B) crossed at a larger dose per parameter. The ratio of absolute tolerances, {fmtNumber(d.batchMatchedRatios[0], 3)} to {fmtNumber(d.batchMatchedRatios[1], 3)} for matched batches, against a parameter ratio of {fmtNumber(d.paramRatio, 4)}, gives α between {fmtNumber(d.batchMatchedAlpha[0], 2)} and {fmtNumber(d.batchMatchedAlpha[1], 2)}. That is a two-point fit, not a scaling law.</p>
      <p>At an illustrative 1 flip/GB/month, the 8.03 B model takes {fmtDays(big.t50Days)} on average to accumulate that many flips and a 3.09 B model {fmtDays(small.t50Days)}. At the default α the 8.03 B model reaches its tolerance in {fmtNumber(big.timeToN50Ratio, 3)}× the time. If tolerance scaled exactly with size (α = 1), the ratio would be {fmtNumber(inv.timeToN50Ratio, 3)}: no safety margin from size alone. With a 30-day scrub, the larger model’s expected survival is {fmtPct(big.expectedSurvival)}. The data cannot tell α = 1 from a mildly smaller exponent.</p>
      <p className="bfr-note">Drafted with AI assistance; numbers checked by the author.</p>
    </article>
  );
}
