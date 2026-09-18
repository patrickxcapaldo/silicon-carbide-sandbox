# Orbital Thermal Limits

A back-of-the-envelope calculator and 3D visualisation for whether a given combination of AI compute load, radiator, solar array and orbit is thermally and electrically sustainable on a spacecraft.

For a full explanation of the physics, the 3D scene and how the project was developed, see `HOW_IT_WORKS.md`. The list below is a changelog.

## First pass: visuals and physics corrections

- Removed the misleading blue Earth-to-space circle and beam.
- Replaced static and misaligned ArrowHelpers with dynamically constructed vectors whose shafts and heads share the same start and end points.
- Added a proper Earth-centred orbital path.
- Added orbital altitude, eccentricity, inclination, RAAN, argument of perigee and phase controls, and made the satellite position follow them.
- Gave Earth an orbital-context scale. The spacecraft was intentionally enlarged so that it stayed visible, since a truly physical Earth-to-spacecraft size ratio would make a metre-scale satellite effectively invisible. The second and third passes below replaced this compromise with something better.
- Brightened the scene considerably using ambient, hemisphere and directional lighting, with a more readable Earth and space palette.
- Connected radiator temperature, emissivity, solar absorptivity, space sink, Earth infrared, Earth view factor, albedo, coolant flow, coolant ΔT and parasitic heat to the thermal calculation, so that each now has visible consequences in the telemetry and the visuals.
- Made coolant particles move around a closed loop from the hot side to the radiator and back, with flow rate affecting both the animation and the calculated heat-transport ceiling.
- Made radiator area change the rendered panel dimensions as well as the thermal capacity.
- Separated gross long-wave radiation from external solar and albedo loads and from coolant transport capacity.
- Added warnings for overheating, low coolant transport capacity and high Earth view factor.

## Second pass: controls and interaction

- **Orbit presets.** Five real orbit classes: an ISS-like low Earth orbit, a Sun-synchronous low Earth orbit, a GPS-like medium Earth orbit, geostationary orbit, and a Molniya-type highly elliptical orbit. Each sets altitude, eccentricity, inclination, RAAN and argument of perigee together, and also seeds the Earth view factor from the closed-form nadir-pointing formula `F = (R⊕/(R⊕+h))²` for that altitude. The view factor remains manually adjustable afterwards.
- **Controls panel.** Replaces the old lil-gui panel and is titled simply "Controls".
- **Play, pause and speed.** Speed multipliers run from 1× to 10,000×. Orbital phase advances through a real two-body Kepler propagation, going from mean anomaly to eccentric anomaly by Newton-Raphson and then to true anomaly, so eccentric orbits correctly move quickly at perigee and slowly at apogee rather than at a constant angular rate. The panel shows the true orbital period from Kepler's third law alongside the real time per orbit at the current speed.
- **Coloured, explained status.** A status pill in green, yellow, orange or red for Safe, Margin, At limit and Overheating, with an explanation of what each state means physically and what to do about it.
- **Camera focus and view mode.** Orbit view keeps Earth and the orbital geometry true to scale, with the spacecraft drawn as a small marker that is dynamically sized to a fraction of the real gap between the orbit and Earth's surface, verified safe at every altitude from 160 km to geostationary. Close-up view shows the spacecraft at full component detail with Earth as a schematic backdrop that is explicitly labelled as not to scale. Camera focus, on Earth or on the satellite, is selectable independently in Orbit view.
- **AI compute load.** A new `computeWattsRequested` input, with quick-select buttons for an edge inference module, an H100 SXM-class GPU at 700 W and a GB300-class GPU at about 1,400 W, is compared against the radiator and coolant thermal budget. The derived outputs `computeDeficitW` and `computeUtilization` reflect whether the requested compute load is actually sustainable rather than only reporting the environmental margin.
- **Parameter tooltips.** Every slider has an information button explaining what the parameter means physically, and the orbit and compute presets have their own tooltips with reference figures.

## Third pass: bug fixes and solar arrays

- **Fixed play and pause stalling.** The animation loop was calling the host's `onStateChange` on every frame, roughly 60 times a second and once per state key, and whatever the host did in response was racing the animation. The fix keeps the 60 fps visual phase update local and forwards to the host only a few times a second, plus one authoritative synchronisation the moment playback pauses.
- **Fixed oversized coolant flow markers in Orbit view.** The point size of a `THREE.Points` object is not affected by a parent group's `scale`, although its position is, so the flow dots stayed at full absolute size even when the spacecraft model was shrunk to a non-clipping marker. The point sprites were replaced entirely with a scrolling emissive stripe texture on the tube's own geometry, which inherits scale correctly in both views and reads more clearly as directional flow along the pipe.
- **Added solar arrays**, which were previously missing from both the visuals and the physics:
  - Two deployable array wings, rendered with a cell-grid texture, that rotate on a single-axis drive to track the Sun. `solarPanelPointingFactor` controls tracking accuracy. This is independent of the radiator, which stays body-fixed and is instead oriented through `sunIncidence` to minimise solar loading, making the tension between the two visible and adjustable.
  - New `solarPanelAreaM2`, `solarPanelEfficiency` and `solarPanelPointingFactor` inputs feed a real power-generation calculation, `generatedPowerW = solarFlux × area × efficiency × pointingFactor`.
  - This is compared against `computeWattsRequested + parasiticHeatW`, with the latter now also acting as a rough proxy for non-compute bus electrical draw, producing a second independent constraint in `powerDeficitW` and `powerUtilization` alongside the existing thermal one. The status badge, warnings and telemetry now reflect whichever of heat rejection and power generation is more limiting.
  - Known simplification: this is an instantaneous power balance with no battery or eclipse buffering. During eclipse, when `solarLoadWm2` is near 0, generation drops to approximately 0 immediately, whereas a real spacecraft would run from batteries for a while.

## Fourth pass: sizing, tooltips and scenario presets

- **Fixed radiator and solar array size plateaus.** The panel width and height and the wing length and width formulas each used a hard `Math.min(value, cap)`, duplicated independently across `Radiator.tsx`, `CoolantLoop.tsx` and `SolarPanel.tsx`. Past the cap, dragging the area slider produced no visible change. All of it was consolidated into `visualizer/spacecraftGeometry.ts` using a `tanh`-based smooth cap, which tracks the raw value closely for small areas and approaches a ceiling asymptotically for large ones. The slider always does something visible while the output stays strictly bounded, which is also what allows `ThermalScene` to derive its no-clip safety margin from these shared constants rather than a separately guessed number.
- **Fixed tooltips being cut off or hidden behind the sidebar.** There were two distinct causes. Tooltips anchored to their own button's position with a fixed width overflowed past the sidebar's left edge for buttons not near the right edge. Separately, the status badge's tooltip sits inside the telemetry bar, which has its own `z-index`, and `z-index` only resolves ordering within a shared stacking context, so every descendant of that bar renders behind the sidebar regardless of what `z-index` the descendant declares. Both were fixed by rewriting `InfoTip` to render through a React portal directly into `document.body` with `position: fixed` and computed screen coordinates, centred within the sidebar panel where there is one and clamped to the viewport otherwise.
- Added information buttons to every telemetry bar field, placed next to the label rather than the value, using the same portal-based tooltip.
- **Added full scenario presets** in `visualizer/scenarioPresets.ts`: five complete parameter configurations, every field rather than a partial patch, each run through the model to confirm the stated outcome. They cover a comfortable baseline, an oversized geostationary payload that fails both budgets, two deliberately mirrored cases that isolate a power-only failure and a heat-only failure at the same 900 W request, and an eclipse case that shows the battery-buffering limitation directly.
- **Added an explainer block** in `visualizer/Explainer.tsx` for the host page to render above the visualisation, covering motivation, the two-budget approach, the main parameters and the scenario presets. The scenario list is pulled directly from `scenarioPresets.ts` so that the two cannot drift apart.

## Fifth pass: engineering change request from spacecraft systems engineers

Feedback from spacecraft systems engineers identified five places where the model's assumptions or terminology diverged from real orbital engineering practice. All five were addressed in the kernel and carried through to the descriptor, the tooltips and this documentation, and every scenario preset was re-verified against the corrected physics rather than left as-is.

- **Coolant fluid corrected.** The kernel's specific heat changed from water's 4184 J/kg\u00b7K to 1050 J/kg\u00b7K, representative of a Galden PFPE-class single-phase dielectric fluid, the kind of coolant real spacecraft loops actually use, since water would freeze solid at deep-space eclipse temperatures and poses a short-circuit risk near dense electronics. This roughly quarters the coolant loop's transport capacity for the same flow rate and temperature rise versus the previous default.
- **Earth albedo was already implemented.** On review, the kernel already included the requested `Q_albedo = \u03b1 \u00b7 S_solar \u00b7 A_radiator \u00b7 F_earth \u00b7 a_earth` term with a default albedo of 0.30, correctly subtracted from net radiator capacity. No change was needed here; it is noted so the record is accurate rather than silently skipped.
- **Orbit-averaged power balance for eclipse, genuinely implemented.** This was the substantial addition. A new dependency-free orbital mechanics module (`sandbox/orbitalMechanics.ts`) computes the fraction of an orbit spent in Earth's shadow, using the standard cylindrical-shadow approximation and sampled uniformly in mean anomaly so the result is correctly time-weighted for eccentric orbits. The power budget now checks requested load against `P_generated_avg = P_solar_instantaneous \u00d7 \u03b7_sun`, not the instantaneous full-sun figure, while remaining a pure function with no battery state of charge. This module is shared with the 3D visualisation's own orbital mechanics, removing a previously separate, duplicated implementation of Kepler propagation.
- **Surface terminology corrected.** Documentation and descriptor text no longer describe the radiator coating as a "grey body", since a true grey body requires equal absorptivity and emissivity, which this model does not assume. It is now described as an ideal selective surface, with independent constant solar absorptivity and infrared emissivity, which is both more accurate and standard language for spacecraft thermal coatings.
- **Transport ceiling and parasitic heat reframed.** Documentation now describes the coolant transport figure as the heat the loop can move while keeping the payload under its maximum allowable temperature, rather than as a hard physical wall, and states plainly that parasitic heat covers electronic and resistive bus losses only, not active heaters or power radiated away by an RF payload.

Every scenario preset was re-run against the corrected kernel rather than assumed to still be valid. The coolant change did not alter any preset's outcome, since none of them were transport-limited, but the eclipse averaging changed every LEO scenario's power figures. The original eclipse scenario, which worked by manually setting Solar Flux to 0 W/m\u00b2, was replaced outright: automatic eclipse averaging made its premise redundant; even without touching the flux slider, any orbit with a genuine eclipse fraction now shows reduced average power. Its replacement, "The instantaneous-power trap", demonstrates the more interesting and more honest failure mode the change request was actually pointing at: a load that reads as comfortable Margin if judged against instantaneous full-sun generation alone, but is genuinely unsustainable once averaged correctly over the orbit.

## Thermal model

The core calculation is a first-order engineering model:

`P_compute,max = min(P_rad - P_solar - P_albedo - P_parasitic, mdot * cp * ΔT)`

with radiator exchange approximated by:

`P_rad = εσA[(1-F_E)(T_r^4-T_space^4) + F_E(T_r^4-T_EarthIR^4)]`

This is deliberately not a spacecraft-qualified thermal network. It omits detailed conduction paths, battery state of charge through eclipse, radiator temperature gradients, multi-node spacecraft thermal capacitance, exact Earth view factors derived from geometry, and full wavelength-resolved optical properties beyond the two-band (solar absorptivity, infrared emissivity) selective-surface treatment described above. The orbital eclipse duty cycle itself, unlike battery state of charge, is modelled: see the "Fifth pass" section above.
