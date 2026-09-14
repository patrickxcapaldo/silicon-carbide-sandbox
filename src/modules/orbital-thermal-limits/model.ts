import type { Result } from '../../core/types';

const SIGMA = 5.670374419e-8;
const EARTH_RADIUS_KM = 6371;
const SOLAR_CONSTANT = 1361;

const n = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

/**
 * First-order orbital thermal balance.
 *
 * Positive loads are heat entering the spacecraft. Positive rejection is heat
 * leaving through the radiator. The compute limit is the remaining radiator
 * capacity after environmental and parasitic loads.
 */
export function compute(inputs: Record<string, number>): Result {
  const area = Math.max(0, n(inputs.radiatorArea, 2));
  const epsilon = Math.min(1, Math.max(0, n(inputs.emissivity, 0.9)));
  const alpha = Math.min(1, Math.max(0, n(inputs.solarAbsorptivity, 0.12)));
  const radTempK = n(inputs.operatingTempC, 70) + 273.15;
  const spaceSinkK = Math.max(3, n(inputs.sinkTempK, 180));
  const earthIrK = Math.max(3, n(inputs.earthIrTempK, 255));
  const earthView = Math.min(1, Math.max(0, n(inputs.earthViewFactor, 0.35)));
  const albedo = Math.min(1, Math.max(0, n(inputs.earthAlbedo, 0.3)));
  const solarFlux = Math.max(0, n(inputs.solarLoadWm2, SOLAR_CONSTANT));
  const sunIncidence = Math.min(1, Math.max(0, n(inputs.sunIncidence, 0.75)));
  const parasitic = Math.max(0, n(inputs.parasiticHeatW, 40));
  const coolantDeltaT = Math.max(0, n(inputs.coolantDeltaT, 10));
  const flow = Math.max(0, n(inputs.flowRateKgS, 0.35));
  const computeWattsRequested = Math.max(0, n(inputs.computeWattsRequested, 300));

  // The radiator is split into two faces. Area is the total emitting area.
  // Deep-space and Earth-facing portions are approximated with a user-visible
  // Earth view factor; the complementary fraction sees deep space.
  const deepSpaceFactor = 1 - earthView;
  const radiativeRejectionW = Math.max(0, epsilon * SIGMA * area * (
    deepSpaceFactor * (Math.pow(radTempK, 4) - Math.pow(spaceSinkK, 4)) +
    earthView * (Math.pow(radTempK, 4) - Math.pow(earthIrK, 4))
  ));

  // Solar and reflected solar loads are applied to the radiator's projected area.
  const projected = area * sunIncidence;
  const absorbedSolarW = alpha * solarFlux * projected;
  const absorbedAlbedoW = alpha * solarFlux * albedo * projected * earthView;
  const absorbedEarthIrW = epsilon * SIGMA * area * earthView * Math.pow(earthIrK, 4);
  const externalHeatW = absorbedSolarW + absorbedAlbedoW;

  // A simple loop transport ceiling: water-like coolant as a deliberately
  // generic engineering approximation. This is not a detailed two-phase model.
  const coolantCp = 4180;
  const transportCapacityW = flow * coolantCp * coolantDeltaT;
  const netRadiatorCapacityW = radiativeRejectionW - externalHeatW - parasitic;
  const maxTdpWatts = Math.max(0, Math.min(netRadiatorCapacityW, transportCapacityW));
  const computeDeficitW = computeWattsRequested - maxTdpWatts;
  const computeUtilization = maxTdpWatts > 0 ? computeWattsRequested / maxTdpWatts : (computeWattsRequested > 0 ? Infinity : 0);

  const warnings: string[] = [];
  if (netRadiatorCapacityW <= 0) warnings.push('External thermal loading and parasitic heat exceed net radiator rejection at the selected temperature.');
  if (transportCapacityW < netRadiatorCapacityW) warnings.push('Coolant transport capacity is the limiting factor; increase flow or allowable coolant ΔT.');
  if (radTempK <= spaceSinkK) warnings.push('Radiator temperature is at or below the effective space sink; net radiation is not physically available.');
  if (earthView > 0.75) warnings.push('High Earth view factor substantially reduces deep-space radiative rejection and increases Earth IR loading.');
  if (computeDeficitW > 0) warnings.push(`Requested compute power exceeds the rejectable heat budget by ${Math.round(computeDeficitW)} W; reduce compute load or increase radiator/coolant capacity.`);

  return {
    outputs: {
      maxTdpWatts: {
        label: 'Maximum Compute Heat', value: Math.round(maxTdpWatts), unit: 'W',
        description: 'Continuous compute heat that can be transported and rejected after environmental and parasitic loads.',
      },
      maxTdpKw: {
        label: 'Maximum Compute Heat', value: parseFloat((maxTdpWatts / 1000).toFixed(2)), unit: 'kW',
        description: 'Maximum continuous compute heat in kilowatts.',
      },
      radiativeRejectionW: {
        label: 'Gross Radiative Rejection', value: Math.round(radiativeRejectionW), unit: 'W',
        description: 'Net long-wave radiation leaving the radiator before external absorbed loads and parasitics.',
      },
      externalHeatW: {
        label: 'External Thermal Load', value: Math.round(externalHeatW), unit: 'W',
        description: 'Solar, albedo, and Earth infrared power absorbed by the radiator.',
      },
      transportCapacityW: {
        label: 'Coolant Transport Capacity', value: Math.round(transportCapacityW), unit: 'W',
        description: 'Approximate sensible heat transport capacity of the coolant loop.',
      },
      radiatorFluxWm2: {
        label: 'Radiator Heat Flux', value: Math.round(radiativeRejectionW / Math.max(area, 0.001)), unit: 'W/m²',
        description: 'Gross radiative rejection per square metre of total radiator area.',
      },
      orbitAltitudeKm: {
        label: 'Orbit Altitude', value: n(inputs.orbitAltitudeKm, 550), unit: 'km',
        description: 'Altitude above mean Earth radius.',
      },
      orbitEccentricity: { label: 'Eccentricity', value: n(inputs.orbitEccentricity, 0.01), unit: 'e', description: 'Orbital eccentricity.' },
      computeWattsRequested: {
        label: 'Requested Compute Power', value: Math.round(computeWattsRequested), unit: 'W',
        description: 'AI compute electrical power the operator wants to run continuously (assumed to convert almost entirely to waste heat).',
      },
      computeDeficitW: {
        label: 'Compute Thermal Deficit', value: Math.round(computeDeficitW), unit: 'W',
        description: 'Requested compute power minus the maximum rejectable heat. Positive means the load cannot be sustained thermally.',
      },
      computeUtilization: {
        label: 'Thermal Budget Utilization', value: Number.isFinite(computeUtilization) ? parseFloat((computeUtilization * 100).toFixed(1)) : 999,
        unit: '%', description: 'Requested compute power as a percentage of the maximum rejectable heat.',
      },
      orbitRadiusEarthRadii: {
        label: 'Orbit Radius', value: parseFloat(((EARTH_RADIUS_KM + n(inputs.orbitAltitudeKm, 550)) / EARTH_RADIUS_KM).toFixed(3)), unit: 'R⊕',
        description: 'Orbital radius expressed in Earth radii.',
      },
    },
    warnings,
  };
}
