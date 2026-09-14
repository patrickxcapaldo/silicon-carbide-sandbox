import { useEffect, useRef, useState } from 'react';

type Props = { text: string; width?: number; align?: 'left' | 'right' };

export function InfoTip({ text, width = 230, align = 'right' }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle' }}>
      <button
        type="button"
        aria-label="More info"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        style={{
          width: 14, height: 14, borderRadius: '50%', border: '1px solid rgba(255,255,255,.35)', background: open ? 'rgba(159,210,239,.25)' : 'transparent',
          color: '#9fd2ef', fontSize: 9, lineHeight: '12px', padding: 0, cursor: 'pointer', flexShrink: 0,
        }}
      >i</button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', top: '135%', [align]: 0, width, zIndex: 70, padding: 9, borderRadius: 8,
            background: '#0b1726', border: '1px solid rgba(160,205,235,.35)', color: '#dff1ff', fontSize: 11.3,
            lineHeight: 1.45, boxShadow: '0 12px 30px rgba(0,0,0,.5)',
          }}
        >
          {text}
        </div>
      )}
    </span>
  );
}
