import type { ThermalStatus } from './types';

export type StatusInfo = {
  label: string;
  color: string;
  glow: string;
  description: string;
};

export const STATUS_INFO: Record<ThermalStatus, StatusInfo> = {
  SAFE: {
    label: 'Safe',
    color: '#3ddc84',
    glow: 'rgba(61,220,132,.35)',
    description: 'The radiator and coolant loop have ample margin. Requested compute power plus environmental and parasitic loads use less than ~60% of the available thermal budget, so temperatures should hold steady indefinitely at these settings.',
  },
  MARGIN: {
    label: 'Margin',
    color: '#e4d94a',
    glow: 'rgba(228,217,74,.35)',
    description: 'The thermal budget is comfortably used (roughly 60\u201385%). There is still headroom for solar/Earth-IR swings over an orbit, but less room to add load without approaching the limit.',
  },
  LIMIT: {
    label: 'At limit',
    color: '#ff9d3d',
    glow: 'rgba(255,157,61,.4)',
    description: 'The spacecraft is running close to its maximum rejectable heat (over ~85% of budget used). A hotter part of the orbit (e.g. higher solar incidence, more Earth view) could tip it into deficit. Consider reducing compute load, increasing radiator area, or improving pointing.',
  },
  OVERHEATING: {
    label: 'Overheating',
    color: '#ff4d4d',
    glow: 'rgba(255,77,77,.45)',
    description: 'Requested compute power exceeds what the radiator and coolant loop can currently reject. Waste heat will accumulate faster than it can leave the spacecraft, and component temperatures will climb over time unless compute is throttled, the radiator/coolant capacity is increased, or environmental loading is reduced.',
  },
};
