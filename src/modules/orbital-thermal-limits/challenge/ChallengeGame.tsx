import { ChallengeShell } from '../../../core/challenge/ChallengeShell';
import { orbitalThermalChallenge } from './definition';
import './ChallengeGame.css';

export function ChallengeGame() {
  return <ChallengeShell definition={orbitalThermalChallenge} />;
}
