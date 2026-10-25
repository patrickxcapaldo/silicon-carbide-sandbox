import { generatePlayRun, ratioInBand } from './generator';
import { formatNumber, orbitLever, scaleLever, stepLever } from './levers';
import { playScore, playShareString } from './scoring';
import type { PlayDefinition, PlayRoundRecord } from './types';
import { assert } from './testKit';
import { createSeededRng } from '../challenge/rng';

// Difficulty bands: easy at least 2x, medium 1.3x to 2x, hard 1.1x to 1.3x.
assert(ratioInBand(2, 'easy') && !ratioInBand(1.99, 'easy'), 'easy band starts at 2x');
assert(ratioInBand(1.3, 'medium') && ratioInBand(1.99, 'medium') && !ratioInBand(2, 'medium'), 'medium band is 1.3x to 2x');
assert(ratioInBand(1.1, 'hard') && !ratioInBand(1.3, 'hard') && !ratioInBand(1.05, 'hard'), 'hard band is 1.1x to 1.3x');

// Levers clamp to the declared range, round to three significant figures and refuse no-ops.
const spec = { key: 'x', label: 'Thing', unit: 'm', min: 1, max: 10 };
const rng = createSeededRng('LEVER');
const grown = scaleLever(spec, [2, 3], 'lesson text').make({ x: 3 }, rng);
assert(grown !== null && grown.inputs.x === 9 || grown !== null && grown.inputs.x > 6 && grown.inputs.x <= 9, 'scale lever grows the input');
assert(scaleLever(spec, [5, 6], 'lesson text').make({ x: 8 }, rng)?.inputs.x === 10, 'scale lever clamps to the maximum');
assert(scaleLever(spec, [2, 3], 'lesson text').make({ x: 10 }, rng) === null, 'a lever that changes nothing returns null');
assert(stepLever(spec, [-5, -5], 'lesson text').make({ x: 3 }, rng)?.inputs.x === 1, 'step lever clamps to the minimum');
assert(Number.isInteger(stepLever(spec, [1.2, 3.7], 'lesson text').make({ x: 3 }, rng)!.inputs.x), 'step lever uses whole numbers');
const orbit = orbitLever([
  { id: 'p', label: 'Preset P', altitudeKm: 500, eccentricity: 0, inclinationDeg: 10, raanDeg: 0, argumentDeg: 0 },
  { id: 'q', label: 'Preset Q', altitudeKm: 800, eccentricity: 0, inclinationDeg: 20, raanDeg: 0, argumentDeg: 0 },
], 'lesson text');
const base = { orbitAltitudeKm: 500, orbitEccentricity: 0, orbitInclinationDeg: 10, orbitRaanDeg: 0, orbitArgumentDeg: 0 };
assert(orbit.make(base, rng)?.summary === 'Orbit → Preset Q', 'orbit lever never picks the current orbit');
assert(formatNumber(1234.5678) === '1,230', 'numbers use three significant figures and British grouping');

// Scoring and share string.
const fake: PlayDefinition = {
  id: 'fake', title: 'Fake', versionInfo: 'v0', metricLabel: 'value', format: (v) => `${v}`, intro: '',
  scenarios: [{ id: 's', title: 'S', inputs: { x: 1 } }, { id: 't', title: 'T', inputs: { x: 2 } }],
  levers: [], evaluate: () => ({ value: 1, rejected: false }), inputInfo: [],
};
let threw = false;
try { generatePlayRun(fake, 'SEED', 'easy'); } catch { threw = true; }
assert(threw, 'a definition without two levers must be refused');

const records = [true, false, true].map((correct) => ({ correct }) as PlayRoundRecord);
assert(playScore(records) === 2, 'score counts correct rounds');
const share = playShareString({ title: 'Fake', seed: 'ABC', difficulty: 'hard', records, versionInfo: 'v0' });
assert(share.split('\n')[1] === '🟩🟥🟩', 'share marks follow the rounds');
assert(share.split('\n')[0] === 'Fake · Play 2/3 · Hard', 'share headline format');
assert(!/localStorage|fetch\(/.test(share), 'share string is plain text');

console.log('Play core tests passed.');
