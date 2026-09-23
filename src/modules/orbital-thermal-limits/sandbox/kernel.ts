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

import { orbitalPeriodSeconds, sunlitFraction, type Vec3 } from './orbitalMechanics';

export const STEFAN_BOLTZMANN = 5.670374419e-8; // W/m²K⁴
export const EARTH_RADIUS_KM = 6371;
export const SOLAR_CONSTANT_WM2 = 1361;
/**
 * Real single-phase spacecraft coolant loops use synthetic dielectric
 * fluids such as Galden PFPE or Fluorinert, chosen because they do not
 * freeze solid or become electrically conductive if a line ever leaks near
 * live electronics, unlike a water or water-glycol mixture. Their specific
 * heat is markedly lower than water's 4184 J/kg·K. 1050 J/kg·K is
 * representative of Galden PFPE and is used here as the default; the
 * previous version of this model used water's specific heat, which
 * overstated the loop's transport capacity by roughly a factor of four for
 * the same flow rate and temperature rise.
 */
export const COOLANT_CP_J_KG_K = 1050;

/**
 * Tier 1 law limit (dossier §5.2, §5.3-A): the minimum two-sided radiator
 * area a perfect emitter would need to reject `computeWattsRequested` watts
 * against a deep-space sink, with no environmental loads at all. This is the
 * ceiling physics allows, not a design; it deliberately ignores everything
 * `runThermalKernel` accounts for (view factor, solar/albedo load, coolant
 * transport, parasitics), so it is always <= any realistic demonstrated
 * envelope for the same power level.
 *
 * A = P / (2q), q = epsilon * sigma * (T_r^4 - T_sink^4)   [dossier §5.3-A]
 *
 * Kept as a standalone function, not derived from `runThermalKernel`, so
 * that it stays independently checkable against the closed-form arithmetic
 * in Study 01 and the golden vectors.
 */
export function lawLimitRadiatorAreaM2(params: {
  computeWattsRequested: number;
  operatingTempC: number;
  sinkTempK?: number;
  emissivity?: number;
}): number {
  const emissivity = params.emissivity ?? 1; // perfect emitter, per §5.3-A
  const sinkTempK = params.sinkTempK ?? 3; // deep space, per §5.3-A
  const opTempK = params.operatingTempC + 273.15;
  const q = emissivity * STEFAN_BOLTZMANN * (Math.pow(opTempK, 4) - Math.pow(sinkTempK, 4));
  if (q <= 0) return Number.POSITIVE_INFINITY;
  return params.computeWattsRequested / (2 * q);
}

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
  /** Perigee altitude, km. Together with the next four, sets the orbit used to compute the eclipse duty cycle. */
  orbitAltitudeKm: number;
  orbitEccentricity: number;
  orbitInclinationDeg: number;
  orbitRaanDeg: number;
  orbitArgumentDeg: number;
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
  /** Solar array power if it were sunlit for the entire orbit, before the eclipse duty cycle is applied. Reported for comparison; not used as the sustainability bound. */
  instantaneousGeneratedPowerW: number;
  /** Fraction of the orbit, by time, spent in sunlight. 1 for an orbit with no eclipse. */
  orbitSunlitFraction: number;
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

  const generatedPowerInstantaneousW = i.solarLoadWm2 * i.solarPanelAreaM2 * i.solarPanelEfficiency * i.solarPanelPointingFactor;
  const orbitSunlitFraction = sunlitFraction(i.orbitAltitudeKm, i.orbitEccentricity, i.orbitInclinationDeg, i.orbitRaanDeg, i.orbitArgumentDeg);
  // A compute load is a continuous, sustained draw, so the relevant test is
  // not "can the array supply this right now in full sun" but "can the
  // array supply this on average across a whole orbit, including the
  // fraction spent in Earth's shadow". This is a standard first-order
  // spacecraft power-budgeting technique (an orbit-averaged power balance)
  // and, importantly, is still a pure function of the orbital elements: it
  // does not require tracking battery state of charge over time, only the
  // orbit's shape and orientation relative to the Sun.
  const generatedPowerW = generatedPowerInstantaneousW * orbitSunlitFraction;
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
    instantaneousGeneratedPowerW: generatedPowerInstantaneousW,
    orbitSunlitFraction,
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
    w.push(`Requested electrical load exceeds average solar array generation by ${Math.round(o.powerDeficitW)} W. Average generation already accounts for this orbit's eclipse duty cycle (${(o.orbitSunlitFraction * 100).toFixed(0)}% sunlit), but no battery is modelled to smooth the load across an orbit, so reduce the load, add array area, or improve Sun pointing.`);
  }
  return w;
}
