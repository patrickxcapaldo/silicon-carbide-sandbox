# Module Authoring Guide

## Choose a page type

Use the generic `ModuleShell` for the standard parameter-and-results page. A module only needs a manifest and model; do not add a custom `View.tsx` unless its interaction or visualization needs a different presentation.

Add a custom view when the module needs a specialized interface, such as an interactive scene. A custom view receives `inputs`, `onChange`, and `results`, and should use `ModulePageFrame` for its page frame and manifest header.

## Shared layout

`ModulePageFrame` is the shared layout contract for module pages:

- The page content uses a centered frame capped at 1200px with standard horizontal padding.
- The title, divider, and module badges span the frame width and align with the body content.
- The summary remains capped at 780px for readable line lengths.
- Keep body content within the frame. Constrain prose-heavy sections to about 780px and center them; visualizations may use the available frame width.

Do not recreate the outer frame or module header in a custom view. Put only module-specific content inside `ModulePageFrame` so its spacing and alignment remain consistent. For visual styling, controls positioning, collapsing affordances, and scene standards, see the [Module Style & UX Reference Standard](module-style-guide.md).

## Starter files

The `_template` directory is excluded from the module registry. Use its manifest, model, and equation files as starting points. Copy `_template/View.tsx` only when choosing a custom view; standard modules should omit it and use `ModuleShell`. Replace the example manifest values before registering a new module.

## Explore-mode visualizer pattern

When a module has a full 3D or interactive Explore view (rather than the simple `ModuleShell` parameter grid), follow this structure — see `orbital-thermal-limits/visualizer/` as the reference implementation:

`
src/modules/<id>/visualizer/
  paramMeta.ts          – PARAM_META record: label (Title Case), unit, min, max, step, description
  types.ts              – SomeState type (all physics inputs)
  ControlPanel.tsx      – Right-side collapsible controls panel (chevron toggle, Section/PresetButton/SegButton helpers)
  SomeVisualizer.tsx    – Top-level: state, clock, derived physics, returns <> fragment (canvas section + below-canvas details)
  SomeScene.tsx         – React Three Fiber scene (Earth, orbit track, lights, Stars, OrbitControls)
  useOrbitClock.ts      – Orbit animation clock hook
  InfoTip.tsx           – Inline tooltip (i) with PanelBoundsProvider
  ParamSlider.tsx       – Labelled slider with InfoTip, optional disabledHint
  scenarioPresets.ts    – SCENARIO_PRESETS with id, label, description, patch
  orbitPresets.ts       – ORBIT_PRESETS with id, label, altitudeKm, eccentricity, inclinationDeg, raanDeg, …
  Explainer.css         – Module-specific overlay/telemetry CSS (.{id}-overlay, .{id}-intro, .{id}-telemetry, .{id}-losses patterns)
`

Key conventions:
- `SomeVisualizer` returns a `<>` fragment: first child is the `<section>` containing the Canvas + overlays; second child is a sibling `<details open>` for any below-canvas breakdown bars.
- `ControlPanel` always renders the title "Controls" and uses the triangle-right/triangle-down chevron collapse button.
- All button heights: `height: 32, minHeight: 32, boxSizing: 'border-box'`.
- Panel colours: background `#0b1726`, text `#eaf6ff`, accent `#4fb3ff`.
- Slider labels in `paramMeta.ts` must use Title Case.
- For visual and colour standards see [Module Style & UX Reference Standard](module-style-guide.md).

## Challenge mode

Use the shared client-side challenge shell when a module can define a finite question set and evaluate answers deterministically. The framework lives in `src/core/challenge/`: `ChallengeShell` owns setup, the round loop, hints, timing, scoring and sharing; `ModeToggle` selects between the module's normal tool and its challenge; `rng.ts` supplies short, replayable seeds; and `generator.ts` performs bounded random-level selection.

A module provides one `ChallengeDefinition<Inputs>`:

- `id`, `title`, `versionInfo`, and a fixed-order list of answer options.
- `classicLevels` with complete module input objects, lesson copy, difficulty and archetype tags.
- `generate(rng, difficulty, context)` for deterministic randomized levels. Round varied inputs to the same precision shown on the spec card before evaluation; reject invalid diagnostics and levels outside the requested difficulty band.
- `evaluate(inputs)`, which must call the module's deterministic kernel and return the answer, each option's numeric ceiling, status, diagnostics and any module-specific detail needed by the reveal or hints. Do not duplicate physical or domain calculations in the UI.
- `hints`, plus module-specific `SpecCard`, `Reveal` and `Formulas` components. Hints must derive all numeric working from the same evaluation.
- Fixed time limits for each random difficulty.

Keep module-specific level archetypes, formulas, cards, reveal copy and domain rendering in the module directory. Keep generic run mechanics in `src/core/challenge/`. Add a small shared `ModeToggle` immediately between the module's explanatory content and its selected tool, and keep the challenge component mounted while switching modes if a run must survive mode changes. A Challenge requires a pure, deterministic kernel `evaluate()`; without one, seeded replay and answer verification are not reliable.

## Play mode ("Higher or lower")

Use the shared client-side play shell when learners can build intuition by guessing which of two single-parameter perturbations produces a higher resulting metric. The framework lives in `src/core/play/`: `PlayShell` manages setup, the 10-round comparison loop, interactive options, log-scale reveal bars, reason generation, scoring and share strings; `generator.ts` seeds deterministic 10-round runs matching difficulty ratio bands; `levers.ts` builds perturbations; and `reason.ts` constructs explanations.

A module provides one `PlayDefinition<Inputs>`:

- `id`, `title`, `versionInfo`, `metricLabel`, `format(value)`, and `intro`.
- `scenarios`: baseline input states (reusing the module's existing Challenge levels).
- `levers`: an array of parameter perturbations that can be applied to baselines, with human-readable change summaries and physical lesson copy.
- `metric(inputs)`: evaluates inputs against the module kernel and returns the primary numeric comparison metric.
- `order(val)`: sorting function (defaults to higher-is-better).

Keep module levers, metric mapping, and baselines in `src/modules/<module-id>/play/definition.ts`. Mount `PlayGame` alongside `ChallengeGame` in `View.tsx` controlled by `ModeToggle`. All Play runs require a deterministic kernel `metric()` evaluation.
