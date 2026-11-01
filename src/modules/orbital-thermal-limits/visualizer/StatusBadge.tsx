import { StatusBadge as CoreStatusBadge } from '../../../core/ui';
import { STATUS_INFO } from './statusInfo';
import type { ThermalStatus } from './types';

export function StatusBadge({ status }: { status: ThermalStatus }) {
  const info = STATUS_INFO[status];
  return <CoreStatusBadge tone={info.tone} label={info.label} info={info.description} />;
}
