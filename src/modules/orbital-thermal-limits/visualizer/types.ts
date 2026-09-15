export type ThermalState = {
  satelliteTempC: number;
  operatingTempC: number;
  radiatorArea: number;
  emissivity: number;
  solarAbsorptivity: number;
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
  orbitAltitudeKm: number;
  orbitEccentricity: number;
  orbitInclinationDeg: number;
  orbitRaanDeg: number;
  orbitArgumentDeg: number;
  orbitPhaseDeg: number;
};

export type ThermalStatus = 'SAFE' | 'MARGIN' | 'LIMIT' | 'OVERHEATING';

export type ThermalDerived = {
  radiatorPowerW: number;
  radiatorFluxWm2: number;
  absorbedSolarW: number;
  absorbedAlbedoW: number;
  absorbedEarthIrW: number;
  externalHeatW: number;
  transportCapacityW: number;
  netCapacityW: number;
  computeWattsRequested: number;
  computeDeficitW: number;
  computeUtilization: number;
  generatedPowerW: number;
  powerDeficitW: number;
  powerUtilization: number;
  status: ThermalStatus;
};
