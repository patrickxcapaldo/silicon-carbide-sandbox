import { compute } from './model';

// Basic verification against known physics values
const testInputs = {
  radiatorArea: 2.0,
  emissivity: 0.9,
  operatingTempC: 70, // 343.15 K
  sinkTempK: 180,
};

const result = compute(testInputs);

console.assert(result.outputs.maxTdpWatts.value > 1000, 'Test Failed: Output should be > 1000W');