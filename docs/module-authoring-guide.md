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

Do not recreate the outer frame or module header in a custom view. Put only module-specific content inside `ModulePageFrame` so its spacing and alignment remain consistent.

## Starter files

The `_template` directory is excluded from the module registry. Use its manifest, model, and equation files as starting points. Copy `_template/View.tsx` only when choosing a custom view; standard modules should omit it and use `ModuleShell`. Replace the example manifest values before registering a new module.

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
