import type { Manifest } from '../../core/types';
import { equations } from './equations';

/**
 * Replace every value below before registering. Rules:
 *  - `id` is kebab-case and permanent (it is in URLs and exported files).
 *  - `title` is Title Case. `summary` is one or two sentences, max ~780px wide on screen.
 *  - `realism` is exactly one of 'Sketch' | 'Estimate' | 'Detailed' (see the style guide).
 *  - `scope` is one sentence: what the model covers, what it assumes, what it ignores.
 *  - Parameter `name`s are Title Case with units in `unit`.
 */
export const manifest: Manifest = {
  id: 'example-module',
  releaseVersion: '0.1.0',
  title: 'Example Module',
  summary: 'Replace this with a concise description of what the module lets you explore and why it matters.',
  realism: 'Sketch',
  scope: 'Radiative heat rejection from one flat surface. No sunlight or Earth heating, and no coolant loop.',
  tags: ['example'],
  parameters: [
    { id: 'areaM2', name: 'Radiator Area', unit: 'm²', min: 0.5, max: 50, step: 0.5, defaultValue: 4, description: 'Emitting area of the radiator, counting one side.' },
    { id: 'temperatureK', name: 'Surface Temperature', unit: 'K', min: 250, max: 500, step: 5, defaultValue: 330, description: 'Absolute temperature of the radiating surface.' },
    { id: 'emissivity', name: 'Emissivity', unit: 'ε', min: 0.3, max: 0.99, step: 0.01, defaultValue: 0.9, description: 'How well the surface radiates compared with an ideal black body (1.0).' },
    { id: 'loadW', name: 'Heat Load', unit: 'W', min: 100, max: 10000, step: 100, defaultValue: 2000, description: 'Heat that must be rejected continuously.' },
  ],
  equations,
};
