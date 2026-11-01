import { PanelCard, SegButton, SegRow } from './controls';

type Props = {
  playing: boolean;
  setPlaying: (playing: boolean) => void;
  speed: number;
  setSpeed: (speed: number) => void;
  speedOptions: readonly number[];
  /** Formatted orbital period, e.g. "1 h 36 min". */
  period: string;
  /** Orbit progress 0..1 for the thin progress meter. */
  progress: number;
  /** Formatted real time for one orbit at the current speed. */
  secondsPerOrbit: string;
};

/** Play / pause, speed multiplier and progress, identical in every orbital module. */
export function OrbitPlayback({ playing, setPlaying, speed, setSpeed, speedOptions, period, progress, secondsPerOrbit }: Props) {
  return (
    <PanelCard>
      <div className="sci-row" style={{ gap: 8, marginBottom: 8 }}>
        <button
          type="button"
          className="sci-btn sci-btn--round"
          aria-pressed={playing}
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? '\u23F8\uFE0E' : '\u25B6\uFE0E'}
        </button>
        <div style={{ flex: 1 }}>
          <div className="sci-label" style={{ marginBottom: 0 }}>
            Orbital Period
          </div>
          <div style={{ fontWeight: 600 }}>{period}</div>
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <SegRow tight>
          {speedOptions.map((s) => (
            <SegButton key={s} active={speed === s} onClick={() => setSpeed(s)}>
              {s.toLocaleString('en-GB')}
              {'\u00d7'}
            </SegButton>
          ))}
        </SegRow>
      </div>
      <div className="sci-meter">
        <i style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} />
      </div>
      <p className="sci-hint" style={{ margin: 0 }}>
        At {speed.toLocaleString('en-GB')}
        {'\u00d7'}: one orbit completes in {'\u2248'}
        {secondsPerOrbit} of real time.
      </p>
    </PanelCard>
  );
}
