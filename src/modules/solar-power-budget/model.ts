import type { Result } from '../../core/types';
import { solarPowerBudget } from './sandbox/module';

/**
 * Host framework presentation adapter for solar-power-budget.
 *
 * All physical calculations occur inside sandbox/kernel.ts at full floating-point
 * precision. This adapter formats results with rounded numbers and labels for
 * presentation in the generic ModuleShell.
 */
export function compute(inputs: Record<string, number>): Result {
  const result = solarPowerBudget.run(inputs);
  const v = result.values;

  const asPercent = (fraction: number) =>
    Number.isFinite(fraction) ? parseFloat((fraction * 100).toFixed(1)) : Number.POSITIVE_INFINITY;

  return {
    outputs: {
      orbitAveragePowerW: {
        label: 'Orbit Average Power',
        value: Math.round(v.orbitAveragePowerW),
        unit: 'W',
        description: 'Time-averaged electrical bus power generated over a complete orbital period, including eclipse and all derating effects.',
      },
      instantaneousSunlitPowerW: {
        label: 'Instantaneous Sunlit Power',
        value: Math.round(v.instantaneousSunlitPowerW),
        unit: 'W',
        description: 'Delivered bus power in direct sunlight at operating temperature and end-of-life condition.',
      },
      beginningOfLifePowerW: {
        label: 'BOL Peak Power (STC)',
        value: Math.round(v.beginningOfLifePowerW),
        unit: 'W',
        description: 'Beginning-of-life power under Standard Test Conditions (28 °C, no radiation degradation).',
      },
      orbitSunlitFraction: {
        label: 'Orbit Sunlit Fraction',
        value: asPercent(v.orbitSunlitFraction),
        unit: '%',
        description: 'Percentage of the orbital period spent illuminated by the Sun.',
      },
      orbitEclipseDurationMin: {
        label: 'Eclipse Duration',
        value: parseFloat(v.orbitEclipseDurationMin.toFixed(1)),
        unit: 'min',
        description: 'Duration spent inside Earth cylindrical shadow per orbital revolution.',
      },
      orbitPeriodMinutes: {
        label: 'Orbital Period',
        value: parseFloat(v.orbitPeriodMinutes.toFixed(1)),
        unit: 'min',
        description: 'Keplerian orbital period in minutes.',
      },
      orbitEnergyGeneratedWh: {
        label: 'Energy Per Orbit',
        value: Math.round(v.orbitEnergyGeneratedWh),
        unit: 'W·h',
        description: 'Total electrical energy delivered to the spacecraft bus per complete revolution.',
      },
      effectiveSystemEfficiency: {
        label: 'Net System Efficiency',
        value: asPercent(v.effectiveSystemEfficiency),
        unit: '%',
        description: 'End-to-end electrical efficiency from incident solar flux to delivered bus power in sunlight.',
      },
      temperatureDerateFactor: {
        label: 'Temperature Factor',
        value: asPercent(v.temperatureDerateFactor),
        unit: '%',
        description: 'Cell efficiency factor relative to STC 28 °C rating.',
      },
      radiationDerateFactor: {
        label: 'Radiation Retention',
        value: asPercent(v.radiationDerateFactor),
        unit: '%',
        description: 'Retained cell performance after cumulative mission radiation fluence.',
      },
    },
    warnings: result.diagnostics
      .filter((d) => d.severity !== 'info')
      .map((d) => d.message),
  };
}
