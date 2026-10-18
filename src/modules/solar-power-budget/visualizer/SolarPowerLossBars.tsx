import { formatWatts, formatPercent } from './format';
import type { SolarDerived } from './types';

type Props = {
  derived: SolarDerived;
};

export function SolarPowerLossBars({ derived }: Props) {
  const base = Math.max(derived.beginningOfLifePowerW, 1);

  const thermalPct = Math.min(100, Math.max(0, (derived.thermalLossW / base) * 100));
  const radPct = Math.min(100, Math.max(0, (derived.radiationLossW / base) * 100));
  const eclipsePct = Math.min(100, Math.max(0, (derived.eclipseLossW / base) * 100));
  const deliveredPct = Math.min(100, Math.max(0, (derived.orbitAveragePowerW / base) * 100));

  return (
    <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(5, 12, 22, 0.75)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9fd2ef', marginBottom: 6 }}>
        <span style={{ fontWeight: 600 }}>Power Budget Breakdown</span>
        <span>BOL: {formatWatts(derived.beginningOfLifePowerW)}</span>
      </div>

      {/* Stacked loss bar */}
      <div
        style={{
          width: '100%',
          height: 14,
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: 4,
          overflow: 'hidden',
          display: 'flex',
          marginBottom: 8,
        }}
      >
        <div
          title={`Delivered Orbit Average: ${formatWatts(derived.orbitAveragePowerW)}`}
          style={{ width: `${deliveredPct}%`, background: '#38bdf8', transition: 'width 0.2s' }}
        />
        <div
          title={`Thermal Loss: ${formatWatts(derived.thermalLossW)}`}
          style={{ width: `${thermalPct}%`, background: '#f97316', transition: 'width 0.2s' }}
        />
        <div
          title={`Radiation Loss: ${formatWatts(derived.radiationLossW)}`}
          style={{ width: `${radPct}%`, background: '#ec4899', transition: 'width 0.2s' }}
        />
        <div
          title={`Eclipse Shadow Loss: ${formatWatts(derived.eclipseLossW)}`}
          style={{ width: `${eclipsePct}%`, background: '#64748b', transition: 'width 0.2s' }}
        />
      </div>

      {/* Legend / metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '4px 8px', fontSize: 10.5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }} />
          <span style={{ color: '#cfe7f7' }}>Delivered:</span>
          <span style={{ color: '#fff', fontWeight: 600 }}>{formatWatts(derived.orbitAveragePowerW)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', display: 'inline-block' }} />
          <span style={{ color: '#cfe7f7' }}>Thermal:</span>
          <span style={{ color: '#fdba74' }}>-{formatWatts(derived.thermalLossW)} ({formatPercent(derived.thermalLossW / base)})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ec4899', display: 'inline-block' }} />
          <span style={{ color: '#cfe7f7' }}>Radiation:</span>
          <span style={{ color: '#f472b6' }}>-{formatWatts(derived.radiationLossW)} ({formatPercent(derived.radiationLossW / base)})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#64748b', display: 'inline-block' }} />
          <span style={{ color: '#cfe7f7' }}>Eclipse:</span>
          <span style={{ color: '#94a3b8' }}>-{formatWatts(derived.eclipseLossW)} ({formatPercent(derived.eclipseLossW / base)})</span>
        </div>
      </div>
    </div>
  );
}
