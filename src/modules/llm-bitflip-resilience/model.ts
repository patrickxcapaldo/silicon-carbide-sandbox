import type { Result } from '../../core/types';
import { llmBitflipResilience } from './sandbox/module';

/**
 * Presentation adapter for llm-bitflip-resilience.
 *
 * All calculation happens in sandbox/kernel.ts at full precision. This adapter
 * only rounds and labels for the generic result grid.
 */
export function compute(inputs: Record<string, number>): Result {
  const result = llmBitflipResilience.run(inputs);
  const v = result.values;
  const pct = (x: number) => parseFloat((x * 100).toFixed(1));
  const sig = (x: number) => (Number.isFinite(x) ? parseFloat(x.toPrecision(4)) : x);

  return {
    outputs: {
      memoryFootprintGb: { label: 'Weight Store Size', value: parseFloat(v.memoryFootprintGb.toFixed(2)), unit: 'GB', description: 'Parameters times bytes per parameter, decimal gigabytes. This is the area that can be hit.' },
      fpb: { label: 'Dose', value: parseFloat(v.fpb.toFixed(2)), unit: 'flips per billion parameters', description: 'Injected flips divided by parameters, times 10^9.' },
      n50Flips: { label: '50 % Survival Tolerance', value: parseFloat(v.n50Flips.toFixed(1)), unit: 'flips', description: 'Absolute flips at which survival crosses 50 %, scaled from the Model A anchor.' },
      fpb50: { label: '50 % Tolerance Per Parameter', value: parseFloat(v.fpb50.toFixed(2)), unit: 'flips per billion parameters', description: 'The same tolerance in FPB.' },
      t50Days: { label: 'Mean Time To 50 % Tolerance', value: sig(v.t50Days), unit: 'days', description: 'Mean time for accumulated flips to reach the tolerance at the user-set upset rate.' },
      timeToN50Ratio: { label: 'Time Ratio Vs 3.09 B-Parameter Model', value: parseFloat(v.timeToN50Ratio.toFixed(3)), unit: '', description: 'Below 1 means the larger model reaches its tolerance sooner.' },
      expectedSurvival: { label: 'Expected Survival Per Interval', value: pct(v.expectedSurvival), unit: '%', description: 'Poisson-weighted survival over one scrub interval, under curve collapse.' },
      survivalAtInjectedFlips: { label: 'Survival At Injected Dose', value: pct(v.survivalAtInjectedFlips), unit: '%', description: 'Survival fraction after the injected flips.' },
      pBit14AtLeastOne: { label: 'P(At Least One Bit-14 Flip)', value: pct(v.pBit14AtLeastOne), unit: '%', description: '1 - (15/16)^N.' },
      pExponentAtLeastOne: { label: 'P(At Least One Exponent Flip)', value: pct(v.pExponentAtLeastOne), unit: '%', description: '1 - (11/16)^N.' },
      memoryPowerW: { label: 'Memory Power', value: parseFloat(v.memoryPowerW.toFixed(2)), unit: 'W', description: 'Weight-store size times power per gigabyte.' },
      eccExtraPowerW: { label: 'ECC Extra Power', value: parseFloat(v.eccExtraPowerW.toFixed(2)), unit: 'W', description: '12.5 % of memory power when SECDED is on.' },
    },
    warnings: result.diagnostics.filter((d) => d.severity !== 'info').map((d) => d.message),
  };
}
