export type SolarState = {
  solarArrayAreaM2: number;
  baseCellEfficiency: number;
  cellOperatingTempC: number;
  tempCoefficientPwr: number;
  missionDurationYears: number;
  annualDegradationRate: number;
  pointingEfficiency: number;
  bosEfficiency: number;
  solarFluxWm2: number;
  orbitAltitudeKm: number;
  orbitEccentricity: number;
  orbitInclinationDeg: number;
  orbitRaanDeg: number;
  orbitArgumentDeg: number;
  orbitPhaseDeg: number;
};

export type SolarDerived = {
  orbitAveragePowerW: number;
  instantaneousSunlitPowerW: number;
  beginningOfLifePowerW: number;
  orbitSunlitFraction: number;
  orbitEclipseDurationMin: number;
  orbitPeriodMinutes: number;
  orbitEnergyGeneratedWh: number;
  effectiveSystemEfficiency: number;
  temperatureDerateFactor: number;
  radiationDerateFactor: number;
  // Loss breakdown in Watts
  thermalLossW: number;
  radiationLossW: number;
  bosPointingLossW: number;
  eclipseLossW: number;
  unconstrainedBolW: number; // S * A * eta0
};
