import type { Result } from '../../core/types';
import { manifest } from './manifest';

const STEFAN_BOLTZMANN = 5.670374419e-8; // W m⁻² K⁻⁴

/**
 * The pure, deterministic kernel. Keep ALL physics here, never in the UI.
 * Challenge and Play call this same function, so seeded replay and answer
 * checking only work if it has no randomness, clock or global state.
 */
export function run(inputs: Record<string, number>) {
  const get = (id: string) => inputs[id] ?? manifest.parameters.find((p) => p.id === id)!.defaultValue;
  const radiatedW = get('emissivity') * STEFAN_BOLTZMANN * get('areaM2') * get('temperatureK') ** 4;
  const loadW = get('loadW');
  return { radiatedW, loadW, marginW: radiatedW - loadW, utilisation: loadW / radiatedW };
}

/** Adapter the registry uses for the generic outputs list. */
export function compute(inputs: Record<string, number>): Result {
  const v = run(inputs);
  return {
    outputs: {
      radiatedW: { label: 'Radiated Power', value: Math.round(v.radiatedW), unit: 'W', description: 'Power the surface can reject at this temperature.' },
      marginW: { label: 'Margin', value: Math.round(v.marginW), unit: 'W', description: 'Radiated power minus the heat load. Negative means the load cannot be rejected.' },
    },
  };
}
