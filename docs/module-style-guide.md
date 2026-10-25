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

#### Canvas / Viewport
- Centered `<section>` container with fixed height (`760px`, `minHeight: 600px`), rounded corners (`borderRadius: 16px`), subtle border (`rgba(150,190,220,0.28)`), and deep space background (`#07111e`).
- Box shadow: `0 18px 50px rgba(0,0,0,.28)`.
- The visualizer returns a `<>` fragment: `<section>` (the canvas + overlays) followed by any below-canvas details panels.

#### Controls Panel
- **Location**: Anchored `position: absolute; top: 16px; right: 16px; bottom: 16px` inside the canvas section when expanded.
- **Width**: `300px` fixed.
- **Title**: Always labeled **"Controls"** (avoid ad-hoc names like "Parameters & Orbits").
- **Casing**: Title Case for all section titles (e.g., `"Mission Presets"`, `"Photovoltaic Array"`, `"Orbit"`). Never ALL-CAPS.
- **Slider labels**: Title Case (e.g., `"Perigee Altitude"`, `"Cell Efficiency (STC)"`).
- **Collapsibility**: The Controls panel must have a **`▶` / `▼` chevron** toggle button (collapsed = `▶`, expanded = `▼`). When collapsed the panel shrinks to show only the header row.
- **Colours**: Panel background `#0b1726`, body text `#eaf6ff`, section labels `#9fb7c9`, accent `#4fb3ff`.

#### Buttons (in Controls panel)
- **Export** (primary action): height `32px`, `minHeight: 32px`, `boxSizing: border-box`, background `var(--accent)` (Orchid `#a855f7`), text `#ffffff`.
- **Reset** (secondary action): height `32px`, `minHeight: 32px`, `boxSizing: border-box`, transparent background, `rgba(255,255,255,.2)` border, text `#cbd9e8`.
- **Playback / Collapse** (icon-size): `width: 32px; height: 32px`, same box-sizing rules.
- All buttons: `display: inline-flex; alignItems: center; justifyContent: center`.

#### Segmented Buttons (SegButton)
Used for binary/ternary toggles (e.g. Orbit / Close-up view, Camera Focus).
- Active: `border: 1px solid #4fb3ff`, `background: rgba(79,179,255,.22)`, text `#eaf6ff`, `fontWeight: 600`.
- Inactive: `border: 1px solid rgba(255,255,255,.18)`, transparent background, text `#9fb7c9`.

#### Preset Buttons (PresetButton)
Used for scenario and orbit preset lists.
- Active: `border: 1px solid #4fb3ff`, `background: rgba(79,179,255,.28)`, text `#ffffff`, `fontWeight: 700`, glow ring `0 0 0 1px rgba(79,179,255,.35)`.
- Inactive: `border: 1px solid rgba(255,255,255,.2)`, `background: rgba(79,179,255,.08)`, text `#dff1ff`.
- Always left-aligned; show a `✓` checkmark prefix when active.

#### Secondary Overlays (Telemetric / Intro)
- Positioned non-destructively over the canvas (top-left for intro / view-mode toggles, bottom for telemetry cards).
- Must be **collapsible** (use native `<details open>` with a styled `<summary>`) so users can see the unobstructed 3D scene.
- Overlay CSS class: `{module}-overlay` — background `rgba(8,18,31,.88)`, border `1px solid rgba(160,205,235,.25)`, `backdrop-filter: blur(8px)`, text `#eaf6ff`, `font-size: 12px`.
- Intro panel: `.{module}-intro`, top-left corner, `max-width: 260px`.
- Telemetry panel: `.{module}-telemetry`, bottom-left to right edge of controls panel; grid of metric cards using `grid-template-columns: repeat(auto-fit, minmax(105px, 1fr))`.

#### Below-Canvas Details (Ceilings / Loss Bars)
- Any expanded breakdown panel (compute ceilings, power loss bars, etc.) lives **outside and below** the canvas `<section>`, as a sibling `<details open>` element in the fragment.
- Use `className="challenge-explorer-limits {module}-losses"` (or `{module}-ceilings`) so it gets the shared explorer styling as well as module-specific CSS.

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

### Environment
- Deep space background (`#040b16` to `#07111e`).
- Starfield: `<Stars>` with `count={2200}`, `factor={3.5}`, `saturation={0.2}`, `fade`, `speed={0.3}` so stars are clearly visible behind orbit tracks without overwhelming the scene.

### Lighting & Sun Alignment
- The directional sunlight source must align with the physical sun vector (`SUN_DIRECTION` or `DEFAULT_SUN_DIRECTION`).
- Earth terminator and shadow geometry must cast along `-SUN_DIRECTION`.
- Any visual vector indicators (e.g. amber beam showing the incoming Sun direction) must point along the same vector as the actual directional light source.
- Ambient light: `intensity={0.5}`; hemisphere light: `intensity={0.9}`; directional light color: `"#fff1cf"`.

### Earth Rendering
- Earth sphere colour: `#1a4f80` with `emissiveIntensity={0.25}`.
- Atmosphere / limb glow: `#61bcff` at `opacity={0.07}`.
- Orbit tracks: `#7ecfff` (sunlit arc) and `#f43f5e` (eclipse arc), `lineWidth={1.4}`, `opacity={0.65}`.

### Camera Controls
- `OrbitControls` with `enableDamping`, `dampingFactor={0.07}`.
- Standard view toggles in the Controls panel: **"Orbit"** and **"Close-up"** (SegButton pair).
- Camera Focus control (SegButton) below view toggle: e.g., `"Earth"` / `"Satellite"` / `"Radiator"`.

---

## 4. Typography & Nomenclature Checklist

| Item | Standard Convention | Avoid |
|---|---|---|
| Main tweak panel | `Controls` | `Parameters & Orbits`, `Settings` |
| JSON export button | `Export` | `Export JSON`, `Download JSON` |
| Collapse/expand button | `▶` (collapsed) / `▼` (expanded) chevron | `+` / `−`, wordy text like `Collapse` / `Expand` |
| Orchid button text | Always white text (`#ffffff`) | Black text (`#000000` / `#040d1a`) |
| Headings & slider labels | Title Case (`Mission Presets`, `Perigee Altitude`) | ALL-CAPS (`MISSION PRESETS`), camelCase (`perigeeAltitude`) |
| Play mode header | `Higher or Lower` | `<Module Name>: Play` |
| Section separators | Thin `rgba(255,255,255,.12)` horizontal rule | Heavy borders or background colour changes |
