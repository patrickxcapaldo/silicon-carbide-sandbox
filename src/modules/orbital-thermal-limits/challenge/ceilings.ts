import type { OrbitalThermalResult } from '../sandbox/module';

export type ChallengeAnswer = 'radiator' | 'coolant' | 'power';

export interface ChallengeCeilings {
  radiator: number;
  coolant: number;
  power: number;
  answer: ChallengeAnswer;
  gapPct: number;
}

export function ceilingsOf(result: OrbitalThermalResult): ChallengeCeilings {
  const radiator = result.values.netRadiatorCapacityW;
  const coolant = result.values.transportCapacityW;
  const power = result.values.generatedPowerW - result.resolvedInputs.parasiticHeatW;
  const sorted = [
    { name: 'radiator' as const, value: radiator },
    { name: 'coolant' as const, value: coolant },
    { name: 'power' as const, value: power },
  ].sort((left, right) => left.value - right.value);

  return {
    radiator,
    coolant,
    power,
    answer: sorted[0].name,
    gapPct: ((sorted[1].value - sorted[0].value) / sorted[0].value) * 100,
  };
}
