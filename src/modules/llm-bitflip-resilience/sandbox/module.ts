import {
  DIMENSIONLESS,
  DIM_POWER,
  DIM_TIME,
  resolveInputs,
  type Diagnostic,
  type ModuleDescriptor,
  type ModuleResult,
  type OutputSpec,
  type PortSpec,
  type SandboxModule,
} from '../../../core/contract';
import { MODULE_CONTRACT_VERSION, MODULE_RELEASE_VERSION } from '../version';
import { DEFAULT_ALPHA, DEFAULT_WEIGHT_MAGNITUDE, kernelWarnings, runKernel, type KernelInputs, type KernelOutputs } from './kernel';

export const INPUT_SPECS: PortSpec[] = [
  {
    key: 'modelParamsBillions', label: 'Model parameters', unit: 'B', dimension: DIMENSIONLESS,
    min: 0.1, max: 1000, defaultValue: 8.03,
    description: 'Total parameter count of the weight store, in billions. The paper measured 3.09 B and 8.03 B; anything outside that is extrapolation.',
    typicalSource: 'A model card or architecture table.',
  },
  {
    key: 'bytesPerParam', label: 'Bytes per parameter', unit: 'B', dimension: DIMENSIONLESS,
    min: 0.5, max: 4, defaultValue: 2,
    description: 'Storage per weight. FP16 is 2 bytes. Only the exposed footprint responds to this, so time to tolerance scales as 1 / bytes; the dose-response data are FP16-only and the result is not a quantisation finding.',
  },
  {
    key: 'upsetRateFlipsPerGbMonth', label: 'Upset rate', unit: 'flips/GB/month', dimension: DIMENSIONLESS,
    min: 1e-4, max: 1e6, defaultValue: 1,
    description: 'User-set single-bit upset rate. The paper does not measure or model radiation flux. Its illustrative cruise-altitude range, quoting JESD89A, is 0.01 to 10 flips/GB/month. Values outside that are user-defined and unvalidated.',
  },
  {
    key: 'scrubIntervalDays', label: 'Scrub or reload interval', unit: 'days', dimension: DIM_TIME,
    min: 0.01, max: 3650, defaultValue: 30,
    description: 'Time between full weight reloads or scrubs. For no scrubbing, set it to the mission length. Persistent corruption is assumed until then.',
    typicalSource: 'A mission timeline or an operations-concept module.',
  },
  {
    key: 'toleranceExponent', label: 'Tolerance exponent', unit: '', dimension: DIMENSIONLESS,
    min: 0, max: 1.2, defaultValue: DEFAULT_ALPHA,
    description: 'Exponent alpha in N50 = N50_ref x (N / N_ref)^alpha. 1 is scale-invariant per-parameter tolerance. 0.32 is a two-point fit to two models, not a scaling law; the measured crossings imply about 0.14 to 0.50.',
  },
  {
    key: 'weightMagnitude', label: 'Weight magnitude', unit: '', dimension: DIMENSIONLESS,
    min: 6.2e-5, max: 65504, defaultValue: DEFAULT_WEIGHT_MAGNITUDE,
    description: 'Illustrative magnitude of a weight for the bit-anatomy view. Not profiled for the paper’s checkpoints.',
  },
  {
    key: 'injectedFlips', label: 'Injected flips', unit: 'flips', dimension: DIMENSIONLESS,
    min: 0, max: 1000, defaultValue: 40,
    description: 'Dose for the dose view. The paper measured 20 to 80 flips.',
  },
  {
    key: 'eccEnabled', label: 'SECDED ECC (analytic)', unit: '', dimension: DIMENSIONLESS,
    min: 0, max: 1, defaultValue: 0,
    description: '1 enables the analytic SECDED (72,64) extension. Not measured by RadiAI.',
  },
  {
    key: 'mbuFraction', label: 'Multi-bit upset fraction', unit: '', dimension: DIMENSIONLESS,
    min: 0, max: 1, defaultValue: 0,
    description: 'Fraction of upset events that put two or more flips in one 64-bit word. 0 is the paper’s fault model.',
  },
  {
    key: 'memoryWPerGb', label: 'Memory power', unit: 'W/GB', dimension: DIMENSIONLESS,
    min: 0, max: 5, defaultValue: 0.375,
    description: 'Power per gigabyte of memory. Default is a vendor rule of thumb (about 3 W per 8 GB for DDR3/DDR4); a placeholder, not a value for the memory in your design.',
    typicalSource: 'A memory datasheet.',
  },
  {
    key: 'assumeCleanAtZero', label: 'Assume clean at zero flips', unit: '', dimension: DIMENSIONLESS,
    min: 0, max: 1, defaultValue: 1,
    description: '1 assumes survival is 100 % at zero flips and interpolates linearly to the 20-flip point. Below 20 flips there are no data.',
  },
];

export const OUTPUT_SPECS: OutputSpec[] = [
  { key: 'memoryFootprintGb', label: 'Weight store size', unit: 'GB', dimension: DIMENSIONLESS, kind: 'indicator', description: 'Parameters x bytes per parameter, decimal gigabytes. This is the exposed area.' },
  { key: 'storageWithEccGb', label: 'Storage with ECC check bits', unit: 'GB', dimension: DIMENSIONLESS, kind: 'indicator', description: 'Weight store plus 12.5 % SECDED check bits when ECC is on.' },
  { key: 'fpb', label: 'Dose', unit: 'flips per billion parameters', dimension: DIMENSIONLESS, kind: 'indicator', description: 'Injected flips divided by parameters, times 10^9.' },
  { key: 'n50Flips', label: '50 % survival tolerance', unit: 'flips', dimension: DIMENSIONLESS, kind: 'indicator', description: 'Absolute flips at which survival crosses 50 %, scaled from the Model A anchor.' },
  { key: 'fpb50', label: '50 % survival tolerance per parameter', unit: 'flips per billion parameters', dimension: DIMENSIONLESS, kind: 'indicator', description: 'The same tolerance in FPB.' },
  { key: 't50Days', label: 'Mean time to 50 % tolerance', unit: 'days', dimension: DIM_TIME, kind: 'quantity', description: 'Mean time for accumulated flips to reach the 50 % tolerance at the user-set upset rate.' },
  { key: 'timeToN50Ratio', label: 'Time ratio against the smaller model', unit: '', dimension: DIMENSIONLESS, kind: 'indicator', description: 't50 of this model divided by t50 of the 3.09 B model at the same rate and exponent. Equals (N / N_small)^(alpha - 1) without ECC.' },
  { key: 'expectedSurvival', label: 'Expected survival over one interval', unit: '', dimension: DIMENSIONLESS, kind: 'indicator', description: 'Poisson-weighted survival after one scrub interval, under curve collapse.' },
  { key: 'survivalAtInjectedFlips', label: 'Survival at the injected dose', unit: '', dimension: DIMENSIONLESS, kind: 'indicator', description: 'Survival fraction after the injected flips, under curve collapse.' },
  { key: 'lambdaFlips', label: 'Expected raw flips per interval', unit: 'flips', dimension: DIMENSIONLESS, kind: 'indicator', description: 'Rate x size x interval.' },
  { key: 'effectiveFlips', label: 'Effective flips per interval', unit: 'flips', dimension: DIMENSIONLESS, kind: 'indicator', description: 'Raw flips without ECC; 2 x uncorrectable events with SECDED.' },
  { key: 'unmeasuredMass', label: 'Probability beyond measured dose', unit: '', dimension: DIMENSIONLESS, kind: 'indicator', description: 'Poisson mass beyond the measured dose range, where survival continues at a constant-hazard decay (an assumption, not a measurement).' },
  { key: 'pBit14AtLeastOne', label: 'P(at least one bit-14 flip)', unit: '', dimension: DIMENSIONLESS, kind: 'indicator', description: '1 - (15/16)^N for N injected flips.' },
  { key: 'pExponentAtLeastOne', label: 'P(at least one exponent flip)', unit: '', dimension: DIMENSIONLESS, kind: 'indicator', description: '1 - (11/16)^N for N injected flips.' },
  { key: 'bit14Factor', label: 'Bit-14 flip factor', unit: '', dimension: DIMENSIONLESS, kind: 'indicator', description: 'Multiplicative change from flipping bit 14 of a weight of the chosen magnitude.' },
  { key: 'scSurvivorShareLow', label: 'Semantic Collapse share of survivors, low', unit: '', dimension: DIMENSIONLESS, kind: 'indicator', description: 'Lower end of the paper’s reported range for this dose region.' },
  { key: 'scSurvivorShareHigh', label: 'Semantic Collapse share of survivors, high', unit: '', dimension: DIMENSIONLESS, kind: 'indicator', description: 'Upper end of the paper’s reported range for this dose region.' },
  { key: 'memoryPowerW', label: 'Memory power', unit: 'W', dimension: DIM_POWER, kind: 'quantity', description: 'Weight-store size x power per gigabyte. Feeds a thermal module’s compute or parasitic heat inputs.' },
  { key: 'eccExtraPowerW', label: 'ECC extra power', unit: 'W', dimension: DIM_POWER, kind: 'quantity', description: '12.5 % of the memory power when SECDED is on, else 0.' },
];

export const DESCRIPTOR: ModuleDescriptor = {
  id: 'llm-bitflip-resilience',
  releaseVersion: MODULE_RELEASE_VERSION,
  contractVersion: MODULE_CONTRACT_VERSION,
  title: 'LLM bit-flip resilience',
  summary: 'How long a language-model weight store survives accumulating bit flips: survival time is set by tolerance divided by exposure, and model size changes both.',
  domains: ['radiation effects', 'reliability', 'machine learning', 'memory systems'],
  inputs: INPUT_SPECS,
  outputs: OUTPUT_SPECS,
  assumptions: [
    'Software fault model, not a physical one: independent single-bit flips are injected into weights. Particle cross-sections, spatially correlated strikes and clustered multi-bit upsets are not measured.',
    'No physical flux model. The upset rate is a user-set input in flips per GB per month; shipped presets are limited to the paper’s illustrative cruise-altitude range.',
    'Uniform layer sampling in the measurements. This over-represents small layers compared with a bit-uniform physical exposure.',
    'Persistent corruption: a flipped bit stays wrong until the next scrub or reload. Transient upsets in logic are not modelled.',
    'FP16 weights only. Integer-quantised models are not measured, and a different precision changes only the exposed footprint here, so time to tolerance scales as 1 / bytes per parameter. That is not a measured benefit of quantisation.',
    'Instruction-tuned models only, with greedy decoding, on one software and hardware stack. Changing the stack shifted the measured tolerance by about a factor of two in the paper.',
    'Two models and two independent batches of 25 trials per dose level. The paper states the data cannot distinguish scale-invariance from mildly sub-linear scaling. On this module\'s own residual check, exact scale-invariance (alpha = 1) fits the smaller model worse than alpha near 0.3 to 0.5, and the measured crossings imply alpha of about 0.14 to 0.50; two models cannot pin the exponent down.',
    'The logistic fits for the smaller model are weakly identified because survival stays nonzero at the highest dose; the empirical 50 % crossings are the primary summary.',
    'Curve collapse, S(n | N) = S_ref(n / (N / N_ref)^alpha), and the exponent alpha are assumptions of this module, not findings. The default alpha of 0.32 is a two-point fit, not a scaling law.',
    'Survival is defined as accuracy greater than zero, so it counts every trial that is not dead, including chance-level ones (chance is 25 %). The intact share (within 10 points of clean) is lower. Semantic Collapse is defined as parseable answers with accuracy at or below 40 % (15 points above the 25 % chance floor); the outcome counts follow the paper\'s Figure 6 legend, 0 < accuracy <= 40 %, with accuracy 0 counted as dead.',
    'Survival below 20 flips is not measured; with the clean-at-zero toggle on it is interpolated from 100 % at zero. Above 80 flips the curve continues from its last measured value at a constant hazard, exp(-(n - 80) / n0) with n0 fitted to the reference model\'s measured doses (about 59 flips). That is an assumption about the unmeasured tail, not a measurement.',
    'Exposure is bit-uniform over the whole weight store (parameters times bytes), but the measurements flipped bits uniformly across layers of the linear weight matrices; embedding tables, layer norms and biases were never injected. Whether this difference raises or lowers the real tolerance is not measured.',
    'Upsets arrive as a Poisson process in time, independent of the model state. The expected-survival sum is taken over one scrub interval.',
    'SECDED (72,64) analytics are an extension not measured by RadiAI: independent single-bit upsets, double-hit rate lambda^2 / (2W), two corrupted bits per uncorrectable event, no reload on detection, and no upsets in logic, SRAM, caches, controllers or the check bits themselves.',
    'Memory power uses a user-set watts-per-gigabyte figure; the default is a vendor rule of thumb and a placeholder.',
  ],
};

export type BitflipResult = ModuleResult<KernelOutputs>;

export const llmBitflipResilience: SandboxModule<KernelOutputs> = {
  descriptor: DESCRIPTOR,
  run(inputs: Partial<Record<string, number>>): BitflipResult {
    const { resolved, diagnostics } = resolveInputs(INPUT_SPECS, inputs);
    const k = resolved as unknown as KernelInputs;
    const outputs = runKernel(k);
    const all: Diagnostic[] = [
      ...diagnostics,
      ...kernelWarnings(k, outputs).map((message): Diagnostic => ({ severity: 'warning', message })),
    ];
    return { values: outputs, diagnostics: all, resolvedInputs: resolved };
  },
};
