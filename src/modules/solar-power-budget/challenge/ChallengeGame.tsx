import { ChallengeShell } from '../../../core/challenge/ChallengeShell';
import { solarPowerChallenge } from './definition';

export function ChallengeGame() {
  return <ChallengeShell definition={solarPowerChallenge} />;
}
