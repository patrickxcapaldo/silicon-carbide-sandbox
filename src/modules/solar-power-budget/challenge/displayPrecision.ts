export function roundForDisplay(key: string, value: number): number {
  switch (key) {
    case 'solarArrayAreaM2':
      return Math.round(value * 10) / 10;
    case 'baseCellEfficiency':
      return Math.round(value * 100) / 100;
    case 'cellOperatingTempC':
      return Math.round(value);
    case 'tempCoefficientPwr':
      return Math.round(value * 10000) / 10000;
    case 'missionDurationYears':
      return Math.round(value * 10) / 10;
    case 'annualDegradationRate':
      return Math.round(value * 1000) / 1000;
    case 'pointingEfficiency':
    case 'bosEfficiency':
      return Math.round(value * 100) / 100;
    case 'solarFluxWm2':
      return Math.round(value);
    case 'orbitAltitudeKm':
      return Math.round(value);
    case 'orbitEccentricity':
      return Math.round(value * 1000) / 1000;
    case 'orbitInclinationDeg':
    case 'orbitRaanDeg':
    case 'orbitArgumentDeg':
    case 'orbitPhaseDeg':
      return Math.round(value);
    default:
      return value;
  }
}
