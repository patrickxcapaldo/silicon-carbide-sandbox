import type { ParamMeta } from '../../../core/ui';

/**
 * One record per input the Controls panel exposes. `label` is Title Case, never
 * camelCase or ALL-CAPS. `description` is what the (i) button says, in plain
 * language. Add `logScale: true, logFloor: <smallest non-zero>` for ranges that
 * span orders of magnitude.
 */
export const PARAM_META: Record<string, ParamMeta> = {
  areaM2: { label: 'Radiator Area', unit: 'm²', min: 0.5, max: 50, step: 0.5, description: 'Emitting area of the radiator, counting one side. Doubling it doubles the power you can reject.' },
  temperatureK: { label: 'Surface Temperature', unit: 'K', min: 250, max: 500, step: 5, description: 'Absolute temperature of the radiating surface. Radiated power rises with the fourth power, so a small increase in temperature is worth a lot.' },
  emissivity: { label: 'Emissivity', unit: '', min: 0.3, max: 0.99, step: 0.01, description: 'How well the surface radiates compared with an ideal black body (1.0).' },
  loadW: { label: 'Heat Load', unit: 'W', min: 100, max: 10000, step: 100, description: 'Heat that must be rejected continuously.' },
};
