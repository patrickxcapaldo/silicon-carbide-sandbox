import type { Manifest } from '../../core/types';
import { equations } from './equations';
import { MODULE_CONTRACT_VERSION, MODULE_RELEASE_VERSION } from './version';
import { INPUT_SPECS } from './sandbox/module';

const STEP: Record<string, number> = {
  modelParamsBillions: 0.01,
  bytesPerParam: 0.5,
  upsetRateFlipsPerGbMonth: 0.01,
  scrubIntervalDays: 0.5,
  toleranceExponent: 0.01,
  weightMagnitude: 0.001,
  injectedFlips: 1,
  eccEnabled: 1,
  mbuFraction: 0.01,
  memoryWPerGb: 0.005,
  assumeCleanAtZero: 1,
};

const TITLE: Record<string, string> = {
  modelParamsBillions: 'Model Parameters',
  bytesPerParam: 'Bytes Per Parameter',
  upsetRateFlipsPerGbMonth: 'Upset Rate',
  scrubIntervalDays: 'Scrub Interval',
  toleranceExponent: 'Tolerance Exponent',
  weightMagnitude: 'Weight Magnitude',
  injectedFlips: 'Injected Flips',
  eccEnabled: 'SECDED ECC (Analytic)',
  mbuFraction: 'Multi-Bit Upset Fraction',
  memoryWPerGb: 'Memory Power',
  assumeCleanAtZero: 'Assume Clean At Zero',
};

export const manifest: Manifest = {
  id: 'llm-bitflip-resilience',
  releaseVersion: MODULE_RELEASE_VERSION,
  contractVersion: MODULE_CONTRACT_VERSION,
  title: 'LLM Bit-Flip Resilience',
  summary:
    'How long does a language-model weight store survive accumulating bit flips? A larger model tolerates more flips but presents more memory to be hit, so survival time depends on tolerance divided by exposure. A Sketch built on two measured models, one software stack and a software fault model.',
  tags: ['space', 'radiation-effects', 'ai-infrastructure', 'reliability', 'memory', 'sketch'],
  relatedArticles: [],
  interfaces: ['orbital-thermal-limits', 'solar-power-budget'],
  parameters: INPUT_SPECS.map((s) => ({
    id: s.key,
    name: TITLE[s.key] ?? s.label,
    unit: s.unit,
    min: s.min ?? 0,
    max: s.max ?? 1,
    step: STEP[s.key] ?? 0.01,
    defaultValue: s.defaultValue,
    description: s.description,
  })),
  equations,
};
