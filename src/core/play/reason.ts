import { formatNumber } from './levers';
import type { PlayDefinition, PlayRound } from './types';

const SAME_AS_BASELINE = 0.005;

/** Builds the reveal text from model values. The only static text is each lever's own law. */
export function playReason(definition: PlayDefinition, round: PlayRound): string[] {
  const winner = round.higher === 'a' ? round.a : round.b;
  const loser = round.higher === 'a' ? round.b : round.a;
  const lines = [
    `${winner.change.summary} gives ${definition.format(winner.value)}. ` +
      `${loser.change.summary} gives ${definition.format(loser.value)}. ` +
      `That is ${formatNumber(round.ratio)}× apart.`,
  ];

  const winningLever = definition.levers.find((lever) => lever.id === winner.change.leverId);
  if (winningLever) lines.push(winningLever.lesson);

  const labels = definition.bindingLabels;
  if (labels && round.baseBinding) {
    for (const option of [winner, loser]) {
      if (!option.binding) continue;
      if (option.binding !== round.baseBinding) {
        lines.push(`${option.change.summary}: the limit moves from the ${labels[round.baseBinding]} to the ${labels[option.binding]}.`);
      } else if (Math.abs(option.value - round.baseValue) / round.baseValue < SAME_AS_BASELINE) {
        lines.push(`${option.change.summary} changed nothing: the limit stayed with the ${labels[round.baseBinding]}, and this changed a different ceiling.`);
      }
    }
  }
  return lines;
}
