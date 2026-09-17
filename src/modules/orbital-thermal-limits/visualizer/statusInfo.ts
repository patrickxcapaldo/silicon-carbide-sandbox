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
    description: 'Both budgets have ample margin. The radiator and coolant loop can reject the requested compute heat, and the solar array can generate the requested electrical load, each using less than about 60% of what is available. Temperatures and power should hold steady indefinitely at these settings.',
  },
  MARGIN: {
    label: 'Margin',
    color: '#e4d94a',
    glow: 'rgba(228,217,74,.35)',
    description: 'The more constraining of the thermal and power budgets is comfortably used, at roughly 60 to 85%. There is still headroom for solar and Earth infrared swings or pointing drift over an orbit, but less room to add load without approaching the limit.',
  },
  LIMIT: {
    label: 'At limit',
    color: '#ff9d3d',
    glow: 'rgba(255,157,61,.4)',
    description: 'The spacecraft is running close to either its maximum rejectable heat or its maximum generated power, above about 85% used. A hotter or dimmer part of the orbit could tip it into deficit. Reducing compute load, adding radiator or array area, or improving pointing would all restore margin.',
  },
  OVERHEATING: {
    label: 'Overheating',
    color: '#ff4d4d',
    glow: 'rgba(255,77,77,.45)',
    description: 'Requested compute exceeds what the radiator and coolant loop can reject, or what the solar array can electrically supply, or both. Waste heat will accumulate and the bus will draw down its batteries faster than they recharge, unless compute is throttled, radiator or array capacity is increased, or environmental loading and pointing are improved.',
  },
};
