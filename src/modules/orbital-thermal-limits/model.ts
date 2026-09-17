import type { Result } from '../../core/types';
import { orbitalThermalLimits } from './sandbox/module';
import { EARTH_RADIUS_KM } from './sandbox/kernel';

/**
 * Host framework adapter.
 *
 * The physics lives in `sandbox/kernel.ts` and the composable interface in
 * `sandbox/module.ts`. This file exists only to present those results in the
 * shape the surrounding site expects: rounded numbers, display labels and
 * flat warning strings.
 *
 * Rounding happens here and nowhere else. Anything that needs full precision,
 * including the 3D visualisation and any downstream module, should call
 * `orbitalThermalLimits.run()` instead of this function.
 */
export function compute(inputs: Record<string, number>): Result {
  const result = orbitalThermalLimits.run(inputs);
  const v = result.values;
  const inputOr = (key: string, fallback: number) => {
    const supplied = inputs[key];
    return typeof supplied === 'number' && Number.isFinite(supplied) ? supplied : fallback;
  };

  const asPercent = (fraction: number) =>
    Number.isFinite(fraction) ? parseFloat((fraction * 100).toFixed(1)) : Number.POSITIVE_INFINITY;

  return {
    outputs: {
      maxTdpWatts: {
        label: 'Maximum Compute Heat', value: Math.round(v.maxComputeHeatW), unit: 'W',
        description: 'Continuous compute heat that can be transported and rejected after environmental and parasitic loads.',
      },
      maxTdpKw: {
        label: 'Maximum Compute Heat', value: parseFloat((v.maxComputeHeatW / 1000).toFixed(2)), unit: 'kW',
        description: 'Maximum continuous compute heat in kilowatts.',
      },
      radiativeRejectionW: {
        label: 'Gross Radiative Rejection', value: Math.round(v.radiativeRejectionW), unit: 'W',
        description: 'Net long-wave radiation leaving the radiator before external absorbed loads and parasitics.',
      },
      externalHeatW: {
        label: 'External Thermal Load', value: Math.round(v.externalHeatW), unit: 'W',
        description: 'Solar and albedo power absorbed by the radiator.',
      },
      transportCapacityW: {
        label: 'Coolant Transport Capacity', value: Math.round(v.transportCapacityW), unit: 'W',
        description: 'Approximate sensible heat transport capacity of the coolant loop.',
      },
      radiatorFluxWm2: {
        label: 'Radiator Heat Flux', value: Math.round(v.radiatorFluxWm2), unit: 'W/m²',
        description: 'Gross radiative rejection per square metre of total radiator area.',
      },
      orbitAltitudeKm: {
        label: 'Orbit Altitude', value: inputOr('orbitAltitudeKm', 550), unit: 'km',
        description: 'Altitude above mean Earth radius at perigee.',
      },
      orbitEccentricity: {
        label: 'Eccentricity', value: inputOr('orbitEccentricity', 0.01), unit: '',
        description: 'Orbital eccentricity, where 0 is circular.',
      },
      computeWattsRequested: {
        label: 'Requested Compute Power', value: Math.round(result.resolvedInputs.computeWattsRequested), unit: 'W',
        description: 'AI compute electrical power to be run continuously, assumed to convert almost entirely to waste heat.',
      },
      computeDeficitW: {
        label: 'Compute Thermal Deficit', value: Math.round(v.computeDeficitW), unit: 'W',
        description: 'Requested compute power minus the maximum rejectable heat. A positive value means the load cannot be sustained thermally.',
      },
      computeUtilization: {
        label: 'Thermal Budget Utilisation', value: asPercent(v.computeUtilisation), unit: '%',
        description: 'Requested compute power as a percentage of the maximum rejectable heat.',
      },
      generatedPowerW: {
        label: 'Solar Array Power', value: Math.round(v.generatedPowerW), unit: 'W',
        description: 'Electrical power produced by the solar array given current sunlight, area, efficiency and Sun-pointing accuracy.',
      },
      powerDeficitW: {
        label: 'Electrical Power Deficit', value: Math.round(v.powerDeficitW), unit: 'W',
        description: 'Requested compute plus bus electrical load, minus solar array generation. A positive value means the array cannot currently supply the load. No battery buffering is modelled.',
      },
      powerUtilization: {
        label: 'Power Budget Utilisation', value: asPercent(v.powerUtilisation), unit: '%',
        description: 'Requested electrical load as a percentage of solar array generation.',
      },
      orbitRadiusEarthRadii: {
        label: 'Orbit Radius',
        value: parseFloat(((EARTH_RADIUS_KM + inputOr('orbitAltitudeKm', 550)) / EARTH_RADIUS_KM).toFixed(3)),
        unit: 'R⊕',
        description: 'Orbital radius expressed in Earth radii.',
      },
    },
    warnings: result.diagnostics
      .filter((d) => d.severity !== 'info')
      .map((d) => d.message),
  };
}
