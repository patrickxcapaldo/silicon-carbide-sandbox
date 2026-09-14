import { compute } from './model';

const base = {
  radiatorArea: 2, emissivity: 0.9, solarAbsorptivity: 0.12, operatingTempC: 70, sinkTempK: 180,
  earthIrTempK: 255, earthViewFactor: 0.35, earthAlbedo: 0.3, solarLoadWm2: 700, sunIncidence: 0.75,
  flowRateKgS: 0.35, coolantDeltaT: 10, parasiticHeatW: 40, computeWattsRequested: 300,
};

const result = compute(base);
console.assert(result.outputs.maxTdpWatts.value >= 0, 'Compute limit must not be negative');
console.assert(result.outputs.radiativeRejectionW.value > 0, 'Radiator should reject heat at 70 C');
console.assert(compute({ ...base, radiatorArea: 10 }).outputs.maxTdpWatts.value > result.outputs.maxTdpWatts.value, 'Larger radiator should increase capacity');
console.assert(compute({ ...base, flowRateKgS: 0.01 }).outputs.maxTdpWatts.value < result.outputs.maxTdpWatts.value, 'Very low flow should reduce transport-limited capacity');
console.assert(compute({ ...base, earthViewFactor: 1 }).outputs.radiativeRejectionW.value < compute({ ...base, earthViewFactor: 0 }).outputs.radiativeRejectionW.value, 'Earth view should reduce rejection for 255 K Earth');
console.assert(compute({ ...base, computeWattsRequested: 5000 }).outputs.computeDeficitW.value > 0, 'A large requested compute load should exceed the thermal budget');
console.assert(compute({ ...base, computeWattsRequested: 0 }).outputs.computeDeficitW.value <= 0, 'Zero requested compute load should never show a deficit');
