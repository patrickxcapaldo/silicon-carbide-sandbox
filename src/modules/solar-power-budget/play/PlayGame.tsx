import { PlayShell } from '../../../core/play/PlayShell';
import { solarPowerPlay } from './definition';

export function PlayGame() {
  return <PlayShell definition={solarPowerPlay} />;
}
