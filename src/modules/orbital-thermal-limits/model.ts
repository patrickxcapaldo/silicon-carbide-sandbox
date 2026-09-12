import type { Result } from '../../core/types';

// Stefan-Boltzmann Constant (W / (m² · K⁴))
const SIGMA = 5.670374419e-8;

export function compute(inputs: Record<string, number>): Result {
  const { radiatorArea, emissivity, operatingTempC, sinkTempK } = inputs;

  // Convert operating temperature from Celsius to Kelvin
  const tempK = operatingTempC + 273.15;

  // Stefan-Boltzmann Law: Q = epsilon * sigma * Area * (T_rad^4 - T_sink^4)
  const radiatedPowerWatts =
    emissivity * SIGMA * radiatorArea * (Math.pow(tempK, 4) - Math.pow(sinkTempK, 4));

  const warnings: string[] = [];
  if (radiatedPowerWatts < 500) {
    warnings.push('Power rejection capacity is extremely low (< 500W). High-performance AI accelerators (e.g. H100/B200) will rapidly thermal-throttle.');
  }

  return {
    outputs: {
      maxTdpWatts: {
        label: 'Max TDP Rejection Capacity',
        value: Math.round(radiatedPowerWatts),
        unit: 'W',
        description: 'Maximum continuous electrical power compute load the radiator can reject.',
      },
      maxTdpKw: {
        label: 'Max Rejection Capacity (kW)',
        value: parseFloat((radiatedPowerWatts / 1000).toFixed(2)),
        unit: 'kW',
        description: 'Thermal rejection capacity converted to kilowatts.',
      },
    },
    warnings,
  };
}