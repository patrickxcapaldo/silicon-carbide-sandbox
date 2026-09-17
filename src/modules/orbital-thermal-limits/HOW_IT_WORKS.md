# How this works

This document explains the orbital thermal and power visualisation from end to end, covering the physics it models, the assumptions built into it, how the 3D scene is constructed, and how it was developed. It is written for whoever picks the project up next.

## 1. What the tool calculates

At its core this is a steady-state energy balance for a spacecraft radiator, together with a separate steady-state electrical power balance for a solar array. Steady-state means it answers the question of whether the numbers would work out if conditions stayed exactly as they are indefinitely. It does not simulate temperature changing over time, thermal mass, or batteries charging and discharging. That is a real limitation, and section 5 covers it in more detail.

### 1.1 The thermal balance

The radiator rejects heat by radiating it to its surroundings. The core equation, implemented in `model.ts`, is:

```
radiativeRejectionW = ε · σ · A · [ (1 − F) · (Tr⁴ − Ts⁴) + F · (Tr⁴ − Te⁴) ]
```

The terms are:

- `ε` is the radiator's infrared emissivity, between 0 and 1.
- `σ` is the Stefan-Boltzmann constant, 5.670374419×10⁻⁸ W/m²K⁴.
- `A` is the total radiator area.
- `Tr` is the radiator's own temperature in Kelvin.
- `F` is the Earth view factor, meaning the fraction of the radiator's field of view occupied by Earth rather than deep space.
- `Ts` is the effective deep-space sink temperature. It is not literally 2.7 K, because a real radiator also sees warm structure and other spacecraft surfaces.
- `Te` is Earth's effective infrared temperature, roughly 255 K on average.

The equation says that the radiator radiates against two different backgrounds: a cold deep-space background for the fraction of its view that is not Earth, and a much warmer Earth background for the remainder. Splitting the calculation this way is the one piece of genuine orbital thermal engineering in the model.

The radiator also absorbs external heat:

```
absorbedSolarW  = α · solarFlux · A · sunIncidence
absorbedAlbedoW = α · solarFlux · A · sunIncidence · albedo · F
absorbedEarthIrW = ε · σ · A · F · Te⁴   (already inside the equation above, not double-counted)
```

Here `α` is solar absorptivity and `sunIncidence` is a factor between 0 and 1 standing in for the angle between the radiator's surface normal and the Sun. At 1 the Sun strikes the radiator face-on, which is the worst case, and at 0 the sunlight is edge-on or blocked. The `albedo` term is Earth's reflectivity, globally about 0.3.

Net capacity is then:

```
netRadiatorCapacityW = radiativeRejectionW − absorbedSolarW − absorbedAlbedoW − parasiticHeatW
```

There is a second, independent limit, because the coolant loop has to physically carry that heat from the compute payload to the radiator. This is modelled as a simple sensible-heat transport ceiling:

```
transportCapacityW = flowRateKgS · cp · coolantDeltaT
```

using a fixed, generic coolant specific heat of `cp = 4180 J/kg·K`, which is water-like. This is a deliberate simplification rather than a real spacecraft coolant such as Galden or ammonia.

The maximum sustainable compute heat is whichever of the two limits is smaller:

```
maxTdpWatts = max(0, min(netRadiatorCapacityW, transportCapacityW))
```

and the requested compute load is checked against it:

```
computeDeficitW = computeWattsRequested − maxTdpWatts
```

If this value is positive, the spacecraft cannot shed heat as fast as the compute generates it, and in reality temperatures would climb until something broke or throttled. The tool does not simulate that climb and only flags the deficit.

### 1.2 The power balance

This was added after early feedback pointed out that the tool had no solar arrays at all, which left compute load as an unconstrained free variable. You could request 5,000 W without any consideration of whether the spacecraft could generate that much electricity in the first place.

The array's generated power is:

```
generatedPowerW = solarFlux · solarPanelAreaM2 · solarPanelEfficiency · solarPanelPointingFactor
```

`solarPanelEfficiency` is a single number standing in for cell efficiency, packing density and wiring losses combined. Real triple-junction space cells run at roughly 28 to 32% at the cell level, and this parameter is meant to represent the net array-level figure, which is usually somewhat lower. `solarPanelPointingFactor` represents how well a single-axis tracking mechanism keeps the array aimed at the Sun, where 1 is perfect tracking.

That is compared against the electrical load:

```
busElectricalLoadW = computeWattsRequested + parasiticHeatW
powerDeficitW = busElectricalLoadW − generatedPowerW
```

`parasiticHeatW` is deliberately doing double duty here. It already represented non-compute waste heat from pumps, avionics and harness losses in the thermal model, and it is reused as a rough stand-in for the same hardware's electrical draw, since for resistive and electronic loads the electrical power going in and the heat coming out are approximately the same number. This avoids adding a separate parameter for something already conceptually present.

### 1.3 Combined status

The status badge (Safe, Margin, At limit, Overheating) is based on whichever of the two utilisation ratios is worse:

```
computeUtilization = computeWattsRequested / maxTdpWatts
powerUtilization   = busElectricalLoadW / generatedPowerW
overallUtilization = max(computeUtilization, powerUtilization)
```

Overheating triggers if either deficit is positive, thermal or electrical, regardless of the other. Margin, At limit and Safe are utilisation bands at 60% and 85%. This means the badge does not tell you which constraint is binding. For that you need the telemetry bar, which shows the thermal and power figures separately.

## 2. Orbital mechanics

This part is real two-body Kepler mechanics rather than an approximation.

### 2.1 Position and shape

The orbit is defined by five classical elements: perigee altitude, eccentricity, inclination, right ascension of the ascending node (RAAN), and argument of perigee. `orbit.ts` builds an orbital plane basis from the three angles using a standard 3-1-3 rotation sequence, Rz(RAAN) · Rx(inclination) · Rz(argument of perigee), then places the satellite in that plane using the polar conic equation:

```
r(ν) = rp(1+e) / (1 + e·cos ν)
```

where `ν` is true anomaly and `rp` is the perigee radius. This is exact for any eccentricity between 0 and just under 1.

### 2.2 Time and speed

The orbital period comes from Kepler's third law:

```
T = 2π √(a³ / μ)
```

using Earth's standard gravitational parameter, μ = 398,600.4418 km³/s², and a semi-major axis `a` derived from perigee altitude and eccentricity. This was checked numerically against known real orbits during development. A 420 km low Earth orbit comes out at about 93 minutes, a GPS-altitude orbit at about 12 hours, and geostationary altitude at 23 hours 56 minutes, or 86,168 seconds, which is essentially exact against the real sidereal day.

When you press play, the satellite does not simply sweep its angle at a constant rate, which would be wrong for anything eccentric. Instead `useOrbitClock.ts` advances the mean anomaly linearly with time, since that is the one quantity that genuinely does move at a constant rate, then solves Kepler's equation `M = E − e·sin(E)` for the eccentric anomaly `E` using Newton-Raphson, which converges in a handful of iterations for anything below about e = 0.9, and then converts to true anomaly. The practical effect is that eccentric orbits visibly speed up near perigee and slow down near apogee, matching Kepler's second law of equal areas in equal times.

### 2.3 Orbit presets

Five presets set all five orbital elements at once: an ISS-like low Earth orbit, a Sun-synchronous low Earth orbit, a GPS-like medium Earth orbit, geostationary orbit, and a Molniya-type highly elliptical orbit. The Molniya figures of 600 km perigee, e = 0.7373 and 63.4° inclination were tuned against the period formula until they matched the real values of roughly a 12 hour period and a 39,700 km apogee. An earlier draft used e = 0.722 from memory, which turned out on checking to be off by about an hour of period, and was corrected.

Selecting a preset also seeds the Earth view factor using a closed-form formula for a flat plate whose normal points straight at nadir:

```
F = (Re / (Re + h))²
```

This is exact for that specific geometry, which is the worst case for Earth loading, rather than an approximation of something else. It is intended as a sensible starting point rather than a constraint, and the slider remains fully manual afterwards, because real radiators are rarely mounted pointing straight at nadir.

## 3. The 3D scene

### 3.1 The scale problem

A real spacecraft is a few metres across, while low orbits are hundreds of kilometres up. At true relative scale the spacecraft is either an invisible speck or, if enlarged enough to see, it passes visually straight through the Earth's surface. There is no single scale factor that makes both readable at once, and earlier versions of this tool had exactly that clipping problem.

The fix is to stop trying to satisfy both goals with one representation and offer two instead:

- **Orbit view** keeps Earth and the orbital path geometrically true to scale, and draws the spacecraft as a small marker rather than a detailed model. Its size is computed every frame as a fraction of the actual gap between the current orbital radius and the Earth's surface, in `ThermalScene.tsx`, and clamped so that it can never exceed a small fixed ceiling either. This was verified numerically rather than by eye, at every altitude from the minimum allowed 160 km, where the gap is smallest, up to geostationary altitude, confirming that the marker's rendered extent stays below the real gap in all cases.
- **Close-up view** renders the spacecraft at full component detail and pushes Earth to a fixed backdrop position that is deliberately not to scale, purely for lighting and context. This view is for looking at hardware rather than reading orbital geometry, and the on-screen caption says so.

### 3.2 What is modelled on the spacecraft

- **Bus**: a simple box, coloured by `satelliteTempC`. This is a separate illustrative parameter rather than something derived from the thermal balance, since the model does not compute a single bulk spacecraft temperature.
- **Radiators**: two panels sized from `radiatorArea` and coloured by radiated flux and glow intensity. They are body-fixed and do not rotate, which is realistic. The `sunIncidence` slider is the free parameter representing whatever angle you want to explore, independent of the visual orientation.
- **Coolant loop**: a tube geometry following a fixed path from the bus to each radiator, with an animated scrolling emissive texture representing flow direction and speed. Section 4.4 explains why this replaced an earlier point-sprite approach.
- **Solar arrays**: two wings that rotate about a single axis, the boom axis, to track a fixed illustrative Sun direction, blended by `solarPanelPointingFactor`. This is a real single-axis tracking calculation rather than decoration. The ideal angle is computed with `atan2` against the Sun vector's projection onto the plane perpendicular to the boom, and the wings visibly move as the pointing accuracy slider changes. The radiator deliberately does not track anything, which illustrates the way real spacecraft usually combine body-fixed radiators with independently gimballed solar arrays.

## 3A. Architecture: the visual layer and the programmatic layer

The module is built in three layers, so that the interactive visualisation and any headless caller run exactly the same physics.

**`sandbox/kernel.ts`** holds the entire model and nothing else. It imports no React, no Three.js and no host framework types, so it runs unchanged in a browser, under Node, in a worker or inside another module. All values are full precision in canonical units. The status thresholds live here too, so a headless caller receives the same classification the interface shows.

**`sandbox/contract.ts`** is the ecosystem-wide interface that every silicon-carbide-sandbox module implements. It defines dimensioned ports, the shared input resolver, and the diagnostic type. The resolver applies defaults and clamps out-of-range values exactly as before, but records a diagnostic for every intervention, including for input keys the module does not declare, which is what catches typos and stale wiring in a composed pipeline.

**`sandbox/module.ts`** declares this module's inputs, outputs and assumptions, and exposes `orbitalThermalLimits.run()`. This is the composable public entry point.

Two thin adapters sit on top. `model.ts` formats kernel results into the shape the host site expects, and is the only place in the project that rounds a physical quantity. The React visualisation calls `orbitalThermalLimits.run()` directly and receives full precision.

An earlier version did not have this separation, and it caused two problems worth recording. The visualisation recomputed absorbed solar, albedo and Earth infrared loads itself, including a second copy of the Stefan-Boltzmann constant, so there were two implementations of the same physics that could drift apart. It also derived thermal utilisation from an already-rounded heat ceiling, which disagreed with the model's own figure by roughly 0.01 of a percentage point. The difference was too small to notice, which is what made it worth fixing properly rather than patching.

`sandbox/headless.example.ts` demonstrates the programmatic layer: a single evaluation, a parameter sweep computing the minimum radiator area for a range of compute loads, and a dimension-checked connection between a hypothetical upstream module and this one.

## 4. How this was built

### 4.1 Starting point

The project arrived as an existing but incomplete implementation: a physics model in `model.ts`, a manifest describing tunable parameters for a host framework, and a Three.js and React Three Fiber scene controlled by a `lil-gui` panel. Several things were broken or missing on arrival, including a genuine compile error caused by a type import that did not exist, and a hardcoded circular-orbit assumption despite the presence of an eccentricity slider.

### 4.2 Verifying real-world numbers rather than assuming them

Two categories of fact were checked against sources rather than recalled and trusted:

- The GPU power figures used in the compute quick-select buttons, namely the H100 SXM5 at 700 W and GB300-class parts at roughly 1,400 W per chip, were confirmed by web search during development rather than stated from memory.
- The orbital mechanics figures, including periods and the Molniya orbit's eccentricity, were checked numerically against the implemented Kepler formulas rather than typed in and assumed correct. This is how the incorrect initial Molniya eccentricity of 0.722 was caught and replaced with 0.7373.

### 4.3 Type-checking and testing without a live copy of the host application

The project imports `Manifest` and `Result` types from `../../core/types`, a module belonging to a parent framework that was not included in the handover. To verify that the code actually compiles rather than merely looking correct, a minimal stand-in for that module was created in a scratch directory, nested at the correct relative depth so that the existing import path resolved, and the whole project was run through `tsc --noEmit` in strict mode. This caught real problems before they shipped, including:

- JSX text nodes containing literal backslash-escape sequences such as `\u00d7`, which are never interpreted as the × character because that syntax only means something inside a JavaScript string, not in plain JSX text. In a browser these render as literal backslash-u-zero-zero-d-seven. Several instances were introduced and then caught this way.
- A missing `ReactNode` import.

The physics model's existing lightweight test file, which uses plain `console.assert` statements rather than a test framework, was extended with new assertions and actually executed by bundling it with `esbuild` and running it under Node, rather than being reasoned about on paper. The anti-clipping marker-scale calculation was likewise checked with a small standalone script across the full altitude range instead of trusting the algebra.

None of this replaces testing in a real browser against the real host framework, which was not available in this environment. Section 5 returns to that point.

### 4.4 Diagnosing the reported bugs

**Play and pause stopping at random.** This initially looked like it could be any of several things, including a React effect dependency problem, a StrictMode double-invocation issue, or a stale closure. The actual cause was architectural. The animation loop was calling the host's `onStateChange` callback on every animation frame, up to 60 times a second and once per state key, whereas the original code only ever called it in response to discrete user actions. Whatever the host does in response, whether re-rendering, persisting or recomputing, was very likely racing the high-frequency animation loop, which explains why it worked only some of the time. The fix decouples the two, so the on-screen position updates locally every frame for smoothness while the host is notified only a few times a second, plus once definitively when playback stops.

**Oversized coolant flow markers.** The original implementation used `THREE.Points` with a fixed `size` in the material. The relevant detail about Three.js, which is not obvious without knowing the renderer internals, is that the point size of a `Points` object is unaffected by its parent group's `scale` transform, whereas its position is not. Since the whole spacecraft model is scaled down to a small marker in Orbit view to solve the clipping problem described in 3.1, the flow dots retained their full absolute size while everything around them shrank. The fix avoids the entire class of problem by not using screen-space point sprites at all. The flow indicator is now a texture animated on the tube's own geometry, so it scales exactly like everything else because it is not a separate object.

**Panel sizes that stopped responding to their sliders.** The radiator and solar wing dimensions each used a hard `Math.min(value, cap)`, duplicated independently across three files. Past the cap, dragging the area slider produced no visible change at all. All of it was consolidated into `spacecraftGeometry.ts` using a `tanh`-based smooth cap, which tracks the raw value closely for small areas and approaches a ceiling asymptotically for large ones. There is no point at which the slider stops doing anything, while the output remains strictly bounded, which is what allows `ThermalScene.tsx` to derive a provably safe maximum reach for the non-clipping marker.

**Tooltips being cut off or hidden.** There were two separate causes. Tooltips anchored to their own button's position with a fixed width overflowed past the sidebar's left edge whenever the button was not near the right edge. Separately, the status badge's tooltip lives inside the telemetry bar, which has its own `z-index`, and `z-index` only resolves ordering within a shared stacking context. Every descendant of that bar therefore renders behind the sidebar, which is a sibling with a higher `z-index`, no matter what `z-index` the descendant itself declares. No value on the tooltip could have fixed the second case. Both were resolved by rendering the tooltip through a React portal directly into `document.body` with `position: fixed` and computed screen coordinates, centred within the sidebar panel where there is one and clamped to the viewport otherwise.

## 5. Limitations worth knowing about

- **This is a steady-state model.** It answers whether a configuration would be in balance indefinitely, not what happens over the next orbit from a cold start. There is no thermal mass, no time-varying temperature and no battery state of charge. During eclipse, solar generation drops immediately to exactly zero, which is correct for the array but not for the spacecraft as a whole, since a real one would be running from batteries.
- **The Earth view factor is a free parameter rather than live geometry.** Presets seed it using a physically real formula for one specific case, a flat plate pointing straight at nadir, but nothing recalculates it as orbital phase or altitude change afterwards. Tracking a different, non-nadir orientation means setting it manually.
- **The coolant is generic.** The specific heat used is water's, regardless of what a real spacecraft loop would use, and there is no two-phase or pump-power modelling.
- **`parasiticHeatW` is overloaded.** It represents both non-compute waste heat and an approximation of the same hardware's electrical draw for the power budget. This is a reasonable simplification, since those two numbers really are close for resistive and electronic loads, but it is worth knowing that one parameter is doing two jobs.
- **The Sun direction is fixed and arbitrary.** It is not tied to any real epoch, season or beta angle. It is a single fixed vector chosen to look reasonable, shared between the lighting and the solar array tracking calculation so that the two at least agree with each other.
- **This has not been run in a live browser against the actual host framework.** Everything above was verified by static type-checking against a stand-in for the missing `core/types` module, by executing the physics tests under Node, and by numerical scripts checking specific claims such as marker scale safety and orbital periods. That is a meaningfully different level of confidence from watching it run. The play and pause fix in particular is a well-reasoned hypothesis about the root cause rather than something observed working end to end in the target environment.

## 6. File map

```
sandbox/
  contract.ts            Ecosystem module interface: dimensioned ports, resolver, diagnostics
  kernel.ts              The entire physics model, pure and dependency-free
  module.ts              This module's descriptor and composable run() entry point
  headless.example.ts    Runnable examples of programmatic use and composition
manifest.ts              Parameter definitions exposed to the host framework
model.ts                 Presentation adapter over the kernel for the host site
model.test.ts            Plain console.assert tests for model.ts
equations.ts             LaTeX equation metadata for display elsewhere
View.tsx / OrbitalThermalView.tsx   Host integration wrappers (near-duplicates)
visualizer/
  ThermalVisualizer.tsx  Top-level component: state, derived calculations, layout
  ThermalScene.tsx       Canvas contents: camera, view-mode switching, marker scaling
  ThermalEnvironment.tsx Earth and the Sun, albedo and Earth infrared arrows (Orbit view)
  CloseupBackdrop.tsx    Schematic Earth backdrop for Close-up view
  SatelliteBus.tsx, Radiator.tsx, CoolantLoop.tsx, SolarPanel.tsx   Spacecraft components
  spacecraftGeometry.ts  Shared radiator and solar wing sizing formulas, smooth-capped
  orbit.ts               Orbital mechanics: position, period, Kepler's equation, view factor
  orbitPresets.ts        The five named orbit presets
  scenarioPresets.ts     Five complete, verified whole-state parameter configurations
  Explainer.tsx          Page content block for above the canvas
  useOrbitClock.ts       Play, pause and speed state, plus per-frame Kepler propagation
  computeReference.ts    Reference GPU wattages for the compute quick-select buttons
  paramMeta.ts           Slider ranges, units and tooltip text, one entry per parameter
  statusInfo.ts          Status badge colours and explanations
  ControlPanel.tsx, ParamSlider.tsx, InfoTip.tsx, StatusBadge.tsx   UI components
  sceneConstants.ts      The shared fixed Sun direction
  thermalColor.ts        Colour helpers, temperature and heat to RGB
```
