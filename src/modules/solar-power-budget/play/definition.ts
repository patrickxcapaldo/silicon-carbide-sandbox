import { BUILD_INFO } from '../../../core/buildInfo';
import { orbitLever, scaleLever, stepLever, type LeverSpec } from '../../../core/play/levers';
import type { PlayDefinition, PlayEvaluation } from '../../../core/play/types';
import { INPUT_SPECS, solarPowerBudget } from '../sandbox/module';
import { MODULE_RELEASE_VERSION } from '../version';
import { ORBIT_PRESETS } from '../visualizer/orbitPresets';
import { formatWatts } from '../visualizer/format';
import { CLASSIC_LEVELS } from '../challenge/levels';

function spec(key: string): LeverSpec {
  const found = INPUT_SPECS.find((input) => input.key === key);
  if (!found || found.min === undefined || found.max === undefined) throw new Error(`Play: unknown input ${key}`);
  return { key, label: found.label, unit: found.unit, min: found.min, max: found.max };
}

function evaluate(inputs: Record<string, number>): PlayEvaluation {
  const result = solarPowerBudget.run(inputs);
  return {
    value: result.values.orbitAveragePowerW,
    rejected: result.diagnostics.some((item) => item.severity === 'error' || item.key !== undefined),
  };
}

export const solarPowerPlay: PlayDefinition = {
  id: 'solar-power-budget',
  title: 'Solar Array Electrical Power Budget',
  versionInfo: `Silicon Carbide Imperative Sandbox v${BUILD_INFO.sandboxVersion} · solar-power-budget v${MODULE_RELEASE_VERSION}`,
  metricLabel: 'orbit-average electrical power',
  intro: 'Orbit-average power is what the array delivers across a whole orbit, after eclipse, heat, radiation and system losses. Two changes are offered to the same generic array. Tap the one that delivers more.',
  format: (value) => formatWatts(value),
  scenarios: CLASSIC_LEVELS.map(({ id, title, inputs }) => ({ id, title: title.replace(/^Level \d+: /, ''), inputs })),
  evaluate,
  inputInfo: INPUT_SPECS.map(({ key, label, unit }) => ({ key, label, unit })),
  levers: [
    scaleLever(spec('solarArrayAreaM2'), [1.3, 3.5],
      'Power is proportional to array area.'),
    scaleLever(spec('baseCellEfficiency'), [1.05, 1.3],
      'Power is proportional to base cell efficiency.'),
    stepLever(spec('cellOperatingTempC'), [-45, -10],
      'Output falls linearly as cells run hotter than 28 °C, at the cell’s temperature coefficient per kelvin.'),
    scaleLever(spec('missionDurationYears'), [0.2, 0.6],
      'Radiation and ageing compound each year, so output after t years is (1 − annual rate)^t of the starting value.'),
    scaleLever(spec('annualDegradationRate'), [0.2, 0.6],
      'Radiation and ageing compound each year, so output after t years is (1 − annual rate)^t of the starting value.'),
    scaleLever(spec('bosEfficiency'), [1.03, 1.12],
      'Power is proportional to balance-of-system efficiency.'),
    orbitLever(ORBIT_PRESETS,
      'Orbit sets how long the array sits in Earth’s shadow, and orbit-average power scales with the sunlit fraction.'),
  ],
};
