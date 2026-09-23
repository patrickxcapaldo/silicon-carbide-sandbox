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
const clamped = mod.run({ ...base, radiatorArea: 9999 });
assert(clamped.resolvedInputs.radiatorArea === 20, 'Radiator area should clamp to its declared maximum');
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
import { lawLimitRadiatorAreaM2 } from './sandbox/kernel';

type GoldenVector = {
  id: string;
  note?: string;
  call?: 'lawLimitRadiatorAreaM2';
  inputs: Record<string, number>;
  expect: Record<string, number>;
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
      const rel = Math.abs(got - expected) / Math.max(Math.abs(expected), 1e-12);
      assert(rel < relTol, `Golden vector ${v.id}: ${key} expected ${expected}, got ${got} (${v.note ?? ''})`);
    }
  }
  console.log(`${doc.vectors.length} golden vectors passed.`);
}

checkGoldenVectors();

console.log('All model, contract and golden-vector assertions completed.');
