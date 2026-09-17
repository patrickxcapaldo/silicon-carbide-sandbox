/**
 * Pure physics kernel for the orbital thermal and power balance.
 *
 * This file contains the entire model and nothing else. It imports no React,
 * no Three.js and no host framework types, so it runs unchanged in a browser,
 * under Node, in a worker or inside another module. Every consumer, including
 * the 3D visualisation, calls this and only this, so there is exactly one
 * implementation of the physics.
 *
 * All values here are full precision in canonical SI-ish units. Rounding,
 * percentage conversion and human labelling happen in the presentation
 * adapters, never here.
 */

export const STEFAN_BOLTZMANN = 5.670374419e-8; // W/m²K⁴
export const EARTH_RADIUS_KM = 6371;
export const SOLAR_CONSTANT_WM2 = 1361;
/** Deliberately generic water-like coolant. See assumptions in descriptor.ts. */
export const COOLANT_CP_J_KG_K = 4180;

export type ThermalKernelInputs = {
  radiatorArea: number;
  emissivity: number;
  solarAbsorptivity: number;
  operatingTempC: number;
  sinkTempK: number;
  earthIrTempK: number;
  earthViewFactor: number;
  earthAlbedo: number;
  solarLoadWm2: number;
  sunIncidence: number;
  flowRateKgS: number;
  coolantDeltaT: number;
  parasiticHeatW: number;
  computeWattsRequested: number;
  solarPanelAreaM2: number;
  solarPanelEfficiency: number;
  solarPanelPointingFactor: number;
};

export type ThermalStatus = 'SAFE' | 'MARGIN' | 'LIMIT' | 'OVERHEATING';

export type ThermalKernelOutputs = {
  /** Gross long-wave radiation leaving the radiator, before absorbed loads. */
  radiativeRejectionW: number;
  absorbedSolarW: number;
  absorbedAlbedoW: number;
  /** Earth infrared absorbed by the radiator. Already accounted for inside
   *  radiativeRejectionW via the two-background split, so it is reported for
   *  visualisation and diagnosis but deliberately not added again to
   *  externalHeatW. */
  absorbedEarthIrW: number;
  externalHeatW: number;
  transportCapacityW: number;
  netRadiatorCapacityW: number;
  /** Heat rejection ceiling, the binding minimum of radiator and loop. */
  maxComputeHeatW: number;
  radiatorFluxWm2: number;
  computeDeficitW: number;
  /** Fraction, not a percentage. Infinity when the ceiling is zero. */
  computeUtilisation: number;
  generatedPowerW: number;
  busElectricalLoadW: number;
  powerDeficitW: number;
  powerUtilisation: number;
  /** Worse of the two utilisations, which is what the status reflects. */
  overallUtilisation: number;
};

/** Utilisation bands. Exported so the UI cannot drift from the model. */
export const MARGIN_THRESHOLD = 0.60;
export const LIMIT_THRESHOLD = 0.85;

export function classifyStatus(o: ThermalKernelOutputs): ThermalStatus {
  if (o.maxComputeHeatW <= 0 || o.computeDeficitW > 0 || o.powerDeficitW > 0) return 'OVERHEATING';
  if (o.overallUtilisation > LIMIT_THRESHOLD) return 'LIMIT';
  if (o.overallUtilisation > MARGIN_THRESHOLD) return 'MARGIN';
  return 'SAFE';
}

function ratio(numerator: number, denominator: number): number {
  if (denominator > 0) return numerator / denominator;
  return numerator > 0 ? Infinity : 0;
}

/**
 * Run the thermal and power balance. Inputs are assumed already resolved and
 * clamped by the contract layer, so this function does no defaulting: it is
 * the physics and nothing else.
 */
export function runThermalKernel(i: ThermalKernelInputs): ThermalKernelOutputs {
  const radTempK = i.operatingTempC + 273.15;

  // The radiator sees two backgrounds: cold deep space over the fraction of
  // its field of view that is not Earth, and much warmer Earth over the rest.
  const deepSpaceFactor = 1 - i.earthViewFactor;
  const radiativeRejectionW = Math.max(0, i.emissivity * STEFAN_BOLTZMANN * i.radiatorArea * (
    deepSpaceFactor * (Math.pow(radTempK, 4) - Math.pow(i.sinkTempK, 4)) +
    i.earthViewFactor * (Math.pow(radTempK, 4) - Math.pow(i.earthIrTempK, 4))
  ));

  const projectedArea = i.radiatorArea * i.sunIncidence;
  const absorbedSolarW = i.solarAbsorptivity * i.solarLoadWm2 * projectedArea;
  const absorbedAlbedoW = i.solarAbsorptivity * i.solarLoadWm2 * i.earthAlbedo * projectedArea * i.earthViewFactor;
  const absorbedEarthIrW = i.emissivity * STEFAN_BOLTZMANN * i.radiatorArea * i.earthViewFactor * Math.pow(i.earthIrTempK, 4);
  const externalHeatW = absorbedSolarW + absorbedAlbedoW;

  const transportCapacityW = i.flowRateKgS * COOLANT_CP_J_KG_K * i.coolantDeltaT;
  const netRadiatorCapacityW = radiativeRejectionW - externalHeatW - i.parasiticHeatW;
  const maxComputeHeatW = Math.max(0, Math.min(netRadiatorCapacityW, transportCapacityW));

  const computeDeficitW = i.computeWattsRequested - maxComputeHeatW;
  const computeUtilisation = ratio(i.computeWattsRequested, maxComputeHeatW);

  const generatedPowerW = i.solarLoadWm2 * i.solarPanelAreaM2 * i.solarPanelEfficiency * i.solarPanelPointingFactor;
  const busElectricalLoadW = i.computeWattsRequested + i.parasiticHeatW;
  const powerDeficitW = busElectricalLoadW - generatedPowerW;
  const powerUtilisation = ratio(busElectricalLoadW, generatedPowerW);

  return {
    radiativeRejectionW,
    absorbedSolarW,
    absorbedAlbedoW,
    absorbedEarthIrW,
    externalHeatW,
    transportCapacityW,
    netRadiatorCapacityW,
    maxComputeHeatW,
    radiatorFluxWm2: radiativeRejectionW / Math.max(i.radiatorArea, 1e-6),
    computeDeficitW,
    computeUtilisation,
    generatedPowerW,
    busElectricalLoadW,
    powerDeficitW,
    powerUtilisation,
    overallUtilisation: Math.max(computeUtilisation, powerUtilisation),
  };
}

/**
 * Physical observations about a result, expressed as plain statements. Kept
 * separate from the numbers so that any consumer can decide how to present
 * them, and so that a headless caller gets exactly the same set the UI shows.
 */
export function kernelWarnings(i: ThermalKernelInputs, o: ThermalKernelOutputs): string[] {
  const w: string[] = [];
  if (o.netRadiatorCapacityW <= 0) {
    w.push('External thermal loading and parasitic heat exceed net radiator rejection at the selected temperature.');
  }
  if (o.transportCapacityW < o.netRadiatorCapacityW) {
    w.push('Coolant transport capacity is the limiting factor. Increase the flow rate or the allowable coolant temperature rise.');
  }
  if (i.operatingTempC + 273.15 <= i.sinkTempK) {
    w.push('Radiator temperature is at or below the effective space sink, so net radiation is not physically available.');
  }
  if (i.earthViewFactor > 0.75) {
    w.push('A high Earth view factor substantially reduces deep-space radiative rejection and increases Earth infrared loading.');
  }
  if (o.computeDeficitW > 0) {
    w.push(`Requested compute power exceeds the rejectable heat budget by ${Math.round(o.computeDeficitW)} W. Reduce the compute load or increase radiator and coolant capacity.`);
  }
  if (o.powerDeficitW > 0) {
    w.push(`Requested electrical load exceeds solar array generation by ${Math.round(o.powerDeficitW)} W, and no eclipse battery buffering is modelled. Reduce the load, add array area, or improve Sun pointing.`);
  }
  return w;
}
