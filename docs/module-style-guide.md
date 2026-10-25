# Module Style & UX Reference Standard

This document establishes the UI, UX, and visual standards for all interactive modules in the Silicon-Carbide Imperative sandbox across **Explore**, **Challenge**, and **Play** modes.

The goal is consistency and continuity without over-constraining the unique domain visualizations of each module.

---

## 1. Page Frame & Header

- **Frame**: All module views must be wrapped in `ModulePageFrame` (`src/core/ModulePageFrame.tsx`).
- **Header**: Contains the module title, categorization badges, concise prose summary (max width ~780px), and `ModeToggle` (`Explore`, `Challenge`, `Play`).
- **Do not** replicate the module title or breadcrumbs inside sub-views or modes.

---

## 2. Mode Conventions

### Explore Mode
The interactive playground where learners freely tweak parameters and observe 3D/graphical consequences.
- **Canvas / Viewport**: Centered container with fixed/responsive height (`~760px` or `75vh`), rounded corners (`12px-16px`), subtle border (`rgba(150,190,220,0.28)`), and deep space background (`#040b16` to `#07111e`).
- **Controls Panel**:
  - **Location**: Anchored to the top-right of the viewport (or top-left if domain layout strictly necessitates, but keep standard modules aligned).
  - **Title**: Always labeled **"Controls"** (avoid ad-hoc names like "Parameters & Orbits").
  - **Casing**: Title Case or Sentence Case for section titles (e.g., "Mission Presets", "Photovoltaic Array"). Avoid raw uppercase (`text-transform: uppercase`).
  - **Collapsibility**: The Controls panel must have a collapse toggle (using standard `−` and `+` or chevron).
- **Secondary Overlays (Telemetric / Budget Breakdown)**:
  - Positioned non-destructively over the canvas (e.g., top-left for view mode switches / intro, bottom for breakdown bars / telemetry cards).
  - Must be **collapsible** (using native `<details open>` or a minimize button) so users can view the unobstructed 3D scene.
- **Actions & Buttons**:
  - **Naming**: Use direct action verbs (`Export`, `Reset`, `Play`). Use `Export` instead of `Export JSON`.
  - **Theme Colors & Contrast**:
    - Primary accent: Orchid (`#a855f7` or `var(--accent)`).
    - **Contrast Rule**: Any button or badge using the orchid background **must use white text (`#ffffff`)** for accessibility and readability.
    - Secondary buttons: Subtle transparent borders (`rgba(255,255,255,0.2)`) with light blue or white text.

### Challenge Mode
Deterministic problem-solving mode using `ChallengeShell` (`src/core/challenge/`).
- Follows the established levels, answer options, hint ladder, and reveal spec cards.
- Layout remains standard across all challenge implementations.

### Play Mode ("Higher or Lower")
Fast-paced intuition builder using `PlayShell` (`src/core/play/`).
- **Header**: Header displays the game name **"Higher or Lower"** rather than repeating the full module title.
- **Logarithmic Bars**: Reveal view must render relative log-scale bars with a single Orchid accent indicating the higher value, plus explicit textual marks (`✓` / `✗`).

---

## 3. 3D Visualizer & Scene Conventions

For modules featuring orbital or space scenes with Three.js / React Three Fiber:
- **Environment**:
  - Deep space background (`#040b16` to `#07111e`).
  - Starfield: `<Stars>` with sufficient density and brightness (e.g., count ~2000, factor 3–4, saturation 0.2) so stars are clearly visible behind orbit tracks.
- **Lighting & Sun Alignment**:
  - The directional sunlight light source must align with the physical sun vector (`SUN_DIRECTION` or `DEFAULT_SUN_DIRECTION`).
  - Earth terminator and shadow geometry (e.g. shadow cylinders or projections) must cast along `-SUN_DIRECTION`.
  - Any visual vector indicators (e.g. yellow beam / arrow showing the incoming Sun direction) must point along the same vector as the actual directional light source.
- **Earth Rendering**:
  - Earth sphere with realistic atmospheric limb / glow shader.
  - Orbit tracks rendered with clean, high-contrast lines indicating lit vs. eclipse/shadow phases (e.g., cyan/light-blue for lit, rose/crimson for eclipse).
- **Camera Controls**:
  - Orbit controls with smooth damping (`enableDamping`, `dampingFactor: 0.07`).
  - Standard view toggles: "Orbit Scale" and "Close-up".

---

## 4. Typography & Nomenclature Checklist

| Item | Standard Convention | Avoid |
|---|---|---|
| Main tweak panel | `Controls` | `Parameters & Orbits`, `Settings` |
| JSON export button | `Export` | `Export JSON`, `Download JSON` |
| Collapse button | `−` (minimize) / `+` (expand) or `<details>` | Wordy text like `Collapse` / `Expand` |
| Orchid button text | Always white text (`#ffffff`) | Black text (`#000000` / `#040d1a`) |
| Headings casing | Title Case / Sentence case (`Mission Presets`) | ALL-CAPS (`MISSION PRESETS`) |
| Play mode header | `Higher or Lower` | `<Module Name>: Play` |
