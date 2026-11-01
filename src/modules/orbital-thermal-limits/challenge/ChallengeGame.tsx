import { ChallengeShell } from '../../../core/challenge/ChallengeShell';
import { orbitalThermalChallenge } from './definition';

export function ChallengeGame() {
  return <ChallengeShell definition={orbitalThermalChallenge} />;
}
