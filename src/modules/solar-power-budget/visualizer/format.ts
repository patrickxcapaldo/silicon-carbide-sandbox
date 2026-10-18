export function formatWatts(watts: number, decimals = 2): string {
  const { value, unit } = splitWatts(watts);
  if (decimals === 2) return `${value} ${unit}`;
  const a = Math.abs(watts);
  if (a >= 1e9) return `${(watts / 1e9).toFixed(decimals)} GW`;
  if (a >= 1e6) return `${(watts / 1e6).toFixed(decimals)} MW`;
  if (a >= 1e3) return `${(watts / 1e3).toFixed(decimals)} kW`;
  return `${Math.round(watts)} W`;
}

export function splitWatts(watts: number): { value: number; unit: 'GW' | 'MW' | 'kW' | 'W' } {
  const a = Math.abs(watts);
  if (a >= 1e9) return { value: parseFloat((watts / 1e9).toFixed(2)), unit: 'GW' };
  if (a >= 1e6) return { value: parseFloat((watts / 1e6).toFixed(2)), unit: 'MW' };
  if (a >= 1e3) return { value: parseFloat((watts / 1e3).toFixed(2)), unit: 'kW' };
  return { value: Math.round(watts), unit: 'W' };
}

export function formatWattHours(wh: number): string {
  const a = Math.abs(wh);
  if (a >= 1e6) return `${(wh / 1e6).toFixed(2)} MW·h`;
  if (a >= 1e3) return `${(wh / 1e3).toFixed(2)} kW·h`;
  return `${Math.round(wh)} W·h`;
}

export function formatPercent(fraction: number, decimals = 1): string {
  if (!Number.isFinite(fraction)) return '0.0%';
  return `${(fraction * 100).toFixed(decimals)}%`;
}

export function formatCompact(value: number, unit: string, step: number): string {
  const a = Math.abs(value);
  let num: string;
  if (a >= 1e9) num = `${(value / 1e9).toFixed(2)}B`;
  else if (a >= 1e6) num = `${(value / 1e6).toFixed(2)}M`;
  else if (a >= 1e4) num = Math.round(value).toLocaleString('en-US');
  else {
    const decimals = step >= 1 ? 0 : Math.min(3, (String(step).split('.')[1] || '').length);
    num = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
  }
  return unit ? `${num} ${unit}` : num;
}

export function formatQuantity(value: number, unit: string, step: number): string {
  if (unit === 'W') return formatWatts(value);
  if (unit === 'W·h') return formatWattHours(value);
  if (unit === '%' || unit === 'η' || unit === '0-1') return formatPercent(value);
  return formatCompact(value, unit, step);
}
