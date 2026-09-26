/**
 * No test framework (vitest/jest) is wired into this export yet -- there is
 * no package.json included, so nothing installs one. Until that happens,
 * run this file directly, e.g. `npx tsx model.test.ts` from this directory,
 * or compile with tsc and run the output with node.
 *
 * `console.assert` deliberately is not used here: in Node it only logs to
 * stderr on failure, it never throws and never sets a nonzero exit code, so
 * a suite built on it can fail every check and still "pass". `assert`
 * below throws instead, and the file sets `process.exitCode = 1` if
 * anything throws, so a CI step that runs this file and checks its exit
 * code will actually catch a regression.
 */
function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

import { compute } from './model';

const base = {
  radiatorArea: 2, emissivity: 0.9, solarAbsorptivity: 0.12, operatingTempC: 70, sinkTempK: 180,
  earthIrTempK: 255, earthViewFactor: 0.35, earthAlbedo: 0.3, solarLoadWm2: 700, sunIncidence: 0.75,
  flowRateKgS: 0.35, coolantDeltaT: 10, parasiticHeatW: 40, computeWattsRequested: 300,
  solarPanelAreaM2: 4, solarPanelEfficiency: 0.29, solarPanelPointingFactor: 0.95,
  orbitAltitudeKm: 420, orbitEccentricity: 0.001, orbitInclinationDeg: 51.6, orbitRaanDeg: 25, orbitArgumentDeg: 0,
};

const result = compute(base);
assert(result.outputs.maxTdpWatts.value >= 0, 'Compute limit must not be negative');
assert(result.outputs.radiativeRejectionW.value > 0, 'Radiator should reject heat at 70 C');
assert(compute({ ...base, radiatorArea: 10 }).outputs.maxTdpWatts.value > result.outputs.maxTdpWatts.value, 'Larger radiator should increase capacity');
assert(compute({ ...base, flowRateKgS: 0.01 }).outputs.maxTdpWatts.value < result.outputs.maxTdpWatts.value, 'Very low flow should reduce transport-limited capacity');
assert(compute({ ...base, earthViewFactor: 1 }).outputs.radiativeRejectionW.value < compute({ ...base, earthViewFactor: 0 }).outputs.radiativeRejectionW.value, 'Earth view should reduce rejection for 255 K Earth');
assert(compute({ ...base, computeWattsRequested: 5000 }).outputs.computeDeficitW.value > 0, 'A large requested compute load should exceed the thermal budget');
assert(compute({ ...base, computeWattsRequested: 0 }).outputs.computeDeficitW.value <= 0, 'Zero requested compute load should never show a deficit');
assert(compute({ ...base, solarLoadWm2: 0 }).outputs.generatedPowerW.value === 0, 'No sunlight (eclipse) should generate zero solar power');
assert(compute({ ...base, solarPanelAreaM2: 20 }).outputs.generatedPowerW.value > compute({ ...base, solarPanelAreaM2: 2 }).outputs.generatedPowerW.value, 'Larger solar array should generate more power');
assert(compute({ ...base, computeWattsRequested: 5000 }).outputs.powerDeficitW.value > 0, 'A large requested compute load should also exceed the (small) solar array power budget');
assert(compute({ ...base, solarPanelAreaM2: 30, solarPanelEfficiency: 0.4 }).outputs.powerDeficitW.value < compute(base).outputs.powerDeficitW.value, 'A bigger, more efficient array should reduce the power deficit');

// --- Engineering change request: coolant fluid, albedo, eclipse duty cycle ---
import { COOLANT_CP_J_KG_K } from './sandbox/kernel';

assert(COOLANT_CP_J_KG_K === 1050, 'Coolant specific heat should reflect a Galden PFPE-class dielectric fluid, not water');
{
  const flow = 0.4, deltaT = 15;
  const expectedTransportW = flow * COOLANT_CP_J_KG_K * deltaT;
  const actual = compute({ ...base, flowRateKgS: flow, coolantDeltaT: deltaT }).outputs.transportCapacityW.value;
  assert(Math.abs(actual - expectedTransportW) <= 1, 'Transport capacity should equal flow * cp * deltaT with the dielectric fluid cp');
}

// Albedo must actually add to the absorbed external heat load.
{
  const withAlbedo = compute({ ...base, earthAlbedo: 0.3 }).outputs.externalHeatW.value;
  const withoutAlbedo = compute({ ...base, earthAlbedo: 0 }).outputs.externalHeatW.value;
  assert(withAlbedo > withoutAlbedo, 'Nonzero Earth albedo should increase the absorbed external heat load');
}

// A LEO orbit should show a genuine eclipse duty cycle, and the power
// budget should be bounded by the orbit-averaged figure, not the
// instantaneous full-sun figure.
{
  const leo = compute(base);
  const sunlitFraction = leo.outputs.orbitSunlitFraction.value / 100;
  assert(sunlitFraction > 0 && sunlitFraction < 1, 'This LEO configuration should show a partial eclipse duty cycle');
  assert(
    leo.outputs.generatedPowerW.value < leo.outputs.instantaneousGeneratedPowerW.value,
    'Orbit-averaged generation should be lower than the instantaneous full-sun figure whenever there is eclipse',
  );
  const ratio = leo.outputs.generatedPowerW.value / leo.outputs.instantaneousGeneratedPowerW.value;
  assert(Math.abs(ratio - sunlitFraction) < 0.02, 'Average generation should equal instantaneous generation times the sunlit fraction');
}

// A high-altitude, low-inclination orbit should show little or no eclipse
// with the tool's fixed Sun direction, and generation should not be
// artificially reduced in that case.
{
  const geo = compute({ ...base, orbitAltitudeKm: 35786, orbitEccentricity: 0.0002, orbitInclinationDeg: 0.02, orbitRaanDeg: 0 });
  assert(geo.outputs.orbitSunlitFraction.value > 99, 'This near-equatorial GEO configuration should show little to no eclipse with the fixed Sun direction used here');
}

// --- Contract and kernel layer -------------------------------------------
import { orbitalThermalLimits } from './sandbox/module';
import { runThermalKernel, classifyStatus } from './sandbox/kernel';
import { canConnect, resolveInputs } from './sandbox/contract';

const mod = orbitalThermalLimits;

// The adapter and the module must agree, since the adapter is only a
// formatter over the same kernel.
const viaModule = mod.run({ ...base });
const viaAdapter = compute({ ...base });
assert(
  Math.round(viaModule.values.maxComputeHeatW) === viaAdapter.outputs.maxTdpWatts.value,
  'Adapter and module must report the same heat ceiling',
);

// Unknown inputs are reported rather than silently ignored.
const withTypo = mod.run({ ...base, radiatorAreaTypo: 5 } as Record<string, number>);
assert(
  withTypo.diagnostics.some((d) => d.key === 'radiatorAreaTypo'),
  'An undeclared input key should produce a diagnostic',
);

// Out-of-range inputs are clamped and reported, not accepted silently.
const clamped = mod.run({ ...base, radiatorArea: 3e7 });
assert(clamped.resolvedInputs.radiatorArea === 2e7, 'Radiator area should clamp to its declared maximum');
assert(
  clamped.diagnostics.some((d) => d.key === 'radiatorArea' && d.severity === 'warning'),
  'Clamping should produce a warning diagnostic',
);

// Non-finite input falls back to the default and reports an error.
const bad = mod.run({ ...base, emissivity: Number.NaN });
assert(bad.resolvedInputs.emissivity === 0.9, 'Non-finite input should fall back to the default');
assert(
  bad.diagnostics.some((d) => d.key === 'emissivity' && d.severity === 'error'),
  'Non-finite input should produce an error diagnostic',
);

// Outputs crossing a module boundary must be full precision, not rounded.
const precise = mod.run({ ...base });
assert(
  precise.values.maxComputeHeatW % 1 !== 0 || precise.values.radiatorFluxWm2 % 1 !== 0,
  'Module outputs should retain fractional precision rather than being pre-rounded',
);

// Status is available headlessly and matches a direct kernel classification.
assert(
  precise.status === classifyStatus(runThermalKernel(precise.resolvedInputs as never)),
  'Module status must match a direct kernel classification',
);

// Dimension checking rejects a mechanically impossible connection.
const powerOut = mod.descriptor.outputs.find((o) => o.key === 'generatedPowerW')!;
const areaIn = mod.descriptor.inputs.find((i) => i.key === 'radiatorArea')!;
const computeIn = mod.descriptor.inputs.find((i) => i.key === 'computeWattsRequested')!;
assert(!canConnect(powerOut, areaIn).ok, 'Power should not connect to an area input');
assert(canConnect(powerOut, computeIn).ok, 'Power should connect to a power input');

// Every declared output must actually be produced.
for (const spec of mod.descriptor.outputs) {
  assert(
    typeof (precise.values as Record<string, number>)[spec.key] === 'number',
    `Declared output ${spec.key} must be present in the result`,
  );
}

// Defaults declared in the descriptor must themselves be in range.
const { diagnostics: defaultDiagnostics } = resolveInputs(mod.descriptor.inputs, {});
assert(defaultDiagnostics.length === 0, 'Declared defaults should not trigger clamping or errors');

// --- Golden vectors (dossier §9.6) ----------------------------------------
//
// These are independent of the assertions above: every expected value in
// data/golden-vectors/orbital-thermal-limits.json was generated by compiling
// kernel.ts standalone with tsc and running it outside this app's normal
// build/UI path (see that file's _meta for how and when). Re-running it here
// through the same kernel.run() the app actually uses is what catches a
// regression in the wiring, not just the formula: a bug that only shows up
// when the kernel is called from `sandbox/module.ts` or `model.ts`, rather
// than called directly, would slip past a vector that was only ever checked
// against the raw kernel.
import { readFileSync } from 'fs';
import { join } from 'path';
import { lawLimitRadiatorAreaM2, kernelWarnings } from './sandbox/kernel';
import { INPUT_SPECS } from './sandbox/module';
import type { ThermalKernelInputs, ThermalKernelOutputs } from './sandbox/kernel';
import { SCENARIO_PRESETS } from './visualizer/scenarioPresets';
import { PARAM_META } from './visualizer/paramMeta';

type GoldenVector = {
  id: string;
  note?: string;
  call?: 'lawLimitRadiatorAreaM2';
  /** Id of the scenario preset whose state these inputs must match exactly. */
  preset?: string;
  inputs: Record<string, number>;
  expect: Record<string, number>;
  /** Quantities computed from the raw kernel outputs of the same run, by the formulas in DERIVED below. */
  expectDerived?: Record<string, number>;
  expectStatus?: string;
  /** Substrings that must each appear in some kernelWarnings() message. */
  expectWarnings?: string[];
};

/**
 * Derived comparison quantities. Every one is a function of the kernel's own
 * inputs and outputs and nothing else, so a vector can never quietly depend on
 * a domain variable the kernel does not model (mass, cost, launch volume).
 */
const DERIVED: Record<string, (i: ThermalKernelInputs, o: ThermalKernelOutputs) => number> = {
  // Fixed (parasitic) heat as a share of the heat budget available before that
  // deduction: gross radiative rejection minus absorbed solar and albedo load.
  parasiticFractionOfHeatBudget: (i, o) => i.parasiticHeatW / (o.radiativeRejectionW - o.externalHeatW),
  // Radiating capacity the coolant loop cannot use.
  unusedRadiatorCapacityW: (_i, o) => o.netRadiatorCapacityW - o.maxComputeHeatW,
  transportShareOfNetCapacity: (_i, o) => o.transportCapacityW / o.netRadiatorCapacityW,
};

function checkGoldenVectors(): void {
  const path = join(__dirname, '..', '..', '..', 'data', 'golden-vectors', 'orbital-thermal-limits.json');
  const doc: { vectors: GoldenVector[] } = JSON.parse(readFileSync(path, 'utf8'));
  const relTol = 1e-6; // generous vs. the 1e-9 the vectors were generated at, to tolerate JS float rounding across two separate compiles

  for (const v of doc.vectors) {
    const actual: Record<string, number> =
      v.call === 'lawLimitRadiatorAreaM2'
        ? { areaM2: lawLimitRadiatorAreaM2(v.inputs as never) }
        : (runThermalKernel(v.inputs as never) as unknown as Record<string, number>);

    for (const [key, expected] of Object.entries(v.expect)) {
      const got = actual[key];
      assert(typeof got === 'number', `Golden vector ${v.id}: kernel produced no output named ${key}`);
      const rel = Math.abs(got - expected) / Math.max(Math.abs(expected), 1e-12);
      assert(rel < relTol, `Golden vector ${v.id}: ${key} expected ${expected}, got ${got} (${v.note ?? ''})`);
    }

    // Derived quantities, status and warnings all come from the same kernel run.
    if (v.expectDerived || v.expectStatus || v.expectWarnings) {
      const ki = v.inputs as unknown as ThermalKernelInputs;
      const ko = actual as unknown as ThermalKernelOutputs;
      for (const [key, expected] of Object.entries(v.expectDerived ?? {})) {
        const fn = DERIVED[key];
        assert(fn !== undefined, `Golden vector ${v.id}: unknown derived quantity ${key}`);
        const got = fn(ki, ko);
        const rel = Math.abs(got - expected) / Math.max(Math.abs(expected), 1e-12);
        assert(rel < relTol, `Golden vector ${v.id}: derived ${key} expected ${expected}, got ${got}`);
      }
      if (v.expectStatus !== undefined) {
        assert(classifyStatus(ko) === v.expectStatus, `Golden vector ${v.id}: status expected ${v.expectStatus}, got ${classifyStatus(ko)}`);
      }
      const warnings = kernelWarnings(ki, ko);
      for (const fragment of v.expectWarnings ?? []) {
        assert(warnings.some((w) => w.includes(fragment)), `Golden vector ${v.id}: expected a warning containing "${fragment}", got ${JSON.stringify(warnings)}`);
      }
    }
  }
  console.log(`${doc.vectors.length} golden vectors passed.`);
  checkFleetPresets(doc.vectors);
}

// --- Fleet-architecture presets (Study 01 section 4, Spark 03) --------------
//
// The five presets added for the fleet-invariance work are pinned to golden
// vectors gv-08 to gv-12. These checks make sure the presets a person loads in
// the UI are the states the vectors were generated from, that they load
// without any input being clamped, and that the headline numbers quoted in
// their explanation text and in the publications hold.
function checkFleetPresets(vectors: GoldenVector[]): void {
  const withPreset = vectors.filter((v) => v.preset !== undefined);
  assert(withPreset.length === 5, 'Exactly five golden vectors should be tied to the fleet-architecture presets');

  const ids = SCENARIO_PRESETS.map((p) => p.id);
  assert(new Set(ids).size === ids.length, 'Scenario preset ids must be unique');

  for (const v of withPreset) {
    const preset = SCENARIO_PRESETS.find((p) => p.id === v.preset);
    assert(preset !== undefined, `Golden vector ${v.id} names preset ${v.preset}, which does not exist in scenarioPresets.ts`);

    // The preset's state must equal the vector's inputs on every kernel input.
    for (const [key, value] of Object.entries(v.inputs)) {
      assert(
        (preset!.state as unknown as Record<string, number>)[key] === value,
        `Preset ${preset!.id} has ${key}=${(preset!.state as unknown as Record<string, number>)[key]} but golden vector ${v.id} was generated with ${value}`,
      );
    }

    // Every field of the state must sit inside the slider range, so loading it
    // never puts a control outside its bounds, and the module must not need to
    // clamp or default anything to run it.
    for (const [key, meta] of Object.entries(PARAM_META)) {
      const value = (preset!.state as unknown as Record<string, number>)[key];
      assert(typeof value === 'number' && value >= meta.min && value <= meta.max, `Preset ${preset!.id}: ${key}=${value} is outside the slider range ${meta.min} to ${meta.max}`);
    }
    // Only the declared module inputs go to run(); satelliteTempC and orbitPhaseDeg are display-only state.
    const state = preset!.state as unknown as Record<string, number>;
    const run = orbitalThermalLimits.run(Object.fromEntries(INPUT_SPECS.map((spec) => [spec.key, state[spec.key]])));
    const interventions = run.diagnostics.filter((d) => d.key !== undefined);
    assert(interventions.length === 0, `Preset ${preset!.id}: module had to clamp or default inputs: ${JSON.stringify(interventions)}`);
  }

  const byId = (id: string) => vectors.find((v) => v.id === id)!;
  const transport = byId('gv-08-transport-limited-monolith');
  const tiny = byId('gv-09-tiny-node-overhead');
  const scaled = byId('gv-10-scaled-node-overhead');

  // Transport-limited monolith: radiating capacity about 9,295 W, usable about 263 W.
  const tRun = orbitalThermalLimits.run(transport.inputs);
  assert(Math.round(tRun.values.netRadiatorCapacityW) === 9295, 'gv-08: net radiator capacity should be about 9,295 W');
  assert(Math.round(tRun.values.maxComputeHeatW) === 263, 'gv-08: usable heat rejection should be about 263 W');
  assert(tRun.values.transportCapacityW < tRun.values.netRadiatorCapacityW, 'gv-08: the loop, not the radiator, must be the binding limit');
  assert(
    tRun.diagnostics.some((d) => d.severity === 'warning' && d.message.startsWith('Coolant transport capacity is the limiting factor.')),
    'gv-08: the module must surface the transport-limit warning',
  );

  // Parasitic tax: 5.7% for the 100 W node, 0.7% for the 1 kW node.
  const tinyShare = DERIVED.parasiticFractionOfHeatBudget(tiny.inputs as unknown as ThermalKernelInputs, runThermalKernel(tiny.inputs as never));
  const scaledShare = DERIVED.parasiticFractionOfHeatBudget(scaled.inputs as unknown as ThermalKernelInputs, runThermalKernel(scaled.inputs as never));
  assert(tiny.inputs.computeWattsRequested === 100 && tiny.inputs.parasiticHeatW === 30, 'gv-09: expected 100 W compute and 30 W parasitic');
  assert(scaled.inputs.computeWattsRequested === 1000 && scaled.inputs.parasiticHeatW === 30, 'gv-10: expected 1,000 W compute and 30 W parasitic');
  assert(Math.abs(tinyShare * 100 - 5.7) < 0.05, `gv-09: parasitic share of heat budget should be 5.7%, got ${(tinyShare * 100).toFixed(3)}%`);
  assert(Math.abs(scaledShare * 100 - 0.7) < 0.05, `gv-10: parasitic share of heat budget should be 0.7%, got ${(scaledShare * 100).toFixed(3)}%`);

  // Fleet invariance in the kernel itself: same temperature and environment
  // means the same flux per square metre whatever the node's size.
  const relFlux = Math.abs(tiny.expect.radiatorFluxWm2 - scaled.expect.radiatorFluxWm2) / tiny.expect.radiatorFluxWm2;
  assert(relFlux < 1e-9, 'gv-09 and gv-10 must have identical radiator flux per square metre (area-independence of q)');
  assert(scaled.inputs.radiatorArea === 8 * tiny.inputs.radiatorArea, 'gv-09 and gv-10 should differ by a factor of eight in radiator area');

  // Starmind Fleet Node: real, literal disclosed size (160 m^2, 175 kW,
  // 122C), deliberately run close to its own thermal ceiling (about 97.9%
  // utilisation, status LIMIT), not comfortably under it like the two
  // overhead presets.
  const starmind = byId('gv-11-starmind-fleet-node');
  const sRun = orbitalThermalLimits.run(starmind.inputs);
  assert(Math.abs(sRun.values.radiatorFluxWm2 - 1158) < 1, 'gv-11: radiator flux should be about 1,158 W/m^2 at 122C');
  assert(sRun.values.computeUtilisation > 0.95 && sRun.values.computeUtilisation < 1, 'gv-11: thermal utilisation should be close to but under 100%');
  assert(sRun.status === 'LIMIT', 'gv-11: status should read LIMIT, not SAFE or OVERHEATING');
  assert(sRun.values.computeDeficitW < 0, 'gv-11: should have thermal headroom, not a deficit, despite reading LIMIT');

  // Monolith (5 GW Concept): the aggregate counterpart. Radiative capacity
  // (about 6.47 GW) exceeds the request (5 GW), and transport capacity
  // (about 6.72 GW) exceeds radiative capacity, so radiation -- not the
  // loop -- is the binding limit here, unlike gv-08 at small scale.
  const monolith = byId('gv-12-monolith-5gw');
  const mRun = orbitalThermalLimits.run(monolith.inputs);
  assert(Math.abs(mRun.values.radiatorFluxWm2 - 671.85) < 1, 'gv-12: radiator flux should be about 671.85 W/m^2 at 75C');
  assert(mRun.values.transportCapacityW > mRun.values.netRadiatorCapacityW, 'gv-12: the radiator, not the loop, must be the binding limit');
  assert(mRun.status === 'LIMIT', 'gv-12: status should read LIMIT, not SAFE or OVERHEATING');
  assert(mRun.values.computeDeficitW < 0, 'gv-12: should have thermal headroom, not a deficit, despite reading LIMIT');
  assert(
    Math.abs(monolith.inputs.computeWattsRequested - 28600 * starmind.inputs.computeWattsRequested) / monolith.inputs.computeWattsRequested < 0.005,
    'gv-11 and gv-12 should represent the same ~5 GW aggregate: 28,600 Starmind Fleet Nodes vs. one Monolith',
  );
  console.log('Fleet-architecture preset checks passed.');
}

checkGoldenVectors();

console.log('All model, contract and golden-vector assertions completed.');
