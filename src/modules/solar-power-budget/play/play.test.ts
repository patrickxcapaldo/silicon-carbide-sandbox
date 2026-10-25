import { checkPlayDefinition } from '../../../core/play/testKit';
import { solarPowerPlay } from './definition';

const checked = checkPlayDefinition(solarPowerPlay, 8);
console.log(`solar-power-budget Play tests passed: ${checked} recomputed from the kernel.`);
