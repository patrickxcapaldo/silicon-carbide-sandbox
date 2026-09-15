# How this works

This document explains the orbital thermal/power visualization end to end: the physics it models, the assumptions baked into it, how the 3D scene is built, and how it was developed. It's meant for whoever picks this project up next, including future-you.

## 1. What the tool actually calculates

At its core this is a steady-state energy balance for a spacecraft radiator, plus a separate steady-state electrical power balance for a solar array. "Steady-state" means it answers "if conditions stayed exactly like this indefinitely, would the numbers work out" — it does not simulate temperature changing over time, thermal mass, or batteries charging and discharging. That's a real limitation, described more in section 5.

### 1.1 The thermal balance

The radiator rejects heat by radiating it to its surroundings. The core equation (in `model.ts`) is:

```
radiativeRejectionW = ε · σ · A · [ (1 − F) · (Tr⁴ − Ts⁴) + F · (Tr⁴ − Te⁴) ]
```

Where:
- `ε` is the radiator's infrared emissivity (0–1)
- `σ` is the Stefan-Boltzmann constant (5.670374419×10⁻⁸ W/m²K⁴)
- `A` is total radiator area
- `Tr` is the radiator's own temperature (in Kelvin)
- `F` is the Earth view factor — the fraction of the radiator's field of view occupied by Earth rather than deep space
- `Ts` is the effective deep-space sink temperature (not literally 2.7 K, because a real radiator also sees some warm structure/other spacecraft surfaces)
- `Te` is Earth's effective IR temperature (~255 K on average)

This says: the radiator radiates against two different backgrounds — a cold deep-space background for the fraction of its view that isn't Earth, and a much warmer Earth background for the rest. Splitting it this way is the one piece of real orbital thermal engineering math in the whole model.

Separately, the radiator absorbs external heat:

```
absorbedSolarW = α · solarFlux · A · sunIncidence
absorbedAlbedoW = α · solarFlux · A · sunIncidence · albedo · F
absorbedEarthIrW = ε · σ · A · F · Te⁴   (this is already inside the equation above, not double-counted)
```

`α` is solar absorptivity, `sunIncidence` is a 0–1 factor standing in for the angle between the radiator's surface normal and the sun (1 = sun hits it face-on, the worst case; 0 = edge-on or in shadow). `albedo` is Earth's reflectivity (~0.3 globally).

Net capacity is:

```
netRadiatorCapacityW = radiativeRejectionW − absorbedSolarW − absorbedAlbedoW − parasiticHeatW
```

Then there's a second, independent limit: the coolant loop has to physically carry that heat from the compute payload to the radiator. That's modeled as a simple sensible-heat transport ceiling:

```
transportCapacityW = flowRateKgS · cp · coolantDeltaT
```

using a fixed, generic coolant specific heat (`cp = 4180 J/kg·K`, i.e. water-like — this is a deliberate simplification, not a real coolant like Galden or ammonia).

The maximum sustainable compute heat is whichever of those two is smaller:

```
maxTdpWatts = max(0, min(netRadiatorCapacityW, transportCapacityW))
```

And the requested compute load is checked against that:

```
computeDeficitW = computeWattsRequested − maxTdpWatts
```

If this is positive, the spacecraft cannot shed heat as fast as the compute generates it, and — in reality — temperatures would climb over time until something breaks or throttles. The tool doesn't simulate that climb; it just flags the deficit.

### 1.2 The power balance

This was added after initial feedback pointed out the tool had no solar arrays, which meant compute load was an unconstrained free variable — you could dial in 5,000 W with no consideration of whether the spacecraft could actually generate that much electricity in the first place.

The array's generated power is:

```
generatedPowerW = solarFlux · solarPanelAreaM2 · solarPanelEfficiency · solarPanelPointingFactor
```

`solarPanelEfficiency` is a single number standing in for cell efficiency, packing density, and wiring losses combined (real triple-junction space cells run roughly 28–32% at the cell level; this parameter is meant to represent the net array-level number, which is usually a bit lower). `solarPanelPointingFactor` represents how well a single-axis tracking mechanism keeps the array aimed at the sun — 1 is perfect tracking.

That's compared against the electrical load:

```
busElectricalLoadW = computeWattsRequested + parasiticHeatW
powerDeficitW = busElectricalLoadW − generatedPowerW
```

Note that `parasiticHeatW` is deliberately doing double duty here: it already represented non-compute waste heat (pumps, avionics, harness losses) in the thermal model, and it's reused as a rough stand-in for that same hardware's electrical draw, since for resistive/electronic loads the electrical power in and the heat out are approximately the same number. This avoids adding a whole separate parameter for something that's already conceptually present.

### 1.3 Combined status

The status badge (Safe / Margin / At limit / Overheating) is based on whichever of the two utilization ratios is worse:

```
computeUtilization = computeWattsRequested / maxTdpWatts
powerUtilization = busElectricalLoadW / generatedPowerW
overallUtilization = max(computeUtilization, powerUtilization)
```

Overheating triggers if either deficit is positive (thermal or electrical), regardless of the other. Margin/Limit/Safe are utilization bands at 60% and 85%. This means the badge doesn't tell you *which* constraint is binding — for that you look at the telemetry bar, which shows both the thermal headroom/deficit and the power headroom/deficit separately.

## 2. Orbital mechanics

This part is real two-body Kepler mechanics, not an approximation.

### 2.1 Position and shape

The orbit is defined by five classical elements: perigee altitude, eccentricity, inclination, RAAN (right ascension of the ascending node), and argument of perigee. `orbit.ts` builds an orbital plane basis from these three angles via a standard 3-1-3 rotation sequence (Rz(RAAN) · Rx(inclination) · Rz(argument of perigee)), then places the satellite in that plane using the standard polar conic equation:

```
r(ν) = rp(1+e) / (1 + e·cos ν)
```

where `ν` is true anomaly and `rp` is the perigee radius. This is exact for any eccentricity between 0 and just under 1.

### 2.2 Time and speed (the "play" feature)

The orbital period comes from Kepler's third law:

```
T = 2π √(a³ / μ)
```

using Earth's standard gravitational parameter (μ = 398,600.4418 km³/s²) and semi-major axis `a` derived from perigee altitude and eccentricity. This was checked numerically against known real orbits during development — a 420 km LEO comes out to about 93 minutes, a GPS-altitude orbit to about 12 hours, and geostationary altitude to 23h56m (86,168 seconds, essentially exact against the real sidereal day).

When you hit play, the satellite doesn't just sweep its angle at a constant rate — that would be wrong for anything eccentric. Instead, `useOrbitClock.ts` advances the *mean anomaly* linearly with time (that's the one quantity that genuinely does move at a constant rate), then solves Kepler's equation `M = E − e·sin(E)` for eccentric anomaly `E` using Newton-Raphson (converges in a handful of iterations for anything under about e = 0.9), then converts to true anomaly. The practical effect is that eccentric orbits visibly speed up near perigee and slow down near apogee, which is the actual physical behavior (Kepler's second law — equal areas in equal times).

### 2.3 Orbit presets

Five presets (LEO/ISS-like, sun-synchronous LEO, MEO/GPS-like, GEO, and a Molniya-type highly elliptical orbit) set all five orbital elements at once. The Molniya numbers (600 km perigee, e = 0.7373, 63.4° inclination) were tuned by trial and error against the period formula until they landed on the real values (~12 hour period, ~39,700 km apogee) — an earlier draft used e = 0.722 from memory, which was checked against the formula and found to be off by about an hour of period, then corrected.

Selecting a preset also seeds the Earth View Factor using a closed-form formula for a flat plate whose normal points straight at nadir:

```
F = (Re / (Re + h))²
```

This is exact for that specific geometry (worst-case, nadir-pointing), not an approximation of something else. It's meant as a sensible starting point, not a constraint — the slider is still fully manual afterward, because real radiators are rarely mounted pointing straight at nadir.

## 3. The 3D scene

### 3.1 The scale problem

A real spacecraft is a few meters across; low orbits are hundreds of kilometers up. At true relative scale, the spacecraft is either an invisible speck or, if you enlarge it enough to see, it visually clips straight through the Earth's surface — there's no single scale factor that makes both readable at once. Earlier versions of this tool suffered exactly that clipping problem.

The fix is to stop trying to satisfy both goals with one representation, and instead offer two:

- **Orbit view**: Earth and the orbital path are geometrically true to scale. The spacecraft is drawn as a small marker rather than a detailed model. Its size is computed every frame as a fraction of the actual gap between the current orbital radius and the Earth's surface (`ThermalScene.tsx`), clamped so it can never exceed a small fixed ceiling either. This was verified numerically (not just by eye) at every altitude from the minimum allowed (160 km, where the gap is smallest) up to geostationary altitude, confirming the marker's rendered extent stays under the real gap in all cases.
- **Close-up view**: the spacecraft renders at full component detail, and Earth is pushed to a fixed, deliberately-not-to-scale backdrop position purely for lighting/context. This view is explicitly for looking at hardware, not for reading orbital geometry, and it says so on screen.

### 3.2 What's actually modeled on the spacecraft

- **Bus**: a simple box, colored by `satelliteTempC` (a separate, illustrative parameter — not derived from the thermal balance above, since this model doesn't compute a single bulk spacecraft temperature).
- **Radiators**: two panels, sized from `radiatorArea`, colored by radiated flux and glow intensity. These are body-fixed — they don't rotate with anything, which is realistic; the `sunIncidence` slider is the free parameter representing whatever angle you want to explore, independent of the visual orientation.
- **Coolant loop**: a tube geometry following a fixed path from bus to each radiator, with an animated scrolling emissive texture representing flow direction and speed (see the bug writeup in section 5 for why this replaced an earlier point-sprite approach).
- **Solar arrays**: two wings that rotate on a single rotational axis (the boom axis) to track a fixed illustrative sun direction, blended by `solarPanelPointingFactor`. This is a real single-axis tracking calculation, not a fixed decoration — the ideal angle is computed via `atan2` against the sun vector's projection onto the plane perpendicular to the boom, and it visibly moves as you change the pointing accuracy slider. The radiator, by contrast, deliberately does *not* track anything, illustrating that real spacecraft usually have body-fixed radiators and independently-gimbaled solar arrays.

## 4. How this was built

### 4.1 Starting point

The project was handed over as an existing but incomplete implementation: a physics model (`model.ts`), a manifest describing tunable parameters for some host framework, and a Three.js/React Three Fiber scene controlled by a `lil-gui` panel. Several things were broken or missing on arrival, including a genuine compile bug (a type import that didn't exist) and a hardcoded circular-orbit assumption despite an eccentricity slider existing.

### 4.2 Verifying real-world numbers rather than assuming them

Two categories of "facts" got checked against live sources rather than pulled from memory and trusted:
- GPU power figures used in the compute-load quick-select buttons (H100 SXM5 at 700 W, GB300-class at roughly 1,400 W per chip) were confirmed via web search during development rather than stated from recollection.
- Orbital mechanics numbers (periods, the Molniya orbit's eccentricity) were checked numerically against the implemented Kepler formulas rather than typed in from memory and assumed correct — this is how the wrong initial Molniya eccentricity (0.722 instead of 0.7373) got caught and fixed.

### 4.3 Type-checking and testing without a live copy of the host app

This project imports `Manifest`/`Result` types from `../../core/types`, a module belonging to a parent framework that wasn't included in what was handed over. To verify the code actually compiles rather than just "looks right," a minimal stand-in for that module was created in a scratch directory, nested at the correct relative depth so the existing `../../core/types` import path resolved correctly, and the whole project was run through `tsc --noEmit` in strict mode. This caught real problems before they shipped, including:
- JSX text nodes containing literal backslash-escape sequences like `\u00d7` that were never being interpreted as the × character, because that syntax only means something inside a JavaScript string, not inside plain JSX text — these render as literal backslash-u-zero-zero-d-seven text in a browser. Several instances of this were introduced and then caught this way.
- A missing `ReactNode` import.

The physics model's existing lightweight test file (plain `console.assert` statements, no test framework) was extended with new assertions and actually executed, by bundling it with `esbuild` and running it under Node, rather than just eyeballing the logic. The anti-clipping marker-scale math was also checked numerically with a small standalone script across the full altitude range, rather than just trusting the algebra.

None of this replaces testing in a real browser with the real host framework, which wasn't available in this environment — see the honesty note in section 5.

### 4.4 Diagnosing the two reported visual/behavioral bugs

**Play/pause randomly stopping**: this looked at first like it could be several things — a React effect dependency bug, a StrictMode double-invocation issue, a stale closure. The actual cause, on inspection, was architectural: the animation loop was calling the host's `onStateChange` callback on every animation frame (up to 60 times a second, once per state key in the object), whereas the original code only ever called it in response to discrete user actions. Whatever the host does with that callback — re-render, persist, recompute — was very likely racing the high-frequency animation loop, which explains why it worked "sometimes." The fix decouples the two: the on-screen position updates locally every frame for smoothness, while the host is only notified a few times a second, plus once definitively when playback stops.

**Oversized coolant flow markers**: the original implementation used `THREE.Points` with a fixed `size` in the material. The relevant fact about Three.js, which isn't obvious without knowing the renderer internals, is that a `Points` object's point *size* is not affected by its parent group's `scale` transform — only its *position* is. Since the whole spacecraft model gets scaled down to a small marker in Orbit view (to solve the clipping problem described in 3.1), the flow dots kept their full absolute size while everything around them shrank, making them look comically oversized. The fix avoids the whole class of problem by not using screen-space point sprites at all — the flow indicator is now a texture animated on the tube's own geometry, which scales exactly like everything else because it isn't a separate object.

## 5. Honest limitations and things worth knowing

- **This is a steady-state model.** It answers "would this be in balance forever," not "what happens over the next orbit starting from a cold start." There's no thermal mass, no time-varying temperature, and no battery state of charge. During eclipse, solar generation drops to exactly zero immediately, which is correct for the array but not for the spacecraft as a whole, since a real one would be running off battery.
- **The Earth View Factor is a free parameter, not live geometry.** Presets seed it with a physically real formula for one specific case (flat plate, pointed straight at nadir), but nothing recalculates it as you change orbital phase or altitude afterward. If you want it to track a different, non-nadir orientation, you set it manually.
- **The coolant is generic.** The specific heat used is water's, regardless of what a real spacecraft loop would actually use (ammonia, Galden, etc.), and there's no two-phase or pump-power modeling.
- **`parasiticHeatW` is overloaded.** It represents both non-compute waste heat and, separately, an approximation of the same hardware's electrical draw for the power budget. This is a reasonable simplification (those two numbers really are close for resistive/electronic loads) but it's worth knowing it's doing two jobs rather than being two independently-tunable things.
- **The sun direction is fixed and arbitrary.** It's not tied to any real epoch, season, or beta angle — it's a single fixed vector chosen to look reasonable, shared between the lighting and the solar array tracking calculation so they at least agree with each other.
- **This hasn't been run in a live browser against the actual host framework.** Everything above was verified by static type-checking against a stand-in for the missing `core/types` module, by executing the physics unit tests under Node, and by numerical scripts checking specific claims (marker scale safety, orbital periods). That's a meaningfully different level of confidence than watching it run. The play/pause fix in particular is a strong, well-reasoned hypothesis about the root cause, not something directly observed and confirmed working end to end in the target environment.

## 6. File map

```
manifest.ts              Parameter definitions exposed to the host framework
model.ts                 Physics: thermal balance + power balance (no Three.js/React here)
model.test.ts            Plain console.assert tests for model.ts
equations.ts              LaTeX equation metadata for display elsewhere
View.tsx / OrbitalThermalView.tsx   Host integration wrappers (near-duplicates)
visualizer/
  ThermalVisualizer.tsx  Top-level component: state, derived calculations, layout
  ThermalScene.tsx       The R3F <Canvas> contents: camera, view-mode switching, marker scaling
  ThermalEnvironment.tsx Earth, sun/albedo/Earth-IR vector arrows (Orbit view only)
  CloseupBackdrop.tsx    Schematic Earth backdrop for Close-up view
  SatelliteBus.tsx, Radiator.tsx, CoolantLoop.tsx, SolarPanel.tsx   Spacecraft components
  orbit.ts               Orbital mechanics: position, period, Kepler's equation, view factor
  orbitPresets.ts        The five named orbit presets
  useOrbitClock.ts       Play/pause/speed state and the per-frame Kepler propagation
  computeReference.ts    Reference GPU wattages for the compute quick-select buttons
  paramMeta.ts           Slider ranges/units/tooltip text, one entry per parameter
  statusInfo.ts          Status badge colors and explanations
  ControlPanel.tsx, ParamSlider.tsx, InfoTip.tsx, StatusBadge.tsx   UI components
  sceneConstants.ts      The shared fixed sun direction
  thermalColor.ts        Color helpers (temperature/heat to RGB)
```
