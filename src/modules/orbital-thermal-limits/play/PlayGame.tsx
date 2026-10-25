import { PlayShell } from '../../../core/play/PlayShell';
import { orbitalThermalPlay } from './definition';

export function PlayGame() {
  return <PlayShell definition={orbitalThermalPlay} />;
}
