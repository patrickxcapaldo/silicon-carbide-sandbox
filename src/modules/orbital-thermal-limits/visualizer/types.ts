export type ThermalState = {
  satelliteTempC: number;
  operatingTempC: number;
  radiatorArea: number;
  emissivity: number;
  sinkTempK: number;
  solarLoadWm2: number;
  flowRateKgS: number;
};

export type ThermalDerived = {
  radiatorPowerW: number;
  radiatorFluxWm2: number;
  absorbedSolarW: number;
};
