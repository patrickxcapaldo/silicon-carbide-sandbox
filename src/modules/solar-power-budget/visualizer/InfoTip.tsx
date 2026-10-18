import { createContext, useContext, useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';

const PanelBoundsContext = createContext<RefObject<HTMLElement | null> | null>(null);
export const PanelBoundsProvider = PanelBoundsContext.Provider;

type Props = {
  text: string;
  width?: number;
  placement?: 'above' | 'below';
};

const VIEWPORT_MARGIN = 10;
const ESTIMATED_HEIGHT = 100;

export function InfoTip({ text, width = 240, placement = 'below' }: Props) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const panelRef = useContext(PanelBoundsContext);

  const reposition = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const btnRect = btn.getBoundingClientRect();
    const containerRect = panelRef?.current?.getBoundingClientRect();

    const centerX = containerRect ? containerRect.left + containerRect.width / 2 : btnRect.left + btnRect.width / 2;
    let left = centerX - width / 2;
    left = Math.min(Math.max(left, VIEWPORT_MARGIN), window.innerWidth - width - VIEWPORT_MARGIN);

    const measuredHeight = popoverRef.current?.offsetHeight ?? ESTIMATED_HEIGHT;
    let top = placement === 'above' ? btnRect.top - measuredHeight - 8 : btnRect.bottom + 8;
    top = Math.min(Math.max(top, VIEWPORT_MARGIN), window.innerHeight - measuredHeight - VIEWPORT_MARGIN);

    setCoords({ top, left });
  };

  useEffect(() => {
    if (!open) return;
    reposition();
    const raf = requestAnimationFrame(reposition);

    const onReflow = () => reposition();
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, true);
    const onDocClick = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (popoverRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
      document.removeEventListener('mousedown', onDocClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, text, placement]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label="More info"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        style={{
          width: 14, height: 14, borderRadius: '50%', border: '1px solid rgba(255,255,255,.35)', background: open ? 'rgba(159,210,239,.25)' : 'transparent',
          color: '#9fd2ef', fontSize: 9, lineHeight: '12px', padding: 0, cursor: 'pointer', flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle',
        }}
      >i</button>
      {open && coords && createPortal(
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', top: coords.top, left: coords.left, width, zIndex: 9999, padding: 10, borderRadius: 8,
            background: '#0b1726', border: '1px solid rgba(160,205,235,.35)', color: '#dff1ff', fontSize: 11.3,
            lineHeight: 1.45, boxShadow: '0 12px 30px rgba(0,0,0,.55)',
          }}
        >
          {text}
        </div>,
        document.body,
      )}
    </>
  );
}
