import { ValueBars } from '../../../core/ui';
import { formatWatts } from '../visualizer/format';
import type { ChallengeEvaluation } from '../../../core/challenge/types';

const CEILINGS = [
  { id: 'radiator', label: 'Radiator' },
  { id: 'coolant', label: 'Coolant' },
  { id: 'power', label: 'Power' },
];

/** The three compute ceilings, shared by Explore (below the canvas) and the Challenge reveal. */
export function CeilingBars({ evaluation, requestedLoad }: { evaluation: ChallengeEvaluation; requestedLoad: number }) {
  return (
    <ValueBars
      ariaLabel="Capacity ceilings"
      bars={CEILINGS.map(({ id, label }) => ({
        id,
        label,
        value: evaluation.values[id],
        display: evaluation.formattedValues?.[id] ?? formatWatts(evaluation.values[id]),
      }))}
      bindingId={evaluation.answerId}
      bindingLabel="lowest ceiling"
      marker={{ value: requestedLoad, legend: `requested compute (${formatWatts(requestedLoad)})` }}
    />
  );
}
