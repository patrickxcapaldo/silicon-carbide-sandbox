import { CHALLENGE_LEVELS } from '../challenge/levels';
import { orbitalThermalLimits } from '../sandbox/module';

export const RULE_OF_THUMB_TEMPERATURES_C = [60, 90, 120] as const;

export function chapterExamples() {
  const worked = orbitalThermalLimits.run(CHALLENGE_LEVELS[0].inputs);
  const coolantSpecificHeat = worked.values.transportCapacityW /
    (worked.resolvedInputs.flowRateKgS * worked.resolvedInputs.coolantDeltaT);
  const fluxes = RULE_OF_THUMB_TEMPERATURES_C.map((operatingTempC) => {
    const result = orbitalThermalLimits.run({ ...CHALLENGE_LEVELS[0].inputs, operatingTempC });
    return { operatingTempC, radiatorFluxWm2: result.values.radiatorFluxWm2 };
  });
  return { worked, fluxes, coolantSpecificHeat };
}
