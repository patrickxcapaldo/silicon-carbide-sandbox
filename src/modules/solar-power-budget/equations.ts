export const equations = [
  {
    id: 'solar-temperature-derating',
    label: 'Cell temperature derating',
    latex: '\\eta_{\\text{temp}} = \\eta_0 \\left[ 1 + \\gamma (T_{\\text{cell}} - T_0) \\right]',
    description: 'Solar cell efficiency decreases linearly above Standard Test Conditions (T₀ = 28 °C, AM0) via temperature coefficient γ.',
  },
  {
    id: 'solar-radiation-degradation',
    label: 'Radiation & aging degradation',
    latex: '\\eta_{\\text{EOL}} = \\eta_{\\text{temp}} (1 - r_{\\text{deg}})^{\\Delta t}',
    description: 'Cell performance degrades exponentially over mission duration Δt due to space radiation fluence and coverglass darkening.',
  },
  {
    id: 'solar-instantaneous-power',
    label: 'Instantaneous sunlit generation',
    latex: 'P_{\\text{sunlit}} = S \\cdot A_{\\text{array}} \\cdot \\eta_{\\text{EOL}} \\cdot \\eta_{\\text{bos}} \\cdot \\cos(\\theta)',
    description: 'Delivered bus power in direct sunlight after balance-of-system (BOS) and sun tracking alignment factors.',
  },
  {
    id: 'solar-orbit-average-power',
    label: 'Orbit-averaged generation',
    latex: 'P_{\\text{avg}} = P_{\\text{sunlit}} \\cdot f_{\\text{sunlit}}',
    description: 'Time-averaged continuous electrical power available to the spacecraft bus across an entire orbital revolution.',
  },
  {
    id: 'solar-orbit-energy',
    label: 'Electrical energy per orbit',
    latex: 'E_{\\text{orbit}} = P_{\\text{avg}} \\cdot T_{\\text{orbit}} = P_{\\text{sunlit}} \\cdot (f_{\\text{sunlit}} \\cdot T_{\\text{orbit}})',
    description: 'Total electrical energy delivered to the bus over one Keplerian period, sizing gross battery charging capacity.',
  },
];
