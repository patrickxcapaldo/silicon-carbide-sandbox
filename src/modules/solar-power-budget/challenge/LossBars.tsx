import { formatWatts } from '../visualizer/format';
import type { ChallengeEvaluation } from '../../../core/challenge/types';

export function LossBars({ evaluation }: { evaluation: ChallengeEvaluation }) {
  const maximum = Math.max(...Object.values(evaluation.values), 1);

  return (
    <div className="challenge-bars" aria-label="Power loss breakdown">
      {[
        { id: 'eclipse', label: 'Eclipse Shadow Loss' },
        { id: 'thermal', label: 'Cell Thermal Derating' },
        { id: 'radiation', label: 'Radiation Fluence Degradation' },
      ].map(({ id, label }) => {
        const value = evaluation.values[id] ?? 0;
        const isDominant = id === evaluation.answerId;
        const formatted = evaluation.formattedValues?.[id] ?? formatWatts(value);
        const width = Math.max(2, (Math.max(0, value) / maximum) * 100);

        return (
          <div className="challenge-bar-row" key={id}>
            <div className="challenge-bar-label">{label}: {formatted}</div>
            <div
              className="challenge-bar-track"
              role="img"
              aria-label={`${label}: ${formatted}${isDominant ? ', dominant loss' : ''}`}
            >
              <div
                className={`challenge-bar-fill${isDominant ? ' is-binding' : ''}`}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
