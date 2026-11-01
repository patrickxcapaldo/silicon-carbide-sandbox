import { StackedBar } from '../../../core/ui';
import { formatWatts, formatPercent } from './format';
import type { SolarDerived } from './types';

type Props = {
  derived: SolarDerived;
};

/** Beginning-of-life output stacked into delivered power and the three dominant losses. The largest loss is the one Orchid segment. */
export function SolarPowerLossBars({ derived }: Props) {
  const base = Math.max(derived.beginningOfLifePowerW, 1);
  const pct = (w: number) => Math.min(100, Math.max(0, (w / base) * 100));
  const losses = [
    { id: 'thermal', label: 'Thermal', w: derived.thermalLossW },
    { id: 'radiation', label: 'Radiation', w: derived.radiationLossW },
    { id: 'eclipse', label: 'Eclipse', w: derived.eclipseLossW },
  ];
  const dominant = losses.reduce((a, b) => (b.w > a.w ? b : a)).id;
  return (
    <div>
      <p className="sci-note" style={{ margin: '0 0 0.5rem' }}>
        Beginning of life: <strong>{formatWatts(derived.beginningOfLifePowerW)}</strong>. The Orchid segment is the largest loss.
      </p>
      <StackedBar
        ariaLabel="Power budget breakdown"
        segments={[
          { id: 'delivered', label: 'Delivered', percent: pct(derived.orbitAveragePowerW), display: formatWatts(derived.orbitAveragePowerW) },
          ...losses.map((l) => ({
            id: l.id,
            label: l.label,
            percent: pct(l.w),
            display: `\u2212${formatWatts(l.w)} (${formatPercent(l.w / base)})`,
            binding: l.id === dominant && l.w > 0,
          })),
        ]}
      />
    </div>
  );
}
