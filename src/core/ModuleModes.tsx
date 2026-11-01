import type { ReactNode } from 'react';
import { useState } from 'react';
import { ModeToggle, type ModuleMode } from './challenge/ModeToggle';

type Props = {
  /** Mounted only while Explore is selected, so it re-reads inputs on return. */
  explore: ReactNode;
  /** Kept mounted (hidden) so a run in progress survives switching modes. Omit if not built. */
  challenge?: ReactNode;
  play?: ReactNode;
};

/**
 * The mode switcher and tool region every module page ends with:
 *   <ModulePageFrame> <Chapter/> <ModuleModes explore challenge play/> </ModulePageFrame>
 * Provides the `#module-tool` anchor the chapter's skip link targets. A mode
 * that a module has not built yet shows the same standard notice everywhere.
 */
export function ModuleModes({ explore, challenge, play }: Props) {
  const [mode, setMode] = useState<ModuleMode>('explore');
  const missing = (name: string) => (
    <p className="sci-note" style={{ maxWidth: 780, margin: '1rem auto' }}>
      {name} for this module is not built yet. Switch back to Explore.
    </p>
  );
  return (
    <>
      <ModeToggle mode={mode} onChange={setMode} />
      <div id="module-tool">
        <div hidden={mode !== 'challenge'}>{challenge}</div>
        <div hidden={mode !== 'play'}>{play}</div>
        {mode === 'challenge' && !challenge && missing('Challenge')}
        {mode === 'play' && !play && missing('Play')}
        {mode === 'explore' && explore}
      </div>
    </>
  );
}
