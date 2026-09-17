import { InfoTip } from './InfoTip';
import { STATUS_INFO } from './statusInfo';
import type { ThermalStatus } from './types';

export function StatusBadge({ status }: { status: ThermalStatus }) {
  const info = STATUS_INFO[status];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: info.color, boxShadow: `0 0 8px 2px ${info.glow}`, flexShrink: 0 }} />
      <strong style={{ color: info.color }}>{info.label}</strong>
      <InfoTip text={info.description} width={240} placement="above" />
    </div>
  );
}
