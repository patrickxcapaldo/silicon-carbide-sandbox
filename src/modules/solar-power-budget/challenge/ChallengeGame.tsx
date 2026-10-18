import { ChallengeShell } from '../../../core/challenge/ChallengeShell';
import { solarPowerChallenge } from './definition';
import './ChallengeGame.css';

export function ChallengeGame() {
  return <ChallengeShell definition={solarPowerChallenge} />;
}
