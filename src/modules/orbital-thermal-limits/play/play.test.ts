import { checkPlayDefinition } from '../../../core/play/testKit';
import { orbitalThermalPlay } from './definition';

const checked = checkPlayDefinition(orbitalThermalPlay, 6);
console.log(`orbital-thermal-limits Play tests passed: ${checked} recomputed from the kernel.`);
