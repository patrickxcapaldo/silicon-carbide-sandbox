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
  orbitAltitudeKm: number;
  orbitEccentricity: number;
  orbitInclinationDeg: number;
  orbitRaanDeg: number;
  orbitArgumentDeg: number;
  orbitPhaseDeg: number;
};

export type ThermalDerived = {
  radiatorPowerW: number;
  radiatorFluxWm2: number;
  absorbedSolarW: number;
  absorbedAlbedoW: number;
  absorbedEarthIrW: number;
  externalHeatW: number;
  transportCapacityW: number;
  netCapacityW: number;
  status: 'SAFE' | 'MARGIN' | 'LIMIT' | 'OVERHEATING';
};
