import type { Equation } from '../../core/types';

/** Each equation: a stable id, a plain label, KaTeX, and one sentence on what it says. */
export const equations: Equation[] = [
  {
    id: 'stefan-boltzmann',
    label: 'Radiated power',
    latex: 'P = \\varepsilon \\sigma A T^{4}',
    description: 'A surface at temperature T radiates power proportional to its area, its emissivity and the fourth power of its temperature.',
  },
];
