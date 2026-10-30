/**
 * Headless usage examples for llm-bitflip-resilience.
 *
 * Demonstrates:
 * 1. A single evaluation
 * 2. Survival time against model size at two tolerance exponents
 * 3. A pipeline step: weight-store memory power feeding the thermal module's
 *    parasitic heat input, checked with canConnect
 *
 * Run: npx tsx src/modules/llm-bitflip-resilience/sandbox/headless.example.ts
 */

import { llmBitflipResilience } from './module';
import { canConnect } from '../../../core/contract';
import { orbitalThermalLimits } from '../../orbital-thermal-limits/sandbox/module';

// 1. Single evaluation (illustrative rate inside the paper's cruise-altitude range)
const one = llmBitflipResilience.run({ modelParamsBillions: 8.03, upsetRateFlipsPerGbMonth: 1, scrubIntervalDays: 30 });
console.log('--- Single evaluation ---');
console.log(`Weight store: ${one.values.memoryFootprintGb.toFixed(2)} GB`);
console.log(`50 % tolerance: ${one.values.n50Flips.toFixed(1)} flips (${one.values.fpb50.toFixed(2)} FPB)`);
console.log(`Mean time to tolerance: ${one.values.t50Days.toFixed(1)} days`);
console.log(`Expected survival over one interval: ${(one.values.expectedSurvival * 100).toFixed(1)} %`);

// 2. Scale changes both tolerance and exposure
console.log('\n--- Time to tolerance against size ---');
for (const alpha of [1, 0.32]) {
  for (const b of [3.086, 8.03]) {
    const r = llmBitflipResilience.run({ modelParamsBillions: b, toleranceExponent: alpha });
    console.log(`alpha ${alpha}, ${b} B: t50 = ${r.values.t50Days.toFixed(1)} days, ratio vs 3.09 B = ${r.values.timeToN50Ratio.toFixed(3)}`);
  }
}

// 3. Composition: memory power into the thermal module
const memOut = llmBitflipResilience.descriptor.outputs.find((o) => o.key === 'memoryPowerW')!;
const parasitic = orbitalThermalLimits.descriptor.inputs.find((p) => p.key === 'parasiticHeatW')!;
console.log('\n--- Ecosystem connection check ---');
console.log('canConnect(memoryPowerW -> parasiticHeatW):', canConnect(memOut, parasitic));
const thermal = orbitalThermalLimits.run({ parasiticHeatW: one.values.memoryPowerW + one.values.eccExtraPowerW });
console.log(`Thermal module with ${one.values.memoryPowerW.toFixed(2)} W of memory heat: max compute heat ${thermal.values.maxComputeHeatW.toFixed(0)} W`);
