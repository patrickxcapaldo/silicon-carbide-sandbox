import { ValueBars } from '../../../core/ui';
import { formatWatts } from '../visualizer/format';
import type { ChallengeEvaluation } from '../../../core/challenge/types';

const LOSSES = [
  { id: 'eclipse', label: 'Eclipse Shadow Loss' },
  { id: 'thermal', label: 'Cell Thermal Derating' },
  { id: 'radiation', label: 'Radiation Fluence Degradation' },
];

/** The three dominant losses, shared by the Challenge reveal. The largest is the one Orchid bar. */
export function LossBars({ evaluation }: { evaluation: ChallengeEvaluation }) {
  return (
    <ValueBars
      ariaLabel="Power loss breakdown"
      bars={LOSSES.map(({ id, label }) => {
        const value = evaluation.values[id] ?? 0;
        return { id, label, value, display: evaluation.formattedValues?.[id] ?? formatWatts(value) };
      })}
      bindingId={evaluation.answerId}
      bindingLabel="dominant loss"
    />
  );
}
