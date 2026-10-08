# Module 1: Orbital Thermal Limits

An interactive engineering model for one question: can an AI compute payload in Earth orbit reject its waste heat and generate enough electrical power to run continuously?

The module evaluates thermal rejection and solar power as separate budgets. It includes radiator radiation to deep space and Earth, absorbed sunlight and Earth albedo, coolant transport, parasitic bus loads, solar-array performance, and the orbit's time in Earth's shadow. Its 3D visualisation makes those trade-offs inspectable; the same calculation is also available as a deterministic, headless TypeScript module.

## What It Calculates

The thermal budget is limited by whichever is smaller: the net radiator capacity or the heat the coolant loop can transport while keeping the payload below its allowed temperature.

```text
Radiator rejection = εσA[(1 - F)(Tᵣ⁴ - T_space⁴) + F(Tᵣ⁴ - T_Earth⁴)]
Net radiator capacity = radiator rejection - absorbed solar - absorbed albedo - parasitic heat
Maximum compute heat = max(0, min(net radiator capacity, ṁ cₚ ΔT))
```

The electrical budget compares the array's orbit-averaged generation with compute power plus parasitic bus draw:

```text
Average array power = solar flux × array area × efficiency × pointing factor × sunlit fraction
Bus load = requested compute power + parasitic heat
```

The radiator surface is an ideal selective surface: solar absorptivity and infrared emissivity are independent. Coolant transport uses a fixed specific heat of 1,050 J/kg·K, representative of a single-phase dielectric spacecraft coolant. Both thermal and electrical utilisation are reported; the worse budget determines the status.

## Using The Visualiser

Open **Orbital Thermal Limits** in the sandbox and start with a scenario preset. Presets cover a comfortable baseline, thermal- or power-limited cases, an eclipse power example, coolant transport limits, small-node overhead, and fleet-scale comparisons up to a 5 GW concept. Orbit presets cover LEO, sun-synchronous LEO, MEO, GEO, and a Molniya-type orbit.

Adjust the compute request, radiator, coolant loop, solar array, surface properties, and orbital elements. The telemetry separates thermal capacity from orbit-averaged electrical generation, so a power deficit is not mistaken for a radiator problem. The orbital view keeps Earth and the orbit to scale; close-up view shows component detail with Earth as a schematic backdrop.

Status is based on the more constrained budget:

- **Safe:** utilisation is at most 60%.
- **Margin:** utilisation is above 60% and at most 85%.
- **Limit:** utilisation is above 85%, but the requested load remains within both budgets.
- **Overheating:** requested compute exceeds the thermal or electrical budget.

## Programmatic Use

The composable entry point is `sandbox/module.ts`. It resolves omitted inputs to declared defaults, clamps out-of-range inputs with diagnostics, and returns full-precision values, status, diagnostics, and the inputs actually used.

```ts
import { orbitalThermalLimits } from './sandbox/module';

const result = orbitalThermalLimits.run({
  computeWattsRequested: 700,
  radiatorArea: 4,
  solarPanelAreaM2: 8,
});

console.log(result.status);
console.log(result.values.maxComputeHeatW);
console.log(result.values.generatedPowerW); // orbit-averaged array output
console.log(result.diagnostics);
```

Inputs and outputs, units, supported ranges, and model assumptions are available on `orbitalThermalLimits.descriptor`. See [`sandbox/headless.example.ts`](sandbox/headless.example.ts) for a parameter sweep and an example of checking module connections.

## Versioned Article Runs

The module's `releaseVersion` identifies its model behaviour, assumptions, defaults, and public inputs and outputs. Its separate `contractVersion` identifies input/output compatibility only. The current baseline is module release **0.1.0**, contract **1.0.0**; this is not an immutable published release until it is included in a GitHub tag. Sandbox version comes from the root `package.json` and identifies the complete application release.

Module version policy:

- **PATCH:** documentation or presentation changes that do not alter computed results.
- **MINOR:** additive or compatible model changes, including scientific corrections that change results for some inputs.
- **MAJOR:** breaking changes to public inputs, outputs, or their meanings.

Each release is immutable. Corrected model results require a new module version; never rewrite a release tag cited by an article. The module's **Export run JSON** button captures the calculation's requested and resolved inputs, full-precision outputs, status, diagnostics, declared assumptions, module release and contract versions, Sandbox version, source commit, and record schema version. The visual orbit phase is intentionally not recorded as a model input because it does not affect the calculation. JSON encodes non-finite results as `"Infinity"`, `"-Infinity"`, or `"NaN"` strings.

The record includes an `assumptionRegistryRevisions` array. It is empty by default because registry values are not yet linked automatically to module assumptions. If an article relies on a specific registry entry, add its ID and revision to the record before committing it.

Before publishing an article:

1. Export the run from a clean, released build. Confirm `sourceDirty` is `false`; a dirty-tree record cannot be reproduced from its commit alone.
2. Commit the record under `data/runs/`, using a descriptive name such as `orbital-thermal-limits-2026-10-03-spacecraft-case.json`.
3. Cite the Sandbox tag and module release alongside a GitHub permalink to the run record. For example: `Silicon Carbide Sandbox v0.1.0, module orbital-thermal-limits v0.1.0, run record <permalink>`.

To reproduce a committed record, check out the Sandbox tag and source commit it names, install the locked dependencies, and run:

```bash
git checkout --detach <recorded-source-commit>
npm ci
npm run replay -- /path/to/downloaded-article-run-record.json
```

Download the run record from its GitHub permalink before checking out the recorded source commit; the JSON may have been committed after that commit. The replay command rejects dirty records and mismatched Sandbox versions, commits, module releases, or contracts, then compares resolved inputs, outputs, status, and diagnostics with a fresh calculation. GitHub preserves the tagged source and run record; the live site itself does not serve historical versions. Earlier ledger entries using `orbital-thermal-limits@1.0.0` referred to the old contract version, not an immutable module release; see [erratum E-0002](../../../data/ledger/errata.yaml).

## Scope And Limitations

This is a first-order screening model, not a spacecraft-qualified design tool. Thermal behaviour is steady-state: it does not simulate thermal mass, temperature changes over time, radiator gradients, detailed conduction paths, or a multi-node spacecraft network. The Earth view factor is an input rather than a geometry-derived flight value, and optical properties are simplified to constant solar absorptivity and infrared emissivity.

The power budget accounts for the orbit's eclipse duty cycle using a cylindrical Earth shadow and a fixed Sun direction. It checks average generation over an orbit, but does not model battery capacity or state of charge; passing the average budget does not guarantee uninterrupted operation through eclipse. Parasitic heat approximates electronic and resistive bus losses. It does not include active heaters or electrical power radiated away by an RF payload. Gigawatt-scale inputs represent aggregate platforms and fleets; the model does not resolve their structural, deployment, or thermal-network design.

Treat the results as a way to compare assumptions and identify the binding constraint, not as a substitute for detailed mission analysis.

## Development Checks

From the repository root:

```bash
npm test
npm run build
npm run replay -- data/runs/<article-run-record>.json
```

The model assertions and pinned golden vectors are in [`model.test.ts`](model.test.ts) and [`data/golden-vectors/orbital-thermal-limits.json`](../../../data/golden-vectors/orbital-thermal-limits.json). The kernel is implemented in [`sandbox/kernel.ts`](sandbox/kernel.ts); the visual controls and scenario definitions live in [`visualizer/ControlPanel.tsx`](visualizer/ControlPanel.tsx) and [`visualizer/scenarioPresets.ts`](visualizer/scenarioPresets.ts).
