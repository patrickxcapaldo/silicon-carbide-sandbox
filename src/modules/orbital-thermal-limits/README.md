# Orbital Thermal Limits — reworked drop-in

This version addresses the visual and physics issues in the previous iteration.

## What changed

- Removed the misleading blue Earth-to-space circle/beam.
- Replaced static/misaligned ArrowHelpers with dynamically constructed vectors whose shafts and heads share the same start/end points.
- Added a proper Earth-centred orbital path.
- Added orbital altitude, eccentricity, inclination, RAAN, argument of perigee and phase controls.
- Satellite position now moves with those orbital parameters.
- Earth uses an orbital-context scale. The spacecraft is intentionally enlarged so it remains visible; a truly physical Earth-to-spacecraft size ratio would make a metre-scale satellite effectively invisible.
- Brightened the scene substantially with ambient + hemisphere + directional illumination and a readable Earth/space palette.
- Radiator temperature, emissivity, solar absorptivity, space sink, Earth IR, Earth view factor, albedo, coolant flow, coolant ΔT and parasitic heat all now feed the thermal calculation and have visible consequences in the telemetry/visuals.
- Coolant particles now move around a closed hot-side-to-radiator-to-return loop; flow rate changes their transport animation and the calculated heat-transport ceiling.
- Radiator area changes the rendered panel dimensions as well as the thermal capacity.
- Thermal capacity now distinguishes gross long-wave radiation from external solar/albedo loads and coolant transport capacity.
- Added warnings for overheating, low coolant transport capacity, and high Earth view factor.

## Second pass (control/UX rework)

- **Orbit presets**: five real orbit classes (LEO/ISS-like, Sun-synchronous LEO, MEO/GPS-like, GEO, Molniya-type HEO) that set altitude, eccentricity, inclination, RAAN and argument of perigee together. Selecting a preset also seeds the Earth View Factor from the closed-form nadir-pointing formula `F = (R⊕/(R⊕+h))²` for that altitude (still manually adjustable).
- **Controls panel** replaces the old lil-gui panel and is just titled "Controls".
- **Play/pause + speed (1×–10,000×)**: the orbital phase now advances via a real two-body Kepler propagation (mean anomaly → eccentric anomaly via Newton-Raphson → true anomaly), so eccentric orbits correctly move fast at perigee and slow at apogee, not at a constant angular rate. The panel shows the true orbital period (Kepler's third law) and the real-time-per-orbit at the current speed.
- **Status is now colored and explained**: a status pill (green/yellow/orange/red for Safe/Margin/At limit/Overheating) with a tap-to-open explanation of what that state physically means and what to do about it.
- **Camera focus + view mode**: "Orbit" view keeps true-to-scale Earth/orbit geometry with the spacecraft drawn as a small non-clipping marker (dynamically sized to a fraction of the real gap between the orbit and Earth's surface, verified safe at every altitude from 160 km to GEO); "Close-up" view shows the spacecraft at full component detail with Earth as a schematic, explicitly-labeled-as-not-to-scale backdrop. Camera focus (Earth vs. satellite) is selectable independently in Orbit view.
- **AI compute load**: a new `computeWattsRequested` input (with quick-select buttons for representative modules — an edge inference module, an H100 SXM-class GPU at 700 W, a GB300-class GPU at ~1,400 W) is compared against the radiator/coolant thermal budget. The status/derived outputs (`computeDeficitW`, `computeUtilization`) now reflect whether the *requested* compute load is actually thermally sustainable, not just the environmental margin.
- **Info tooltips**: every slider has a tap-to-open "i" tooltip explaining what the parameter means physically, and orbit presets/compute presets have their own tooltips with reference figures.

### Known simplifications (unchanged / still worth knowing)
- Earth View Factor is still a single free parameter, not derived from radiator geometry/pointing during flight — only the *preset default* uses the nadir-pointing formula above.
- No eclipse transients, multi-node thermal capacitance, or conduction paths; this remains a steady-state, first-order model intended for back-of-the-envelope estimates.
- The coolant loop is treated as a single generic (water-like specific heat) sensible-heat transport; no two-phase or pump-power modeling.

## Third pass (bug fixes + solar arrays)

- **Fixed play/pause randomly stalling**: the animation loop was calling the host's `onStateChange`/`onChange` on every single frame (~60/sec, once per state key). Whatever the host does in response to that callback was racing the animation. Fixed by keeping the 60fps visual phase update local, and only forwarding to the host a few times a second (plus one authoritative sync the moment playback pauses).
- **Fixed oversized/misshapen coolant flow markers in Orbit view**: `THREE.Points` size is not affected by a parent group's `scale` (only point *position* is), so the flow dots stayed at full absolute size even when the spacecraft model was shrunk down to a non-clipping marker. Replaced the point-sprite particles entirely with a scrolling emissive stripe texture on the tube's own geometry/UVs — it inherits scale correctly in both views and reads more clearly as directional flow along the pipe.
- **Added solar arrays**, previously missing from both the visual and the physics:
  - Two deployable array wings, rendered with a cell-grid texture, that rotate on a single-axis drive to track the Sun (`solarPanelPointingFactor` controls tracking accuracy) — independent of the radiator, which stays body-fixed and is instead oriented via `sunIncidence` to *minimize* solar loading. This makes the "panels face the Sun, radiators are edge-on to it" tension the user asked about visible and adjustable.
  - New `solarPanelAreaM2`, `solarPanelEfficiency`, `solarPanelPointingFactor` inputs feed a real power-generation calculation: `generatedPowerW = solarFlux × area × efficiency × pointingFactor`.
  - This is compared against `computeWattsRequested + parasiticHeatW` (the latter now doing double duty as a rough proxy for non-compute bus electrical draw) to produce a second, independent constraint: `powerDeficitW`/`powerUtilization`, alongside the existing thermal one. The status badge, warnings, and telemetry now reflect whichever of the two (heat rejection or power generation) is more limiting.
  - Known simplification: this is an instantaneous power balance with no battery/eclipse buffering modeled — during eclipse (`solarLoadWm2` near 0) generation drops to ~0 immediately, whereas a real spacecraft would run off batteries for a while.

## Thermal model

The core calculation is a first-order engineering model:

`P_compute,max = min(P_rad - P_solar - P_albedo - P_parasitic, mdot * cp * ΔT)`

with radiator exchange approximated by:

`P_rad = εσA[(1-F_E)(T_r^4-T_space^4) + F_E(T_r^4-T_EarthIR^4)]`

This is deliberately not a spacecraft-qualified thermal network. It omits detailed conduction paths, eclipse transients, radiator temperature gradients, multi-node spacecraft thermal capacitance, exact Earth view factors from geometry, and wavelength-dependent optical properties.
