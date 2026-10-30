# REPORT: llm-bitflip-resilience, Phase 1 (revision 0.1.1)

Release 0.1.1 · Realism label: Sketch · Scope delivered: **Phase 1 (kernel, data, tests, manifest/model/equations, Explore, README)**. Phases 2 (Challenge) and 3 (Play) are **not built** (not part of this revision's request); see "Stop and ask" below.

## Changes in 0.1.1 (this revision)

1. **Outcomes view with show/hide toggle.** New "Outcomes" tab: stacked bars of intact / impaired / Semantic Collapse / dead per measured dose (paper Figure 6 data), a "Show/Hide outcome split" button, model selector (default: follows the size control and shows the nearest measured model; or pick either), batch selector (both pooled, original, replication), highlight of the measured dose nearest the injected-flips control, and the Semantic Collapse share of survivors under each bar plus a low-dose versus high-dose callout. Slide export (SVG/PNG, dark/light) works for it too. Outcomes are never interpolated; sizes between the two measured models show the nearest model with a note.
2. **Outcome data.** `data/outcome_split_summary.csv` (verbatim) and `data/outcomes.ts` (typed). Tests check: the CSV and typed copy match row for row; every row sums to n; dead counts equal 25 minus the survivors in Tables 4 to 7 for all 26 rows; Semantic Collapse is 11 to 17 % of trials in every batch (11.3, 13.1, 16.0, 16.6 %); the larger model's original batch gives 21 % → 43 % of survivors (the abstract's figure); the share rises with dose in every model/batch combination and sits inside the paper's 12–35 % → 35–67 % ranges. The CSV is author-supplied, not transcribed from a paper table.
3. **Redaction policy.** Models are now shown as Meta-Llama-3-8B-Instruct and Qwen2.5-3B-Instruct throughout (controls, charts, explainer, provenance). Internal ids `A`/`B` remain code identifiers. The CSV's own names (`NousResearch_…`, `Qwen_…`) appear only in the provenance table. Company, programme, aircraft and incident names stay banned; the test-suite scan still runs (only the checkpoint-name restriction was removed).
4. **Bit-14 wording** adopted, with two refinements found while testing: for 1 ≤ |w| < 2 the flip gives an all-ones exponent, which is the Inf pattern only for exactly 1.0 and a NaN pattern otherwise; and for 2 ≤ |w| < 4 the result falls into the subnormal range (≈ zero) rather than being an exact ÷2¹⁶, which holds from |w| ≥ 4. Shown live in the Bit Anatomy view, in the Explainer, README, kernel (`bit14Case`) and tests.
5. The Canary view's optional CSV upload was removed (the data now ships). `parseOutcomesCsv` stays in the kernel and is used by the tests.

## What was built

- `sandbox/kernel.ts`: FP16 bit field from first principles (no `Float16Array`), dose conversion, measured-curve interpolation, tolerance scaling and curve collapse, Poisson accumulation (log-space, stable), SECDED analytics, canary Bayes, memory power, Semantic Collapse share band, `outcomes.csv` parser.
- `sandbox/module.ts`: 11 declared inputs, 19 outputs, 14 structured assumptions, `resolveInputs` contract. `sandbox/headless.example.ts` follows the solar module's pattern and adds a pipeline step into the thermal module.
- `data/radiai-measured.ts`: Tables 3 to 8, baselines, parameter counts, architecture splits and the Semantic Collapse / canary ranges, transcribed from the paper text.
- `manifest.ts`, `model.ts` (rounding only), `equations.ts`, `runRecord.ts`, `version.ts`, `View.tsx`, README.
- Explore views: bit anatomy; survival vs dose (flips/FPB toggle, curve-collapse residual table against Model B); tolerance vs exposure (dual axis plus time-ratio panel with the α = 1 line); accumulation (ECC on/off); canary panel with Bayes slider and optional user-loaded `outcomes.csv`; parameter split; provenance and assumptions. SVG and PNG export of views 2 to 4 in dark or light palette. Run-record export. "Where this connects" panel. The line "Drafted with AI assistance; numbers checked by the author." is on the page.
- `data/golden-vectors/llm-bitflip-resilience.json`: 11 vectors.

## Test results (fresh clone, zip unzipped, PATCHES applied)

```
=== Running src/modules/llm-bitflip-resilience/model.test.ts ===
11 llm-bitflip-resilience golden vectors passed.
All llm-bitflip-resilience model, contract, composition and golden-vector assertions completed.
=== Passed: src/modules/llm-bitflip-resilience/model.test.ts ===
✅ All module test suites passed successfully.
```

- `npm test`: all 8 suites green (7 existing, 1 new). The new suite is one script of assertions (no per-assertion counter); it covers table integrity (FPB for every row, four crossings, footprints, ratio), FP16 (round trip over all finite patterns, XOR round trip, factors), scaling (exact `(N_L/N_S)^(α−1)`), Poisson, SECDED, Bayes, contract, `canConnect`, golden vectors and a hygiene scan.
- `tsc -b`: clean. `npm run build`: succeeds.
- `eslint src/modules/llm-bitflip-resilience`: clean. `eslint .`: **5 problems (4 errors, 1 warning), all in existing solar/thermal files, identical on a pristine clone**. Not fixed because the brief says not to edit existing modules.
- **Not verified:** the UI (including the new Outcomes view) was not opened in a browser, so layout, the SVG/PNG export in dark and light, and the file-input path are untested visually. Only the type check, lint, build and kernel tests ran.

## Repo versus North Star / style guide / brief: disagreements

1. **Orchid:** `src/index.css` has `--orchid: #B97FED`, matching the North Star; `docs/module-style-guide.md` says `#a855f7`. I followed the repo (`var(--accent)`, `#B97FED`).
2. **Canvas height:** style guide says fixed 760 px; I used `min-height: 760px` with a flex layout so the controls panel is not absolutely positioned (stacks below 960 px).
3. **Kernel "no imports":** the kernel imports `data/radiai-measured.ts` (plain data, no code) because the survival curve needs the tables. Passing the data in would keep it import-free at the cost of every call site.
4. **Cross-batch ratios:** the brief and paper give 1.16 to 1.63 (α ≈ 0.16 to 0.51). Unrounded crossings give 1.14 to 1.62 (α ≈ 0.14 to 0.50); the paper evidently divided rounded flip counts (36/31, 44/27). Batch-matched values (1.32, 1.40; α 0.29, 0.35) match. Tests assert the unrounded values and the paper's to rounding.
5. **Anchor band:** brief says 35.7 to 43.8 flips. Unrounded the lower end is 35.625 (35.7 comes from 4.44 FPB × 8.03 B). Module uses 35.625 to 43.75; mean 39.6875.
6. **SECDED vector:** brief says ≈3.9×10⁻⁷ double hits at N = 40; 1600 / (2 × 2.0075×10⁹) = 3.985×10⁻⁷ (≈4.0×10⁻⁷). The 63 400-flip figure matches (63 364).
7. **Bit-14 statement:** see 0.1.1 item 4. Challenge L1 wording must use the same corrected cases.
8. **Replay script:** `scripts/replay-run.ts` handles only the thermal module's records; noted in PATCHES.

## Assumptions I made

- `scrubIntervalDays` is 0.01 to 3650 d with no ∞ sentinel (contract rejects non-finite). "No scrubbing" means setting it to the mission length.
- `GB_raw` for exposure is the weight store (data bits). ECC check-bit upsets are ignored, as §3.7 requires; the 12.5 % appears in storage and power only.
- `timeToN50Ratio` = t50 of the chosen size / t50 of the 3.086 B model, same rate, α, ECC and m. Exactly `(N/N_B)^(α−1)` without ECC.
- Above 80 mapped flips survival is held at the last measured value (S(80) = 26 % for Model A); the Poisson mass beyond is reported as `unmeasuredMass` and warned at > 1 %. Below 20 flips, with the clean-at-zero toggle off, it is held at S(20). Both are assumptions, flagged "not measured". The paper's separate small-model pilot (not used) saw zero accuracy at ≥ 250 flips, so the held tail may overstate survival at very high dose.
- The mean-curve 50 % crossing (≈ 38.5 flips) differs slightly from `N50_ref` (39.69, mean of the two crossings); `N50_ref` is used for `n50Flips`/`t50`, the curve for survival values.
- With SECDED on, uncorrectable events are treated as Poisson with the analytic mean U; each adds two flips. Valid for λ ≪ W (warned at λ > 1 % of W).
- Semantic Collapse survivor-share band: 12–35 % at mapped dose ≤ 30 flips, 35–67 % at ≥ 70, otherwise the 12–67 % envelope. No per-dose interpolation.
- Default memory power 0.375 W/GB (see sources); range 0 to 5 W/GB.
- The paper arrived as text in the chat message; the uploads folder held only the North Star. Tables were transcribed from that text.

## Omitted, and why

- **Orbital or solar-event presets:** none; no public source was verified. The slider shows "user-defined, unvalidated" outside 0.01 to 10 flips/GB/month.
- **Challenge and Play:** see below.
- **Table 9 / bit-type analysis, layer ablations, SmolLM2 pilots:** not used (descriptive, outside the brief).

## Stop and ask (Phases 2 and 3)

The Challenge shell (`src/core/challenge/types.ts`) takes **one** `options` list per `ChallengeDefinition`, and `ChallengeEvaluation` carries `gapPct` and a solar-specific `sunlitFraction`. The brief's three levels ask different questions (a swing factor, "which reaches 50 % first and by what factor", a Bayes percentage). I can express them only with generic answer buckets (for example multiple-choice ranges) per level, or by adding a per-level options field to the shell, which would edit core. Which do you prefer? Play's higher-or-lower shell looks compatible (`PlayDefinition` with levers and a `metric`), pending your answer on Challenge baselines. I have not started either.

Also confirm: should the L1 copy use the corrected bit-14 statement (item 7)?

## Sources (access date 29 October 2026 unless stated)

- Capaldo and Brooker, RadiAI preprint (supplied by the author; private repository, no URL). Source of all measured numbers and of the 0.01 to 10 flips/GB/month range, which the paper attributes to JEDEC JESD89A (2006). I did not retrieve JESD89A, so that range rests on the paper's citation.
- Crucial/Micron, "How Much Power Does Memory Use?" https://content.crucial.com/content/crucial/es-la/home/support/articles-faq-memory/how-much-power-does-memory-use.html : about 3 W per 8 GB for DDR3/DDR4 (rule of thumb, not for DDR5 or space-grade parts). Confidence low; a placeholder.
- JEDEC SECDED overhead (8 check bits per 64): quoted from the paper, Section 2.3.

## Acceptance checklist

- [x] Zero banned names. `grep -rniE "airbus|easa|jetblue|elac|a320|starcloud|spacex|starmind|google|suncatcher|nvidia" src/modules/llm-bitflip-resilience data/golden-vectors/llm-bitflip-resilience.json` returned nothing (exit 1); the test suite repeats the scan on every run. Checkpoint names are used openly (policy revised in 0.1.1).
- [x] No flux or orbital rate is presented as a measurement; all such inputs are labelled.
- [x] Every transcribed number traces to a paper table or section; tests pass.
- [x] No physics in React; adapters only round (a test scans `.tsx` files for maths calls; chart axis mapping lives in `series.ts`).
- [x] α, curve collapse, ECC and interpolation assumptions are in the UI and in `descriptor.assumptions`.
- [x] `memoryPowerW` connects to thermal `parasiticHeatW` (and `computeWattsRequested`) per `canConnect`.
- [ ] Slide-ready exports of views 2 and 3 in dark and light: implemented, **not tested in a browser**.
- [x] `npm test`, `tsc -b`, `npm run build` green; `eslint` clean for this module but the repo has 5 pre-existing problems elsewhere.
- [x] Unzip-and-drop verified on a fresh clone (with PATCHES 1 and 2 applied).
