import { BUILD_INFO } from '../../../core/buildInfo';
import { orbitLever, scaleLever, stepLever, type LeverSpec } from '../../../core/play/levers';
import type { PlayDefinition, PlayEvaluation } from '../../../core/play/types';
import { INPUT_SPECS, orbitalThermalLimits } from '../sandbox/module';
import { MODULE_RELEASE_VERSION } from '../version';
import { ORBIT_PRESETS } from '../visualizer/orbitPresets';
import { formatWatts } from '../visualizer/format';
import { ceilingsOf } from '../challenge/ceilings';
import { CHALLENGE_LEVELS } from '../challenge/levels';

function spec(key: string): LeverSpec {
  const found = INPUT_SPECS.find((input) => input.key === key);
  if (!found || found.min === undefined || found.max === undefined) throw new Error(`Play: unknown input ${key}`);
  return { key, label: found.label, unit: found.unit, min: found.min, max: found.max };
}

function evaluate(inputs: Record<string, number>): PlayEvaluation {
  const result = orbitalThermalLimits.run(inputs);
  const ceilings = ceilingsOf(result);
  return {
    value: Math.min(ceilings.radiator, ceilings.coolant, ceilings.power),
    binding: ceilings.answer,
    rejected: result.diagnostics.some((item) => item.severity === 'error' || item.key !== undefined),
  };
}

export const orbitalThermalPlay: PlayDefinition = {
  id: 'orbital-thermal-limits',
  title: 'Orbital Compute Thermal Rejection Limits',
  versionInfo: `Silicon Carbide Imperative Sandbox v${BUILD_INFO.sandboxVersion} · orbital-thermal-limits v${MODULE_RELEASE_VERSION}`,
  metricLabel: 'sustainable compute power',
  intro: 'Sustainable compute power is the lowest of three ceilings: radiator, coolant and electrical power. Two changes are offered to the same generic satellite. Tap the one that leaves it able to run more.',
  format: (value) => formatWatts(value),
  scenarios: CHALLENGE_LEVELS.map(({ id, title, inputs }) => ({ id, title: title.replace(/^Level \d+: /, ''), inputs })),
  evaluate,
  bindingLabels: { radiator: 'radiator', coolant: 'coolant loop', power: 'electrical power' },
  inputInfo: INPUT_SPECS.map(({ key, label, unit }) => ({ key, label, unit })),
  levers: [
    scaleLever(spec('radiatorArea'), [1.3, 3.5],
      'Radiator rejection and absorbed sunlight both grow with area, so extra area only helps while the radiator is the limit.'),
    stepLever(spec('operatingTempC'), [8, 35],
      'Radiated power rises with the fourth power of absolute temperature, so a hotter radiator rejects far more per square metre.'),
    scaleLever(spec('flowRateKgS'), [1.3, 3.5],
      'Coolant transport is flow × specific heat × temperature rise, so it scales directly with flow.'),
    scaleLever(spec('coolantDeltaT'), [1.3, 2.5],
      'Coolant transport is flow × specific heat × temperature rise, so it scales directly with the allowed rise.'),
    scaleLever(spec('solarPanelAreaM2'), [1.3, 3.5],
      'Array power is proportional to array area, so a bigger array only helps while electrical power is the limit.'),
    scaleLever(spec('solarPanelEfficiency'), [1.1, 1.35],
      'Array power is proportional to cell efficiency, so better cells only help while electrical power is the limit.'),
    orbitLever(ORBIT_PRESETS,
      'Orbit sets how long the array sits in Earth’s shadow, and orbit-average array power scales with the sunlit fraction.'),
  ],
};
