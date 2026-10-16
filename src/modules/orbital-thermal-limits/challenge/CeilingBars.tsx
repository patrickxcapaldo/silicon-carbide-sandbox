import { formatWatts } from '../visualizer/format';
import type { ChallengeEvaluation } from '../../../core/challenge/types';

export function CeilingBars({ evaluation, requestedLoad }: { evaluation: ChallengeEvaluation; requestedLoad: number }) {
  const maximum = Math.max(requestedLoad, ...Object.values(evaluation.values), 1);
  const marker = Math.min(100, Math.max(0, (requestedLoad / maximum) * 100));
  return (
    <div className="challenge-bars" aria-label="Capacity ceilings">
      {[
        { id: 'radiator', label: 'Radiator' },
        { id: 'coolant', label: 'Coolant' },
        { id: 'power', label: 'Power' },
      ].map(({ id, label }) => {
        const value = evaluation.values[id];
        const isLowest = id === evaluation.answerId;
        const formatted = evaluation.formattedValues?.[id] ?? formatWatts(value);
        const width = Math.max(1.5, (Math.max(0, value) / maximum) * 100);
        return (
          <div className="challenge-bar-row" key={id}>
            <div className="challenge-bar-label">{label}: {formatted}</div>
            <div className="challenge-bar-track" role="img" aria-label={`${label} ceiling ${formatted}${isLowest ? ', lowest ceiling' : ''}`}>
              <div className={`challenge-bar-fill${isLowest ? ' is-binding' : ''}`} style={{ width: `${width}%` }} />
              <div className="challenge-request-marker" style={{ left: `${marker}%` }} />
            </div>
            {isLowest && <span className="challenge-binding-label">Lowest ceiling</span>}
          </div>
        );
      })}
    </div>
  );
}
