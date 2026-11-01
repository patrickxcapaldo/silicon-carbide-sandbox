import { useRef, type ReactNode } from 'react';
import { useExploreControls } from './ExploreCanvas';
import { PanelBoundsProvider } from './InfoTip';

type Props = {
  children: ReactNode;
  /** Primary action. Always labelled "Export" and always downloads the run record. */
  onExport?: () => void;
  /** Secondary action. Always labelled "Reset". */
  onReset?: () => void;
};

/**
 * The Controls panel: title "Controls", Export (primary, Orchid), Reset
 * (secondary) and a ▶ / ▼ chevron that collapses it to its header row.
 * Rendered inside <ExploreCanvas controls={...}>.
 */
export function ControlsPanel({ children, onExport, onReset }: Props) {
  const { collapsed, setCollapsed } = useExploreControls();
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className={`sci-controls${collapsed ? ' is-collapsed' : ''}`}>
      <PanelBoundsProvider value={ref}>
        <div className="sci-controls__head">
          <h3 className="sci-controls__title">Controls</h3>
          <div className="sci-controls__actions">
            {!collapsed && onExport && (
              <button type="button" className="sci-btn sci-btn--primary" onClick={onExport}>
                Export
              </button>
            )}
            {!collapsed && onReset && (
              <button type="button" className="sci-btn" onClick={onReset}>
                Reset
              </button>
            )}
            <button
              type="button"
              className="sci-btn sci-btn--icon"
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Expand controls' : 'Collapse controls'}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? '\u25B6\uFE0E' : '\u25BC'}
            </button>
          </div>
        </div>
        {!collapsed && <div>{children}</div>}
      </PanelBoundsProvider>
    </div>
  );
}
