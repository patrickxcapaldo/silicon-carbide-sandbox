import { useState } from 'react';
import { STATUS_INFO } from './statusInfo';
import type { ThermalStatus } from './types';

export function StatusBadge({ status }: { status: ThermalStatus }) {
  const [open, setOpen] = useState(false);
  const info = STATUS_INFO[status];
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: info.color, boxShadow: `0 0 8px 2px ${info.glow}`, flexShrink: 0 }} />
        <strong style={{ color: info.color }}>{info.label}</strong>
        <button
          type="button"
          aria-label={`What does ${info.label} mean?`}
          onClick={() => setOpen((v) => !v)}
          style={{
            width: 15, height: 15, borderRadius: '50%', border: '1px solid rgba(255,255,255,.4)', background: 'transparent',
            color: '#dff1ff', fontSize: 10, lineHeight: '13px', padding: 0, cursor: 'pointer', flexShrink: 0,
          }}
        >i</button>
      </div>
      {open && (
        <div style={{
          position: 'absolute', bottom: '120%', left: 0, width: 240, zIndex: 60, padding: 10, borderRadius: 8,
          background: '#0b1726', border: `1px solid ${info.color}55`, color: '#dff1ff', fontSize: 11.5, lineHeight: 1.45,
          boxShadow: '0 12px 30px rgba(0,0,0,.5)',
        }}>
          {info.description}
        </div>
      )}
    </div>
  );
}
