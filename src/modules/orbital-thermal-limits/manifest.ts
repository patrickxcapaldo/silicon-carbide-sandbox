import type { Manifest } from '../../core/types';

export const manifest: Manifest = {
  id: 'orbital-thermal-limits',
  title: 'Orbital Compute Thermal Rejection Limits',
  summary: 'Calculate the maximum allowable thermal power (TDP) an orbital satellite compute payload can dissipate in Low Earth Orbit (LEO) via radiator surface area before overheating.',
  tags: ['space', "thermal-physics", 'orbital-compute', 'ai-infrastructure'],
  articleUrl: 'https://thesiliconcarbide.substack.com',
  parameters: [
    {
      id: 'radiatorArea',
      name: 'Radiator Surface Area',
      unit: 'm²',
      min: 0.5,
      max: 20,
      step: 0.5,
      defaultValue: 2.0,
      description: 'Effective surface area of the dedicated radiator panels.',
    },
    {
      id: 'emissivity',
      name: 'Radiator Surface Emissivity',
      unit: 'ε',
      min: 0.5,
      max: 0.98,
      step: 0.01,
      defaultValue: 0.9,
      description: 'Efficiency of the radiator surface coating emitting thermal radiation (0 to 1).',
    },
    {
      id: 'operatingTempC',
      name: 'Max Radiator Temperature',
      unit: '°C',
      min: 20,
      max: 120,
      step: 5,
      defaultValue: 70,
      description: 'Maximum operating temperature of the coolant/radiator loop.',
    },
    {
      id: 'sinkTempK',
      name: 'Equivalent Space Sink Temp',
      unit: 'K',
      min: 3,
      max: 250,
      step: 5,
      defaultValue: 180,
      description: 'Effective background thermal environment in LEO (accounting for Earth albedo & IR).',
    },
  ],
  equations: [
    {
      id: 'stefan-boltzmann',
      label: 'Stefan-Boltzmann Radiation Law',
      latex: 'P_{rad} = \\epsilon \\cdot \\sigma \\cdot A \\cdot (T_{rad}^4 - T_{sink}^4)',
      description: 'Calculates net radiant heat energy dissipated into deep space per unit time.',
    },
  ],
};