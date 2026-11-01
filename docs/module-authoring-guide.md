# Module Authoring Guide

How to build a module so it looks, behaves and reads like every other module in the Sandbox. For *what* the visuals must be, see the [Module Style & UX Reference Standard](module-style-guide.md). This guide is *how to build it*.

## Start from the template

Copy `src/modules/_template/` to `src/modules/<your-id>/`, then replace the example content. The template is a complete, runnable module (manifest, equations, pure model, test, run record, chapter, Explore view, page) wired to the shared UI kit, so a new module starts on-standard and only the domain content changes. The `_template` directory is excluded from the module registry.

```
src/modules/<id>/
  manifest.ts            id, title, summary, realism, scope, parameters, equations
  equations.ts           id, label, KaTeX, one-sentence description
  model.ts               pure deterministic kernel + compute() adapter
  model.test.ts          plain script using assert from core/play/testKit
  runRecord.ts           what the Export button downloads
  View.tsx               ModulePageFrame > Explainer > ModuleModes
  visualizer/
    paramMeta.ts         PARAM_META: label (Title Case), unit, range, description
    ExploreView.tsx      ExploreCanvas + ControlsPanel + DetailsPanel
    Explainer.tsx        the chapter, in the fixed order
  challenge/ play/       optional, see below
```

A module with a full physics core (as in `orbital-thermal-limits`) keeps that core in `sandbox/` and has `model.ts` adapt it; the presentation layer is the same.

### Checklist for a new module

1. Copy the template; set `id` (kebab-case, permanent), `title` (Title Case), `summary`.
2. Set **`realism`** (`'Sketch' | 'Estimate' | 'Detailed'`) and a one-sentence **`scope`**: what it covers, assumes and ignores. Required.
3. Write the kernel in `model.ts`. **All physics lives here**, pure and deterministic. The UI never calculates.
4. Fill `paramMeta.ts` (Title Case labels, plain-language descriptions for the (i) buttons).
5. Write the chapter in order: question, concepts, equations, worked example, what it does not capture.
6. Build `ExploreView.tsx` from the kit. Add a chart, table or 3D scene in the main region.
7. Run `npx tsx src/core/ui/conformance.test.ts`. It must pass.
8. Add Challenge and Play when the kernel supports them (below).

## Page types

Use the generic `ModuleShell` for the standard parameter-and-results page: a module then needs only a manifest and model, no `View.tsx`. Add a custom `View.tsx` when the module needs a specialised interface (an interactive scene, a multi-tab chart). A custom view receives `inputs`, `onChange` and `results`.

## Shared layout

`ModulePageFrame` is the layout contract:

- Content is centred in a frame capped at 1200px with standard horizontal padding.
- The title, divider and badges span the frame; the summary is capped at 780px.
- Body content stays inside the frame. Constrain prose to about 780px and centre it (`<Chapter>` does this); visualisations may use the full width.

Do not recreate the outer frame or header. The header shows the title, summary, **scope**, and badges including the **realism** label, all from the manifest.

## The UI kit (`src/core/ui`)

Import from one place:

```ts
import { ExploreCanvas, ControlsPanel, Section, Group, PresetRow, SegButton,
         ParamSlider, Overlay, Metric, DetailsPanel, ValueBars, Chapter } from '../../core/ui';
```

| Need | Use |
|---|---|
| Explore frame (3D scene or 2D region) | `ExploreCanvas`, `ExploreMain` |
| Right-hand Controls | `ControlsPanel` (adds title, Export, Reset, chevron) |
| Grouping in the panel | `Section` (collapsible), `Group` (small label) |
| Sliders | `ParamSlider` (from `ParamMeta`), `SliderField` (custom mapping), `ToggleField` |
| Presets and toggles | `PresetList` + `PresetRow`, `SegRow` + `SegButton` |
| Explanations | `InfoTip` |
| Orbit view, speed, play | `OrbitPlayback` |
| Floating readouts | `Overlay`, `MetricGrid`, `Metric`, `StatusBadge` |
| Below-canvas breakdown | `DetailsPanel`, `ValueBars`, `StackedBar` |
| Chapter | `Chapter`, `Equation`, `Working`, `Facts`, `CardGrid`, `Callout` |
| Page tail | `ModuleModes` (`src/core/ModuleModes`) |
| Export | `downloadRunRecord` |
| Reset that survives stale state | `useResetInputs` |
| 3D constants | `SCENE` |

Rules of the road:

- **Never write a hex colour in a module stylesheet.** Use the tokens in `src/index.css` (`--viz-*`, `--series-*`, `--status-*`, `--on-accent`). The conformance test fails on retired colours and on hex in module CSS.
- **Never define `.sci-*`, `.challenge-*` or `.play-*` classes in a module.** Those namespaces belong to `src/core`. Module CSS uses its own short prefix (`.bfr-`) and only for domain-specific rendering.
- Orchid marks selection and the single highlighted item. Pass `bindingId` to `ValueBars` / `binding` to `StackedBar` for the binding constraint; do not colour other bars.
- Status colours are for model status only: `Metric status="fail"`, `StatusBadge tone="limit"`.
- Wrap module-specific controls in the kit components rather than styling raw `<button>`s and `<input>`s. Anything on the dark canvas should be a `.sci-btn` / `.sci-seg` / `SliderField`.
- Preset data: `{ id, label, description, ... }` for new modules. (`orbital-thermal-limits` uses `explanation` and `solar-power-budget` uses `name` / `blurb`; their panels map these. Prefer the standard names.)

## Explore-mode pattern

`SomeVisualizer` returns a `<>` fragment: first child `<ExploreCanvas>` (scene or main region + overlays + `controls={<ControlsPanel/>}`), second child a sibling `<DetailsPanel>` for any below-canvas breakdown.

3D reference: `orbital-thermal-limits/visualizer/` (and `solar-power-budget`). 2D reference: `llm-bitflip-resilience/visualizer/`. Starter: `_template/visualizer/ExploreView.tsx`.

A 3D visualiser folder typically holds `paramMeta.ts`, `types.ts`, `ControlPanel.tsx`, `SomeVisualizer.tsx`, `SomeScene.tsx`, `useOrbitClock.ts`, `scenarioPresets.ts`, `orbitPresets.ts`, `Explainer.tsx`. There is no per-module `InfoTip.tsx`, `ParamSlider.tsx`-from-scratch, or overlay CSS any more: `ParamSlider.tsx` is a three-line wrapper that binds the module's `formatQuantity` to the kit slider, and overlay/telemetry styling is the kit's.

## Challenge mode

Use the shared client-side challenge shell when a module can define a finite question set and evaluate answers deterministically. The framework lives in `src/core/challenge/`: `ChallengeShell` owns setup, the round loop, hints, timing, scoring and sharing; `ModeToggle` selects between the module's tool, Challenge and Play; `rng.ts` supplies short, replayable seeds; `generator.ts` performs bounded random-level selection.

A module provides one `ChallengeDefinition<Inputs>`:

- `id`, `title`, `versionInfo`, and a fixed-order list of answer options.
- `classicLevels` with complete module input objects, lesson copy, difficulty and archetype tags.
- `generate(rng, difficulty, context)` for deterministic randomised levels. Round varied inputs to the precision shown on the spec card before evaluation; reject invalid diagnostics and levels outside the requested difficulty band.
- `evaluate(inputs)`, which must call the module's deterministic kernel and return the answer, each option's numeric ceiling, status, diagnostics and any detail the reveal or hints need. Do not duplicate physical calculations in the UI.
- `hints`, plus module-specific `SpecCard`, `Reveal` and `Formulas` components. Hints must derive all numeric working from the same evaluation.
- Fixed time limits for each random difficulty.

Keep level archetypes, formulas, cards, reveal copy and domain rendering in the module directory; keep generic run mechanics in `src/core/challenge/`. **Do not add a module Challenge stylesheet:** all `.challenge-*` styling is in `core/challenge/challenge.css`. Reveal comparisons use `ValueBars` (the answer is the Orchid bar). A Challenge requires a pure deterministic kernel `evaluate()`; without one, seeded replay and answer verification are not reliable.

## Play mode ("Higher or Lower")

Use the shared play shell when learners can build intuition by guessing which of two single-parameter perturbations gives a higher resulting metric. The framework lives in `src/core/play/`: `PlayShell` manages setup, the 10-round loop, interactive options, log-scale reveal bars, reasons, scoring and share strings; `generator.ts` seeds deterministic runs matching difficulty ratio bands; `levers.ts` builds perturbations; `reason.ts` constructs explanations. Styling is `core/play/play.css`.

A module provides one `PlayDefinition<Inputs>`:

- `id`, `title`, `versionInfo`, `metricLabel`, `format(value)`, `intro`.
- `scenarios`: baseline input states (reuse the module's Challenge levels).
- `levers`: parameter perturbations with human-readable change summaries and physical lesson copy.
- `metric(inputs)`: evaluates inputs against the kernel and returns the numeric comparison metric.
- `order(val)`: sort function (defaults to higher-is-better).

Keep levers, metric mapping and baselines in `src/modules/<module-id>/play/definition.ts`. All Play runs require a deterministic kernel `metric()`.

## Wiring the modes

In `View.tsx`, pass the three modes to `ModuleModes`:

```tsx
<ModuleModes
  explore={<MyVisualizer ... onExport={handleExport} />}
  challenge={<ChallengeGame />}
  play={<PlayGame />}
/>
```

Omit `challenge` or `play` if not built; the standard "not built yet" notice appears. Challenge and Play stay mounted (hidden) while you switch modes, so a run in progress survives.

## Testing

- `model.test.ts`: kernel correctness and determinism (a plain script using `assert` from `core/play/testKit`).
- `challenge/` and `play/` tests as before (`checkPlayDefinition`).
- **`src/core/ui/conformance.test.ts`** runs over every module and enforces the style standard. Run it with the rest of the suite; add it to CI.

## Reviewing a module visually

The conformance test cannot judge whether something *looks* right. Before merging, check in a browser, at least once in each of: dark page theme, light page theme, a phone-width viewport. In each, confirm: the Controls panel collapses and re-expands; the (i) popover opens, is fully visible and closes on Escape; the single Orchid highlight in each view is the thing that matters; nothing relies on colour alone.
