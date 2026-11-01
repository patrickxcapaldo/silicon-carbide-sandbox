import type { ReactNode } from 'react';
import { InfoTip } from '../../../core/ui';

export type Basis = { kind: 'exact' | 'measured' | 'mixed' | 'modelled' | 'info'; text: string };
export type ViewHelp = { what: string; detail: ReactNode; drivenBy: string[]; fixedData?: boolean; basis: Basis };

/** Which controls feed each view, so people know which sliders to expect an effect from. */
export const VIEW_HELP: Record<string, ViewHelp> = {
  anatomy: {
    what: 'Flip single bits of one FP16 weight and see how far the value moves.',
    detail: <>An FP16 number is 16 bits: 1 sign, 5 exponent, 10 mantissa. Click a bit to flip it; click it again to flip it back. The meter shows where the weight sits on a log scale. Exponent flips throw it across many orders of magnitude, mantissa flips barely move it. The probability cards at the bottom answer “over N random flips, how likely is it that at least one hits an exponent bit?”.</>,
    drivenBy: ['Weight magnitude (picks the starting weight)', 'Injected flips (N in the two probability cards)'],
    basis: { kind: 'exact', text: 'Exact FP16 arithmetic' },
  },
  survival: {
    what: 'The fraction of trials that are not dead (any correct answer, chance-level included) as flips accumulate.',
    detail: <>Dots are measured trials for the two models. The solid line is this tool’s assumed curve for the model size you choose (the Llama curve stretched along the flips axis by the tolerance exponent α). Shaded regions are not measured, and beyond the measured window the curve continues at a constant decay, which is an assumption. “Show intact share” adds the stricter measure of trials still within 10 points of clean accuracy. The dotted vertical line is the flips you would expect in one scrub interval.</>,
    drivenBy: ['Model parameters', 'Tolerance exponent α', 'Assume clean at zero', 'Injected flips (ring)', 'Upset rate, scrub interval, ECC, MBU, bytes per parameter (dotted line)'],
    basis: { kind: 'mixed', text: 'Measured points + assumed curve' },
  },
  tolerance: {
    what: 'How tolerance and exposure both rise with model size, and what that does to survival time.',
    detail: <>A bigger model tolerates more flips (blue line) but also has more memory to be hit (right axis). The bottom panel is the ratio of the two: time to tolerance relative to the 3.09 B model. Where it falls below 1, extra size shortens survival time. The shaded band is the range of α the two measured models imply (about 0.14 to 0.50); α = 1 lies outside it.</>,
    drivenBy: ['Tolerance exponent α', 'Bytes per parameter', 'Upset rate', 'ECC and MBU', 'Model parameters (rings)'],
    basis: { kind: 'modelled', text: 'Modelled: assumed α, user-set rate' },
  },
  accumulation: {
    what: 'Expected survival after one scrub or reload interval, with and without ECC.',
    detail: <>Longer intervals let more flips pile up. Survival is averaged over the random number of flips (Poisson). SECDED ECC corrects single flips, so only double hits in one 64-bit word count. Beyond the measured dose (grey shading) the survival decay is assumed, not measured.</>,
    drivenBy: ['Scrub interval (marker)', 'Model parameters', 'Upset rate', 'Tolerance exponent α', 'Bytes per parameter', 'MBU fraction', 'Assume clean at zero'],
    basis: { kind: 'modelled', text: 'Modelled: user-set rate, analytic ECC, assumed tail' },
  },
  outcomes: {
    what: 'For each measured dose, how trials split into intact, impaired, Semantic Collapse and dead.',
    detail: <>These are the paper’s per-dose counts, so the bars themselves never change. What you can change is which model and batch is shown, and which dose column is highlighted.</>,
    drivenBy: ['Model parameters (picks the nearest measured model when “Follow size control” is on)', 'Injected flips (highlighted column)'],
    basis: { kind: 'measured', text: 'Measured counts (author-supplied)' },
  },
  canary: {
    what: 'How much a quick single-prompt fluency check can tell you about whether a model is damaged.',
    detail: <>If the probe passes, how likely is the model still collapsed? That depends on how common collapse is. Use the slider in this view; it is local and separate from the main controls.</>,
    drivenBy: [],
    fixedData: true,
    basis: { kind: 'measured', text: 'Measured rates + Bayes arithmetic' },
  },
  split: {
    what: 'How the parameters divide between attention, MLP and other layers for the two models.',
    detail: <>Useful if you were thinking of protecting only part of the model with ECC. It describes memory cost only, not which part is more vulnerable.</>,
    drivenBy: [],
    fixedData: true,
    basis: { kind: 'info', text: 'Derived from published architectures' },
  },
  provenance: {
    what: 'Where every number comes from, and what is measured versus assumed.',
    detail: <>Use this to check what a result rests on before quoting it.</>,
    drivenBy: [],
    fixedData: true,
    basis: { kind: 'info', text: 'Sources and limits' },
  },
};

export function ViewHeader({ view }: { view: string }) {
  const h = VIEW_HELP[view];
  if (!h) return null;
  return (
    <div className="bfr-viewhead">
      <span>{h.what}</span>
      <span className={`bfr-basis bfr-basis--${h.basis.kind}`}>{h.basis.text}</span>
      <InfoTip label="What this view shows and which controls drive it" width={380}>
        <p>{h.detail}</p>
        <p className="sci-info-pop__extra">{h.drivenBy.length > 0 ? <>Controls that change this view: {h.drivenBy.join('; ')}.</> : <>This view shows fixed paper data; the main controls do not change it.</>}</p>
      </InfoTip>
    </div>
  );
}

export const HOME_CARDS: { id: string; title: string; shows: string; use: string }[] = [
  { id: 'anatomy', title: 'Bit Anatomy', shows: 'What a single flipped bit does to one FP16 weight.', use: 'Click bits. Start here if you are new to the idea.' },
  { id: 'survival', title: 'Survival Vs Dose', shows: 'How many flips a model survives (not dead), measured and extrapolated.', use: 'Change model size and α to see the curve stretch; toggle the intact share.' },
  { id: 'tolerance', title: 'Tolerance Vs Exposure', shows: 'Why a bigger model is not automatically safer.', use: 'Move α toward 1 and watch the ratio flatten; note the shaded data range.' },
  { id: 'accumulation', title: 'Accumulation', shows: 'Survival after one scrub interval, with and without ECC.', use: 'Drag the scrub interval and upset rate.' },
  { id: 'outcomes', title: 'Outcomes', shows: 'Intact, impaired, collapsed or dead, per measured dose.', use: 'Switch model and batch; fixed paper data.' },
  { id: 'canary', title: 'Canary', shows: 'How far a quick fluency probe can be trusted.', use: 'Drag the share slider to see the posterior.' },
  { id: 'split', title: 'Parameter Split', shows: 'Attention, MLP and other shares of the weights.', use: 'Read-only; informs targeted protection.' },
  { id: 'provenance', title: 'Provenance', shows: 'Data sources, assumptions and limits.', use: 'Check before you quote a number.' },
];
