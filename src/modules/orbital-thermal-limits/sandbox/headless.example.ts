/**
 * Headless usage examples.
 *
 * Run with: npx esbuild sandbox/headless.example.ts --bundle --platform=node
 *   --format=esm --outfile=/tmp/example.mjs && node /tmp/example.mjs
 *
 * Nothing in this file touches a DOM, a canvas or React. It demonstrates the
 * three things the programmatic layer is meant to support: a single
 * evaluation, a parameter sweep, and inspecting the module well enough to wire
 * it to another one.
 */

import { orbitalThermalLimits } from './module';
import { canConnect } from './contract';

// 1. Single evaluation.
const single = orbitalThermalLimits.run({
  computeWattsRequested: 700, // one H100-class accelerator
  radiatorArea: 4,
  solarPanelAreaM2: 8,
  solarLoadWm2: 1361,
  sunIncidence: 0.3,
});

console.log('Status:', single.status);
console.log('Heat rejection ceiling (W):', single.values.maxComputeHeatW.toFixed(1));
console.log('Array generation (W):', single.values.generatedPowerW.toFixed(1));
console.log('Thermal utilisation:', (single.values.computeUtilisation * 100).toFixed(1) + '%');
console.log('Power utilisation:', (single.values.powerUtilisation * 100).toFixed(1) + '%');
for (const d of single.diagnostics) console.log(`  [${d.severity}] ${d.message}`);

// 2. Parameter sweep: how much radiator area does a given load actually need?
//    This is the kind of question the visualisation cannot answer directly but
//    that is trivial programmatically.
function minimumRadiatorAreaFor(computeW: number): number | null {
  for (let area = 0.5; area <= 20; area += 0.5) {
    const r = orbitalThermalLimits.run({ computeWattsRequested: computeW, radiatorArea: area, solarPanelAreaM2: 30, sunIncidence: 0.2 });
    if (r.values.computeDeficitW <= 0) return area;
  }
  return null;
}

console.log('\nMinimum radiator area by compute load, with a generous array and favourable pointing:');
for (const w of [100, 250, 500, 700, 1400]) {
  const area = minimumRadiatorAreaFor(w);
  console.log(`  ${w} W -> ${area === null ? 'not achievable within 20 m²' : area + ' m²'}`);
}

// 3. Inspecting the module for composition. A hypothetical upstream module
//    that reports an accelerator's power draw could feed this module's
//    compute input, and the contract layer can check that mechanically.
const upstreamOutput = {
  key: 'acceleratorPowerW',
  label: 'Accelerator package power',
  unit: 'W',
  dimension: { mass: 1, length: 2, time: -3 },
  description: 'Total electrical power drawn by the accelerator package.',
  kind: 'quantity' as const,
};

const computeInput = orbitalThermalLimits.descriptor.inputs.find((i) => i.key === 'computeWattsRequested')!;
console.log('\nConnection check:', canConnect(upstreamOutput, computeInput));

// A deliberately wrong connection, to show the check does something.
const areaInput = orbitalThermalLimits.descriptor.inputs.find((i) => i.key === 'radiatorArea')!;
console.log('Bad connection check:', canConnect(upstreamOutput, areaInput));

// 4. Every module can report what it does not model, so a composed pipeline
//    can surface the union of its constituents' caveats.
console.log('\nDeclared assumptions:');
for (const a of orbitalThermalLimits.descriptor.assumptions) console.log('  -', a);
