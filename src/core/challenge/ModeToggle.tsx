import './challenge.css';

export type ModuleMode = 'explore' | 'challenge';

export function ModeToggle({ mode, onChange }: { mode: ModuleMode; onChange: (mode: ModuleMode) => void }) {
  return (
    <div className="challenge-mode-toggle" role="group" aria-label="Module mode">
      <button type="button" aria-pressed={mode === 'explore'} onClick={() => onChange('explore')}>Explore</button>
      <button type="button" aria-pressed={mode === 'challenge'} onClick={() => onChange('challenge')}>Challenge</button>
    </div>
  );
}
