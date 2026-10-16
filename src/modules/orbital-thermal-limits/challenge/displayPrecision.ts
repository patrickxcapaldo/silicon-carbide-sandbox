import { PARAM_META } from '../visualizer/paramMeta';

function roundStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function roundChallengeInputForDisplay(key: string, value: number): number {
  const meta = PARAM_META[key as keyof typeof PARAM_META];
  if (!meta) return value;
  if (key === 'computeWattsRequested') {
    const quantum = Math.abs(value) >= 1e6 ? 1e4 : Math.abs(value) >= 1e3 ? 10 : 1;
    return roundStep(value, quantum);
  }
  if (key === 'radiatorArea' || key === 'solarPanelAreaM2') {
    if (Math.abs(value) >= 1e6) return roundStep(value, 1e4);
    if (Math.abs(value) >= 1e4) return Math.round(value);
    return roundStep(value, 0.1);
  }
  return roundStep(value, meta.step);
}
