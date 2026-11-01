# LLM bit-flip resilience (`llm-bitflip-resilience`)

**Release 0.2.0 · contract 1.0.0 · Realism: Sketch · Author: Patrick X. Capaldo**

*Drafted with AI assistance; numbers checked by the author.*

## The question

How long does a language-model weight store survive accumulating bit flips? A larger model tolerates more flips in absolute terms, but it also presents more memory to be hit. **Survival time is set by tolerance divided by exposure, and scale changes both.**

Secondary lessons: one exponent bit can move an FP16 weight by 2^16; failure is graded, and fluent-but-wrong output (Semantic Collapse) is common; scrubbing and ECC change the question from "how many flips" to "how long can they accumulate".

## Why "Sketch"

The label is the single constant `REALISM_LABEL` in `version.ts`. It is a Sketch because it rests on two measured models, two independent batches of 25 trials per dose, one software and hardware stack, FP16 only, and a software fault model. The scaling between sizes (alpha, curve collapse) is an assumption fitted to two points, the upset rate is a user input with no flux model behind it, and the SECDED analytics are not measured at all.

## Source and provenance

Capaldo and Brooker, "RadiAI: Characterising Stochastic Bit-Flip Resilience in Large Language Models for Aerospace Edge-Computing Applications", IET Aerospace & AI Technical Networks (preprint). Data are transcribed from Tables 3 to 8 and Sections 6.3, 7.1, 7.5 and 11 into `data/radiai-measured.ts`; `model.test.ts` re-derives every dependent column.

| Model | Parameters | Precision |
| --- | --- | --- |
| Meta-Llama-3-8B-Instruct (the scaling reference, id `A` in code) | 8.03 B | FP16 |
| Qwen2.5-3B-Instruct (id `B` in code) | 3.086 B | FP16 |

The per-dose outcome counts (`data/outcome_split_summary.csv`, paper Figure 6) were supplied by the author; the paper prints them only as a figure. Tests check them against the survival tables and the paper's stated Semantic Collapse ranges. The Llama weights came from a community mirror (paper Section 5.2).

## Equations

- Dose: FPB = N_flips / N_params × 10^9.
- FP16 exponent flip: w' = w · 2^(±2^(k−10)) for bits k = 10 to 14 (×2, ×4, ×16, ×256, ×65 536). A mantissa flip changes magnitude by at most a factor of 2.
- Bit 14 on a normal weight: |w| < 1 gives ×2^16; 1 ≤ |w| < 2 lands on an all-ones exponent (the Inf pattern for exactly 1.0, a NaN pattern otherwise); |w| ≥ 2 already has the bit set, so the flip divides by 2^16 (exactly from |w| ≥ 4; between 2 and 4 the result falls into the subnormal range).
- P(≥1 bit-14 flip in N) = 1 − (15/16)^N; P(≥1 exponent flip in N) = 1 − (11/16)^N.
- Tolerance (assumed): N50(N) = N50_ref · (N / N_ref)^α, with N50_ref the mean of Meta-Llama-3-8B-Instruct's two empirical crossings (39.69 flips; batches 35.6 to 43.8).
- Curve collapse (assumed): S(n | N) = S_ref(n / (N/N_ref)^α), S_ref the mean of its two batches.
- Exposure: λ = r · G · T; t50 = N50 / (r · G); t50(N_L) / t50(N_S) = (N_L / N_S)^(α−1).
- Tail (assumed): above 80 reference flips S_ref(n) = S_ref(80) · exp(−(n − 80) / n0), with n0 ≈ 59 flips fitted by maximum likelihood to Meta-Llama-3-8B-Instruct's measured doses.
- Accumulation: E[S] = Σ Poisson(n; λ) · S(n), with the decaying tail summed in closed form (exact at any λ).
- SECDED (analytic extension): U = m·λ + λ²/(2W), n_eff = 2U.
- Canary: P(collapsed | pass) = s·p_c / (s·p_c + (1−s)·p_i).

## Worked example

Meta-Llama-3-8B-Instruct is 8.03 B parameters, 16.06 GB in FP16. Its 50 % crossing is about 39.7 flips (4.94 FPB). Qwen2.5-3B-Instruct's absolute crossings are 27 to 31 flips. The matched-batch ratios 1.32 and 1.40 against a parameter ratio of 2.602 give α = 0.29 and 0.35, so the default is 0.32. At 1 flip/GB/month the 8.03 B model reaches its tolerance in about 75 days, and with α = 0.32 that is 0.52 times the 3.09 B model's time. With α = 1 the two times are equal. The two models' cross-batch crossing ratios (1.14 to 1.62) imply α between about 0.14 and 0.50, so α = 1 lies outside what the measured crossings support; the Tolerance view shades that band.

## Inputs, outputs and composition

Ports are declared in `sandbox/module.ts`. `memoryPowerW` and `eccExtraPowerW` are `quantity` outputs in W (`DIM_POWER`) and pass `canConnect` against the thermal module's `parasiticHeatW` and `computeWattsRequested` (tested). See `sandbox/headless.example.ts` for a pipeline step.

## Assumptions and limitations

The full list is `descriptor.assumptions`, shown in the Provenance view. In short:

- Software fault model: independent single-bit flips; no particle cross-sections, correlated strikes or clustered multi-bit upsets.
- **No physical flux model.** The paper does not measure or model radiation flux. The rate is a user input. The only presets are the paper's illustrative cruise-altitude range, 0.01 to 10 flips/GB/month (quoting JESD89A); beyond it the slider is labelled "user-defined, unvalidated". No orbital or solar-event preset ships because no public source was verified for one.
- Uniform layer sampling (over-represents small layers compared with a bit-uniform exposure); persistent corruption; FP16 only; instruction-tuned models only; greedy decoding.
- Two models, n = 25 per dose, two batches; one stack (a stack change shifted LD50 by about 2× in the paper). Provisional.
- The smaller model's logistic fit is weakly identified, so empirical crossings are the primary summary.
- Measured dose range 20 to 80 flips. Below 20 the curve is interpolated from an assumed clean start (toggle) and shaded "interpolated, not measured"; above 80 the curve continues at a constant-hazard decay (n0 ≈ 59 flips; an assumption, version 0.1.1 held it flat) and is flagged "not measured". Sizes outside 3.09 B to 8.03 B raise an extrapolation warning.
- Survival means accuracy > 0: it counts every trial that is not dead, chance-level ones included. The intact share (within 10 points of clean) is lower; the Survival view can overlay it. Semantic Collapse means parseable answers with accuracy ≤ 40 %, counted here as 0 < accuracy ≤ 40 % per the paper's Figure 6 legend (accuracy 0 is dead).
- Exposure is bit-uniform over the whole store, but the measurements flipped bits uniformly across layers of the linear weight matrices (embedding tables, norms and biases were never injected). The effect of that mismatch is not measured.
- Bytes per parameter changes only the exposed memory, so time scales as 1 / bytes. It is not a quantisation result.
- Outcome split: shown for the six or seven measured doses only, never interpolated. Chart follows the size control by showing the nearest measured model; other sizes are not measured.

## Reading this module against the paper

The paper measures dose against survival; this module adds a time axis on top of it. Anything involving upset rate, scrubbing, ECC, power, the exponent α or the tail above 80 flips is the module's model, not a paper finding, and each view is tagged accordingly. Decisions worth knowing:

- **Tail above 80 flips decays (0.2.0).** The paper's dense sweeps stop at 80 flips and never reach zero survival, but its own pilots show total collapse at far higher doses. A flat tail contradicts that, so the curve continues at a constant hazard. Alternatives are to report a bound (survival between the decayed value and the last measured value) or to stop the chart at 80 flips.
- **N50 is still the mean of the two batch crossings (39.7 flips; 4.94 FPB),** which matches the midpoint of the paper's Table 8 crossings. The plotted mean curve reads 47 % there, because averaging crossings is not the same as crossing the averaged curve (that gives 38.5 flips). The chart footnote says so. Moving N50 to 38.5 would put the marker on the curve but shift every headline figure away from the paper's table.
- **α = 1 remains selectable** so the scale-invariant case can be shown, but it is flagged as outside the range the measured crossings imply (0.14 to 0.50). The paper itself says two models cannot distinguish scale-invariance from mildly sub-linear scaling; on this module's residual check α = 1 fits the smaller model worse, and the check uses only the doses that map inside the measured range, so compare α values on the same doses.
- **"Survival" is "not dead".** Time to tolerance and expected survival use that definition. The stricter intact share is available in the Survival view.
- **The canary readout** pools pass and miss rates over all doses; the collapse share it conditions on varies with dose.

## Backlog

- South Atlantic Anomaly exposure fraction using `core/orbitalMechanics.ts`. Requires a sourced flux model; none is included here.
- Challenge (3 levels) and Play (higher or lower), Phases 2 and 3.

## Changelog

- 0.2.0: Tail above 80 flips now decays (constant hazard, n0 fitted to the measured doses) instead of holding at 26 %, with an exact closed-form Poisson sum; expected survival at long intervals now falls toward zero. Measured region and every other output are unchanged. Survival view: optional intact-share overlay with its 50 % crossing (31.4 flips against 38.5 for survival, Meta-Llama-3-8B-Instruct; Qwen2.5-3B-Instruct is already at 44 % intact at 20 flips), N50 footnote explaining the 47 % curve reading, "not dead" wording. Tolerance view: shaded band for the data-implied α range (0.14 to 0.50). Controls: α-range note and a not-FP16 warning beside the sliders and as a banner. Canary prior starts at the measured 37 % (28 to 45 % by batch). Outcomes: per-batch shares beside the pooled figure and a note on the Semantic Collapse definition. Each view carries a measured / modelled tag and exported charts say "illustrative model"; Home states what is measured, modelled and not modelled. New assumptions declared; tests added. **Golden vectors with probability mass above 80 reference flips (and `survivalAtInjectedFlips` for small models) must be regenerated; older 0.1.x run records no longer verify by design.**
- 0.1.1: Outcomes view with show/hide toggle and the per-dose split (author-supplied CSV); models shown by checkpoint name; bit-14 wording corrected (Inf/NaN pattern for 1 ≤ |w| < 2; subnormal fall for 2 ≤ |w| < 4).
- 0.1.0: Phase 1. Kernel, measured data, tests, Explore views, README.

## Cite and replay

Cite the paper and this module as `llm-bitflip-resilience v0.2.0`. Use Export in the Controls panel to save a run record; `verifyRunRecord` in `runRecord.ts` replays and checks it (tested). `scripts/replay-run.ts` currently handles only the thermal module's records. Tests: `npx tsx src/modules/llm-bitflip-resilience/model.test.ts`. Golden vectors: `data/golden-vectors/llm-bitflip-resilience.json`.
