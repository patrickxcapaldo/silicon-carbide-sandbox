import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

/**
 * The (i) button. One look, one behaviour, every module:
 *   - 16px circle, neutral at rest, Orchid outline on hover or when open
 *   - click or Enter/Space toggles; Escape or an outside click closes
 *   - the popover is portalled to <body> with fixed coordinates, so it is
 *     never clipped by a scrolling panel or trapped under a sibling's
 *     stacking context
 *
 * Inside a Controls panel the popover centres on the panel (a fixed-width
 * popover then always fits); elsewhere it centres on the button.
 */
const PanelBoundsContext = createContext<RefObject<HTMLElement | null> | null>(null);
export const PanelBoundsProvider = PanelBoundsContext.Provider;

type Props = {
  /** Plain-text explanation. Use children for richer content. */
  text?: string;
  children?: ReactNode;
  /** Accessible name; defaults to "More info". */
  label?: string;
  width?: number;
  /** Which side of the button to open on. Use 'above' near the bottom of the screen. */
  placement?: 'above' | 'below';
};

const VIEWPORT_MARGIN = 10;
const ESTIMATED_HEIGHT = 100;

export function InfoTip({ text, children, label = 'More info', width = 240, placement = 'below' }: Props) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const panelRef = useContext(PanelBoundsContext);
  const popId = useId();

  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const btn = btnRef.current;
      if (!btn) return;
      const b = btn.getBoundingClientRect();
      const c = panelRef?.current?.getBoundingClientRect();
      const centreX = c ? c.left + c.width / 2 : b.left + b.width / 2;
      const w = Math.min(width, window.innerWidth - VIEWPORT_MARGIN * 2);
      const left = Math.min(Math.max(centreX - w / 2, VIEWPORT_MARGIN), window.innerWidth - w - VIEWPORT_MARGIN);
      const h = popRef.current?.offsetHeight ?? ESTIMATED_HEIGHT;
      const rawTop = placement === 'above' ? b.top - h - 8 : b.bottom + 8;
      const top = Math.min(Math.max(rawTop, VIEWPORT_MARGIN), window.innerHeight - h - VIEWPORT_MARGIN);
      setCoords({ top, left });
    };
    reposition();
    const raf = requestAnimationFrame(reposition); // again once the real height is measurable
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, width, placement, panelRef]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="sci-info"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        i
      </button>
      {open &&
        coords &&
        createPortal(
          <div
            id={popId}
            ref={popRef}
            role="note"
            className="sci-info-pop"
            style={{ top: coords.top, left: coords.left, width: Math.min(width, window.innerWidth - VIEWPORT_MARGIN * 2) }}
            onClick={(e) => e.stopPropagation()}
          >
            {children ?? text}
          </div>,
          document.body,
        )}
    </>
  );
}
