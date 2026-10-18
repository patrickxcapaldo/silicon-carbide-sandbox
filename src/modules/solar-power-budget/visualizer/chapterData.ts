import { solarPowerBudget } from '../sandbox/module';
import { computeLosses, type SolarLossBreakdown } from '../challenge/losses';
import type { SolarKernelInputs } from '../sandbox/kernel';

export const REFERENCE_WORKED_INPUTS: Record<string, number> = {
  solarArrayAreaM2: 5.0,
  baseCellEfficiency: 0.30,
  cellOperatingTempC: 65,
  tempCoefficientPwr: -0.0025,
  missionDurationYears: 5.0,
  annualDegradationRate: 0.015,
  pointingEfficiency: 0.98,
  bosEfficiency: 0.88,
  solarFluxWm2: 1361,
  orbitAltitudeKm: 500,
  orbitEccentricity: 0.001,
  orbitInclinationDeg: 51.6,
  orbitRaanDeg: 25,
  orbitArgumentDeg: 0,
};

export const SENSITIVITY_TEMPS_C = [-40, 28, 60, 85, 110] as const;
export const SENSITIVITY_YEARS = [0, 2, 5, 10, 15] as const;

export function chapterExamples(): {
  worked: ReturnType<typeof solarPowerBudget.run>;
  losses: SolarLossBreakdown;
  tempSweep: Array<{ tempC: number; deratePct: number; sunlitPowerW: number }>;
  radSweep: Array<{ years: number; retentionPct: number; sunlitPowerW: number }>;
} {
  const worked = solarPowerBudget.run(REFERENCE_WORKED_INPUTS);
  const losses = computeLosses(worked.resolvedInputs as unknown as SolarKernelInputs);

  const tempSweep = SENSITIVITY_TEMPS_C.map((tempC) => {
    const res = solarPowerBudget.run({ ...REFERENCE_WORKED_INPUTS, cellOperatingTempC: tempC });
    return {
      tempC,
      deratePct: res.values.temperatureDerateFactor * 100,
      sunlitPowerW: res.values.instantaneousSunlitPowerW,
    };
  });

  const radSweep = SENSITIVITY_YEARS.map((years) => {
    const res = solarPowerBudget.run({ ...REFERENCE_WORKED_INPUTS, missionDurationYears: years });
    return {
      years,
      retentionPct: res.values.radiationDerateFactor * 100,
      sunlitPowerW: res.values.instantaneousSunlitPowerW,
    };
  });

  return { worked, losses, tempSweep, radSweep };
}
