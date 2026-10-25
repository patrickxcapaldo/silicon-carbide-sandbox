import './challenge.css';

export type ModuleMode = 'explore' | 'challenge' | 'play';

const MODES: { id: ModuleMode; label: string }[] = [
  { id: 'explore', label: 'Explore' },
  { id: 'challenge', label: 'Challenge' },
  { id: 'play', label: 'Play' },
];

export function ModeToggle({ mode, onChange }: { mode: ModuleMode; onChange: (mode: ModuleMode) => void }) {
  return (
    <div className="challenge-mode-toggle" role="group" aria-label="Module mode">
      {MODES.map(({ id, label }) => (
        <button type="button" key={id} aria-pressed={mode === id} onClick={() => onChange(id)}>{label}</button>
      ))}
    </div>
  );
}
