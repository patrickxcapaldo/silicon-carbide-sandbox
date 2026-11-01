import { run } from './model';
import { assert } from '../../core/play/testKit';

// A 1 m² black body at 300 K radiates about 459.3 W.
const v = run({ areaM2: 1, temperatureK: 300, emissivity: 1, loadW: 100 });
assert(Math.abs(v.radiatedW - 459.3) < 0.1, 'Stefan-Boltzmann at 300 K');
assert(v.marginW > 0 && v.utilisation < 1, 'margin is positive when the load is below the radiated power');

// Deterministic: the same inputs always give the same outputs.
assert(JSON.stringify(run({})) === JSON.stringify(run({})), 'kernel is deterministic');
