# Module Style & UX Reference Standard

The UI, UX and visual standard for every module in the Silicon-Carbide Imperative Sandbox, across **Explore**, **Challenge** and **Play**.

**Source of truth:** the North Star, *Appendix B: Brand and Style* (palette, typography, imagery rules) and *The Sandbox* (page shape, modes, scoping). This document turns those into concrete component rules. Where this guide and the North Star disagree, the North Star wins and this guide is wrong.

**The standard is implemented, not just described.** Everything below is built once in `src/core/ui/` and consumed by modules. A module that uses the kit conforms by construction. `src/core/ui/conformance.test.ts` fails the build if a module reintroduces a retired colour, defines shared class names, omits its realism label, or ships non-Title-Case labels.

---

## 0. Principles

1. **One accent: Orchid `#B97FED`.** It marks selection and the *one* highlighted item in a view: the binding constraint, the higher value, the chosen preset. If everything is Orchid, nothing is.
2. **Thin lines, flat fills.** No gradients, glows, bevels or shadows used for decoration. Floating panels may carry a drop shadow so they separate from the scene.
3. **No decorative motion.** Hover and selection change colour or outline, never size or position. Motion is only for things that move physically (orbits, playback).
4. **Colour is never the only signal.** Selected presets carry a ✓; correct and incorrect answers carry ✓ / ✗; the binding bar carries a text tag.
5. **Status colours mean model status and nothing else** (see §6).
6. **Dark first.** The Explore instrument is always dark so every module reads as the same object whatever the page theme. The page around it follows the visitor's light or dark setting.
7. **British English, Title Case labels, units on every number.** Emoji appear only in share strings.

---

## 1. Tokens

All colours come from tokens in `src/index.css`. Modules never write a hex value in CSS (the conformance test enforces this). Hex values are acceptable only for physical materials inside a 3D scene.

### Brand palette (North Star, Appendix B)

| Token | Value | Use |
|---|---|---|
| `--orchid` / `--accent` | `#B97FED` | The one accent. Fills, outlines, highlights. **Never text on a light surface** (2.9:1). |
| `--ink` | `#0f1117` | Main dark surface; text on a light surface; text on Orchid. |
| `--black` | `#000000` | Deepest backgrounds (the Explore scene). |
| `--slate` | `#475569` | Bonds, borders, gridlines; secondary text on light surfaces only. |
| `--mist` | `#94A3B8` | Secondary text and axes on dark surfaces. |

### Instrument surface (always dark): Explore canvas, panels, overlays

| Token | Value | Use |
|---|---|---|
| `--viz-bg` | Black | Canvas / scene background |
| `--viz-panel` | Ink | Controls panel, popovers |
| `--viz-raised` | `#181a24` | Cards on a panel |
| `--viz-border` | `#2d2f3e` | Hairlines, separators |
| `--viz-border-strong` | Slate | Control outlines, canvas frame |
| `--viz-text` / `--viz-text-2` | `#f9fafb` / Mist | Primary / secondary text |
| `--viz-hover` | `rgba(255,255,255,.06)` | Hover fill |
| `--viz-accent`, `--viz-accent-soft`, `--viz-accent-line` | Orchid, 16%, 55% | Selected outline, selected fill |

### Typography on the instrument

| Token | Size | Use |
|---|---|---|
| `--viz-fs-title` | 13px | Panel title ("Controls") |
| `--viz-fs-body` | 12px | Buttons, section titles, slider values |
| `--viz-fs-small` | 11px | Labels, hints, tips, segmented buttons |
| `--viz-fs-micro` | 10px | Tags, scale ticks, the (i) glyph |

Sans for text, `var(--mono)` (system monospace) for numbers and code. Four sizes only: do not introduce 10.5 / 11.3 / 12.5.

### Text on Orchid: `--on-accent` = Ink

Always `color: var(--on-accent)` on an Orchid fill. White on Orchid is **2.9:1** (fails even large-text AA); Ink on Orchid is **6.6:1**. *This reverses the earlier "always white" rule.* If you ever want white back it is a one-line change to the token, but check the contrast first.

### Status (model status only)

`--status-safe #3ddc84` · `--status-margin #e4d94a` · `--status-limit #ff9d3d` · `--status-fail #ff4d4d`

Use them for model states such as Safe / Margin / Limit / Failed, headroom vs deficit, a validity warning. Do **not** use green/red for "correct/incorrect answer" (Orchid + ✓/✗ does that) or for decoration. The dot carries the colour everywhere; the label text is coloured only on the dark canvas (yellow text on white is unreadable).

### Data series

`--series-1 #e2e8f0` · `--series-2` Mist · `--series-3 #64748b` · `--series-4` Slate: neutral shades for stacked bars, legends and chart lines. Orchid is **never** a series colour; it is the highlight laid over them.

---

## 2. Page Frame & Structure

Every module page, in this order:

```
<ModulePageFrame manifest={manifest}>   header: title, summary, scope, badges
  <Explainer />                         the chapter (<Chapter> from the kit)
  <ModuleModes explore challenge play />
</ModulePageFrame>
```

- **Header** (`ModulePageFrame`): title, divider, badges, summary (max ~780px). Do not repeat the title or breadcrumbs anywhere inside.
- **Badges** are flat and neutral. Colour encodes nothing on a badge; only *clickable* badges (interfaces to other modules) get an Orchid edge. Row 1 shows module, contract and **`realism`**.
- **Realism label (required):** `manifest.realism` is exactly one of **Sketch / Estimate / Detailed**. `manifest.scope` is one sentence stating what the model covers, assumes and ignores. Both render in the header on every module.
- **Chapter** (`<Chapter>`), always in this order: the question → concepts → equations → worked example → what this does not capture. Centred, max ~780px, equations via `<Equation>`, secondary working inside `<Working>`.
- **Mode switcher** (`<ModuleModes>`) sits between the chapter and the tool, provides the `#module-tool` anchor, keeps Challenge and Play mounted (hidden) so a run survives switching modes, and shows a standard "not built yet" notice for any missing mode.

---

## 3. Explore Mode

The interactive playground. Everything here is in `src/core/ui`.

### Canvas: `ExploreCanvas`

- A `<section>` 760px tall (min 600px), `border-radius: 16px`, 1px Slate border, `--viz-bg` background, standard shadow.
- Returns a fragment: the canvas, then any below-canvas panels as siblings.
- 3D modules put a React Three Fiber `<Canvas>` and `<Overlay>`s inside it. 2D modules put an `<ExploreMain>` (tabs, readouts, a chart) inside it; it reserves room for the Controls panel and reclaims it when collapsed.

### Controls panel: `ControlsPanel`

- Anchored top/right/bottom 16px, **300px** wide, titled exactly **"Controls"**, Ink background.
- **Export** (primary, Orchid fill) and **Reset** (secondary, outlined) live in the header row, with a **▶ / ▼ chevron** (collapsed / expanded) collapsing the panel to that row. Export always downloads the run record via `downloadRunRecord`.
- Groups use `Section` (collapsible, Title Case titles). Small labelled groups use `Group`. Never ALL-CAPS.
- On a phone (≤680px) the panel spans the width and starts collapsed.

### Interaction grammar (identical for every control)

| State | Treatment |
|---|---|
| Rest | Neutral outline, Mist text |
| Hover | Brighter text, faint fill, stronger outline. **No movement.** |
| Selected | Orchid outline + soft Orchid fill + semibold (+ leading ✓ on presets) |
| Focus | 2px Orchid ring, 2px offset |
| Disabled | 45% opacity, `not-allowed`, with a `title` saying why |

### Components

| Component | Rule |
|---|---|
| Buttons (`.sci-btn`) | Height **32px** (`minHeight` 32, `box-sizing: border-box`), centred, 12px semibold. Primary = Orchid + `--on-accent`. Icon-size = 32×32. |
| `SegButton` / `SegRow` | Binary/ternary toggles (Orbit \| Close-up, Off \| On, tabs, speed). |
| `PresetButton` / `PresetRow` | Left-aligned, ✓ prefix when active. `active` must be true only on an exact state match, so at most one is highlighted per list. A row may carry an (i) explaining the preset. |
| `ParamSlider` / `SliderField` | Label + (i) left, value right (mono, tabular), 4px track, Mist fill, white thumb that turns Orchid on hover/drag/focus. `ParamMeta.logScale` for ranges spanning orders of magnitude. |
| `ToggleField` | An Off/On parameter with the same label row as a slider. |
| `InfoTip` (i) | 16px circle, neutral at rest, Orchid outline on hover and when open. Click or Enter/Space toggles, **Escape or outside click closes**. The popover is portalled to `<body>`, so a scrolling panel never clips it. Always give an `aria-label` (`About <control>`). |
| `OrbitPlayback` | Play/pause, speed multiplier, period, progress. Identical in every orbital module. |

### Overlays and telemetry: `Overlay`, `MetricGrid`, `Metric`

- Floating over the canvas, always collapsible (native `<details open>`) so the scene can be seen unobstructed. Intro: top-left, max 260px. Telemetry: along the bottom, auto-fit grid of 105px+ cards, widening when Controls collapses.
- A `Metric` is label (+ optional (i)), mono value **with units**, optional note. `status` colours the value with a status colour; `highlight` outlines the one card that applies right now.
- `StatusBadge` for a model's overall state.

### Below-canvas details: `DetailsPanel`

Any expanded breakdown (compute ceilings, loss bars, full results) lives **outside and below** the canvas as a sibling `<details open>` and follows the **page** theme. Use `ValueBars` for comparisons and `StackedBar` for budgets: neutral bars, **the single binding / dominant item in Orchid**, flagged in words ("lowest ceiling", "dominant loss").

---

## 4. Challenge and Play

Both use shared shells and one stylesheet (`core/challenge/challenge.css`, `core/play/play.css`). **Modules never ship their own `.challenge-*` or `.play-*` CSS**: a global class defined twice makes one module silently restyle another depending on bundle order (this happened with orbital and solar).

- **Challenge** (`ChallengeShell`): levels, answer options, hint ladder, reveal spec cards. Correct answer = Orchid outline + ✓; wrong pick = dashed outline + ✗. Reveal bars are `ValueBars` (Orchid binding bar).
- **Play** ("Higher or Lower", `PlayShell`): the header reads **"Higher or Lower"**, never "<Module>: Play". The reveal draws relative log-scale bars with a single Orchid accent on the higher value and explicit ✓ / ✗ text marks.
- Buttons on these page-level screens keep 44px minimum touch targets (larger than the 32px instrument buttons).

---

## 5. 3D Scene Conventions

Shared constants live in `SCENE` (`core/ui/sceneTheme.ts`). Import them; do not retype them.

- Background `SCENE.background` (Black). Stars `SCENE.stars` (2200, factor 3.5, saturation 0.2, fade, speed 0.3).
- Lighting: ambient 0.5, hemisphere 0.9, directional `#fff1cf`. The light, the terminator, the shadow and any Sun-direction indicator must all use the **same** sun vector (`SUN_DIRECTION`); shadow geometry casts along `-SUN_DIRECTION`.
- Earth `#1a4f80`, emissive 0.25; atmosphere `#61bcff` at 0.07.
- Orbit track: **bright where sunlit (`#e2e8f0`), dim Slate (`#64748b`) inside the shadow**, line width 1.4, opacity 0.65. Neutral on purpose: red and Orchid are not scene colours.
- `OrbitControls` with `enableDamping`, `dampingFactor` 0.07.
- Standard Controls: **View** (Orbit \| Close-up) then **Camera Focus** (Earth \| Satellite \| ...).
- Physical materials and *domain colour ramps* (a cell-temperature map, a thermal gradient on a radiator) may use any colours, because they depict physics, not interface. Interface chrome around the scene may not.

---

## 6. Typography & Nomenclature Checklist

| Item | Standard | Avoid |
|---|---|---|
| Main tweak panel | `Controls` | `Parameters & Orbits`, `Settings` |
| Preset list | `Scenario Presets` (and `Orbit Presets`) | `Mission Presets`, `Presets & Scenarios` |
| JSON export button | `Export` | `Export JSON`, `Download JSON` |
| Reset button | `Reset` | `Restore`, `Defaults` |
| Collapse button | `▶` collapsed / `▼` expanded | `+` / `−`, `Collapse` / `Expand` |
| Text on Orchid | `var(--on-accent)` (Ink) | white, black hex |
| Headings and slider labels | Title Case | ALL-CAPS, camelCase (acronyms such as RAAN are fine) |
| Play header | `Higher or Lower` | `<Module Name>: Play` |
| Section separators | Thin `--viz-border` hairline | Heavy borders, background-colour changes |
| Binding constraint | Orchid bar + text tag | Green bar, glow |
| Answer correctness | Orchid + ✓ / dashed + ✗ | Green / red |
| Spelling | British (colour, utilisation, characterise) | American |
| Symbols ▶ ⏸ | Followed by `\uFE0E` (text presentation) | Bare, which can render as a colour emoji |
| Emoji | Share strings only | Anywhere else |

---

## 7. Decisions that replaced the earlier version of this guide

Recorded so they are not quietly reverted.

1. **Sky blue `#4fb3ff` accent removed.** The North Star allows one accent. Selected states, presets, chevrons and the (i) now use Orchid.
2. **Text on Orchid is Ink, not white.** 6.6:1 vs 2.9:1. Core Challenge buttons and the home CTA already did this; only Explore's Export did not.
3. **The "binding" highlight is Orchid, not green.** Green is a status colour. Orbital's reveal also coloured *every* bar Orchid and the binding one green with a glow; now neutral bars with one Orchid bar.
4. **"Mission Presets" is "Scenario Presets".** One name across modules.
5. **ModeToggle sits between the chapter and the tool,** not in the header (the previous version of this guide said both; the code and the authoring guide did the former).
6. **Eclipse arc is dim Slate, not `#f43f5e`.** Red is status-only.
7. **Slider tracks are always dark inside the instrument.** They previously inherited the page theme, giving light-grey tracks on a dark panel in light mode.
8. **Orchid is never link text on a light page.** Links are Ink with an Orchid underline in light mode, Orchid in dark mode (`--link`).
