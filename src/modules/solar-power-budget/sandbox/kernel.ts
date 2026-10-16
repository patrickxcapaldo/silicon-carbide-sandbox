/**
 * Pure physics kernel for the solar array power budget.
 *
 * This file contains the physical equations governing solar power generation
 * in Earth orbit and nothing else. It imports no React, no Three.js, and no host
 * framework types, so it runs unchanged in a browser, under Node, in a worker,
 * or composed inside another module.
 *
 * All values here are full precision in canonical SI-ish units.
 */

import { orbitalPeriodSeconds, sunlitFraction } from '../../../core/orbitalMechanics';

export const SOLAR_CONSTANT_WM2 = 1361;
export const STC_TEMP_C = 28;

export type SolarKernelInputs = {
  solarArrayAreaM2: number;
  baseCellEfficiency: number;
  solarFluxWm2: number;
  cellOperatingTempC: number;
  tempCoefficientPwr: number;
  missionDurationYears: number;
  annualDegradationRate: number;
  pointingEfficiency: number;
  bosEfficiency: number;
  orbitAltitudeKm: number;
  orbitEccentricity: number;
  orbitInclinationDeg: number;
  orbitRaanDeg: number;
  orbitArgumentDeg: number;
};

export type SolarKernelOutputs = {
  /** Time-averaged electrical bus power generated over a complete orbital period (W). */
  orbitAveragePowerW: number;
  /** Instantaneous electrical power when illuminated in direct sunlight at operating temperature and EOL condition (W). */
  instantaneousSunlitPowerW: number;
  /** Beginning-of-life peak power at launch condition (STC 28 °C, no radiation aging) (W). */
  beginningOfLifePowerW: number;
  /** Fraction of orbital period spent illuminated by the Sun (0-1). */
  orbitSunlitFraction: number;
  /** Duration of Earth shadow per orbit (minutes). */
  orbitEclipseDurationMin: number;
  /** Full Keplerian orbital period (minutes). */
  orbitPeriodMinutes: number;
  /** Total electrical energy delivered to the spacecraft bus per complete orbit (W·h). */
  orbitEnergyGeneratedWh: number;
  /** Net end-to-end system efficiency from incident solar flux to delivered bus power in sunlight (0-1). */
  effectiveSystemEfficiency: number;
  /** Temperature derating factor applied to base cell efficiency (1 + gamma * deltaT). */
  temperatureDerateFactor: number;
  /** Multiplier on cell performance due to accumulated radiation and aging degradation ((1 - r)^t). */
  radiationDerateFactor: number;
};

/**
 * Run the solar power budget physics calculations.
 * Inputs are assumed already resolved and clamped by the contract layer.
 */
export function runSolarKernel(i: SolarKernelInputs): SolarKernelOutputs {
  // 1. Temperature derating
  // eta_temp = eta_0 * [1 + gamma * (T_cell - T_0)]
  const deltaTempK = i.cellOperatingTempC - STC_TEMP_C;
  const temperatureDerateFactor = Math.max(0, 1 + i.tempCoefficientPwr * deltaTempK);
  const tempAdjustedEfficiency = i.baseCellEfficiency * temperatureDerateFactor;

  // 2. Radiation & aging degradation
  // eta_EOL = eta_temp * (1 - r)^t
  const radiationDerateFactor = Math.max(0, Math.pow(1 - i.annualDegradationRate, i.missionDurationYears));
  const eolCellEfficiency = tempAdjustedEfficiency * radiationDerateFactor;

  // 3. System efficiencies (BOS & pointing)
  const effectiveSystemEfficiency = Math.max(0, eolCellEfficiency * i.bosEfficiency * i.pointingEfficiency);

  // 4. Power calculations
  // BOL Power at STC (28 °C, 0 years, perfect pointing & declared BOS)
  const beginningOfLifePowerW = i.solarFluxWm2 * i.solarArrayAreaM2 * i.baseCellEfficiency * i.bosEfficiency * i.pointingEfficiency;

  // Instantaneous sunlit power at EOL and operating temperature
  const instantaneousSunlitPowerW = i.solarFluxWm2 * i.solarArrayAreaM2 * effectiveSystemEfficiency;

  // 5. Orbital eclipse & period
  const orbitPeriodSec = orbitalPeriodSeconds(i.orbitAltitudeKm, i.orbitEccentricity);
  const orbitPeriodMinutes = orbitPeriodSec / 60;
  const sunFraction = sunlitFraction(
    i.orbitAltitudeKm,
    i.orbitEccentricity,
    i.orbitInclinationDeg,
    i.orbitRaanDeg,
    i.orbitArgumentDeg,
  );
  const orbitEclipseDurationMin = (1 - sunFraction) * orbitPeriodMinutes;

  // 6. Orbit-averaged power & energy per orbit
  const orbitAveragePowerW = instantaneousSunlitPowerW * sunFraction;
  // Energy in W·h: (W * seconds) / 3600
  const orbitEnergyGeneratedWh = (orbitAveragePowerW * orbitPeriodSec) / 3600;

  return {
    orbitAveragePowerW,
    instantaneousSunlitPowerW,
    beginningOfLifePowerW,
    orbitSunlitFraction: sunFraction,
    orbitEclipseDurationMin,
    orbitPeriodMinutes,
    orbitEnergyGeneratedWh,
    effectiveSystemEfficiency,
    temperatureDerateFactor,
    radiationDerateFactor,
  };
}

/**
 * Diagnostic warnings based on the physical state of the solar array and orbit.
 */
export function solarKernelWarnings(i: SolarKernelInputs, o: SolarKernelOutputs): string[] {
  const warnings: string[] = [];

  if (o.orbitSunlitFraction < 0.55) {
    warnings.push(
      `Severe eclipse duty cycle: orbit is only ${(o.orbitSunlitFraction * 100).toFixed(1)}% sunlit with ${o.orbitEclipseDurationMin.toFixed(1)} min in Earth shadow per revolution.`,
    );
  }

  if (i.cellOperatingTempC > 100) {
    warnings.push(
      `High cell operating temperature (${i.cellOperatingTempC.toFixed(0)} °C) reduces cell efficiency by ${((1 - o.temperatureDerateFactor) * 100).toFixed(1)}%.`,
    );
  }

  if (o.radiationDerateFactor < 0.75) {
    warnings.push(
      `Substantial radiation and aging degradation: array output has degraded by ${((1 - o.radiationDerateFactor) * 100).toFixed(1)}% over ${i.missionDurationYears.toFixed(1)} years.`,
    );
  }

  if (i.pointingEfficiency < 0.85) {
    warnings.push(
      `Low solar pointing efficiency (${(i.pointingEfficiency * 100).toFixed(0)}%) significantly penalises power generation. Consider improved array gimbal tracking or sun-pointing attitude.`,
    );
  }

  return warnings;
}
