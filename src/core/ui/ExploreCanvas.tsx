import { createContext, useContext, useState, type CSSProperties, type ReactNode } from 'react';

type ControlsState = { collapsed: boolean; setCollapsed: (value: boolean) => void };
const ControlsContext = createContext<ControlsState>({ collapsed: false, setCollapsed: () => {} });
export const useExploreControls = () => useContext(ControlsContext);

type Props = {
  /** The scene (3D) or a <ExploreMain> (2D), plus any overlays. */
  children: ReactNode;
  /** A <ControlsPanel>. Rendered last so it sits above the scene. */
  controls: ReactNode;
  /** Accessible name for the region, e.g. "Orbital thermal explorer". */
  label: string;
};

/**
 * The Explore frame. Every module's Explore view is a <section> of this exact
 * size and look, with a collapsible Controls panel anchored to the right and
 * optional overlays (intro top-left, telemetry bottom). Below-canvas panels
 * are siblings, not children: return <> <ExploreCanvas/> <DetailsPanel/> </>.
 *
 * The collapsed state lives here so overlays and the 2D main region can make
 * room for the panel without each module wiring it up.
 */
export function ExploreCanvas({ children, controls, label }: Props) {
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 680px)').matches,
  );
  return (
    <ControlsContext.Provider value={{ collapsed, setCollapsed }}>
      <section className="sci-viz" aria-label={label} data-controls={collapsed ? 'collapsed' : 'open'}>
        {children}
        {controls}
      </section>
    </ControlsContext.Provider>
  );
}

/** Left-of-controls content region for 2D modules (charts, tables, tabs). */
export function ExploreMain({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="sci-viz__main" style={style}>
      {children}
    </div>
  );
}
