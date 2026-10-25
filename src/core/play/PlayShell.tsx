import { useMemo, useState } from 'react';
import { createRandomSeed, normaliseSeed } from '../challenge/rng';
import type { ChallengeDifficulty } from '../challenge/types';
import { generatePlayRun, PLAY_ROUND_COUNT } from './generator';
import { formatNumber } from './levers';
import { playReason } from './reason';
import { playScore, playShareString } from './scoring';
import type { PlayDefinition, PlayOption, PlayRound, PlayRoundRecord, PlaySide } from './types';
import '../challenge/challenge.css';
import './play.css';

const DIFFICULTIES: ChallengeDifficulty[] = ['easy', 'medium', 'hard'];
const BAND_TEXT: Record<ChallengeDifficulty, string> = {
  easy: 'the two answers are at least 2× apart',
  medium: 'the two answers are 1.3× to 2× apart',
  hard: 'the two answers are only 1.1× to 1.3× apart',
};

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the textarea method.
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  return copied;
}

function barPercentages(values: number[]): number[] {
  const logs = values.map((value) => Math.log(value));
  const low = Math.min(...logs) - 0.8;
  const high = Math.max(...logs);
  return logs.map((log) => Math.max(4, ((log - low) / (high - low)) * 100));
}

function OptionButton({ side, option, round, picked, definition, onPick }: {
  side: PlaySide;
  option: PlayOption;
  round: PlayRound;
  picked: PlaySide | null;
  definition: PlayDefinition;
  onPick: (side: PlaySide) => void;
}) {
  const answered = picked !== null;
  const isHigher = round.higher === side;
  const className = `play-option${answered && isHigher ? ' is-correct' : ''}${answered && picked === side && !isHigher ? ' is-incorrect' : ''}`;
  const mark = !answered ? '' : isHigher ? '✓ Higher' : picked === side ? '✗ Lower' : 'Lower';
  return (
    <button className={className} type="button" disabled={answered} aria-pressed={picked === side} onClick={() => onPick(side)}>
      <span className="play-option-tag">Change {side.toUpperCase()}</span>
      <span className="play-option-change">{option.change.summary}</span>
      {answered && <span className="play-option-mark">{mark}: {definition.format(option.value)}</span>}
    </button>
  );
}

export function PlayShell({ definition }: { definition: PlayDefinition }) {
  const [phase, setPhase] = useState<'setup' | 'playing' | 'scorecard'>('setup');
  const [difficulty, setDifficulty] = useState<ChallengeDifficulty>('medium');
  const [seedInput, setSeedInput] = useState('');
  const [seed, setSeed] = useState('');
  const [rounds, setRounds] = useState<PlayRound[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<PlaySide | null>(null);
  const [records, setRecords] = useState<PlayRoundRecord[]>([]);
  const [error, setError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');

  const round = rounds[index];
  const score = playScore(records);
  const reason = useMemo(() => (round ? playReason(definition, round) : []), [definition, round]);
  const shareString = phase === 'scorecard'
    ? playShareString({ title: definition.title, seed, difficulty, records, versionInfo: definition.versionInfo })
    : '';

  const begin = () => {
    setError('');
    try {
      const chosen = seedInput.trim() ? normaliseSeed(seedInput) : createRandomSeed();
      const run = generatePlayRun(definition, chosen, difficulty);
      setSeed(chosen);
      setSeedInput(chosen);
      setRounds(run);
      setIndex(0);
      setPicked(null);
      setRecords([]);
      setCopyMessage('');
      setPhase('playing');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not begin Play.');
    }
  };

  const pick = (side: PlaySide) => {
    if (!round || picked !== null) return;
    setPicked(side);
    setRecords((previous) => [...previous, { round, picked: side, correct: side === round.higher }]);
  };

  const advance = () => {
    if (index + 1 >= rounds.length) {
      setPhase('scorecard');
      return;
    }
    setIndex((previous) => previous + 1);
    setPicked(null);
  };

  const copy = async () => setCopyMessage((await copyText(shareString)) ? 'Copied.' : 'Clipboard copy failed.');

  if (phase === 'setup') {
    return (
      <main className="challenge-shell" aria-labelledby="play-setup-title">
        <section className="challenge-shell-card">
          <h2 id="play-setup-title">Higher or Lower</h2>
          <p><strong>Guess the limit. Physics keeps score.</strong></p>
          <p>{definition.intro}</p>
          <p>{PLAY_ROUND_COUNT} quick rounds. Each ends with the real numbers and a one-line reason.</p>
          <p><strong>Nothing leaves this device.</strong></p>
          <div className="challenge-shell-settings">
            <label>
              Difficulty
              <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as ChallengeDifficulty)}>
                {DIFFICULTIES.map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
              </select>
            </label>
            <label>
              Seed (optional; blank starts a new random run)
              <input value={seedInput} maxLength={12} onChange={(event) => setSeedInput(event.target.value)} placeholder="For example K7F2Q" />
            </label>
          </div>
          <p className="challenge-shell-muted">{difficulty[0].toUpperCase() + difficulty.slice(1)}: {BAND_TEXT[difficulty]}.</p>
          {error && <p className="challenge-shell-inline-error" role="alert">{error}</p>}
          <div className="challenge-shell-actions">
            <button className="challenge-shell-button challenge-shell-button-primary" type="button" onClick={begin}>Begin Play</button>
          </div>
        </section>
      </main>
    );
  }

  if (phase === 'scorecard') {
    const misses = records.filter((record) => !record.correct);
    return (
      <main className="challenge-shell" aria-live="polite">
        <section className="challenge-shell-card">
          <h2>Play complete</h2>
          <p><strong>Score:</strong> {score} / {records.length}</p>
          <p><strong>Difficulty:</strong> {difficulty}</p>
          <p><strong>Seed:</strong> {seed}</p>
          {misses.length > 0 && (
            <section>
              <h3>Review</h3>
              <div className="challenge-shell-review">
                {misses.map((record) => {
                  const higher = record.round.higher === 'a' ? record.round.a : record.round.b;
                  return (
                    <div className="challenge-shell-review-item" key={record.round.index}>
                      <strong>Round {record.round.index + 1}: {record.round.scenario.title}</strong>
                      <p>Higher: {higher.change.summary} ({definition.format(higher.value)}), {formatNumber(record.round.ratio)}× the other.</p>
                      <p>{playReason(definition, record.round)[1]}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
          <pre className="challenge-share">{shareString}</pre>
          <div className="challenge-shell-actions">
            <button className="challenge-shell-button challenge-shell-button-primary" type="button" onClick={copy}>Copy</button>
            <button className="challenge-shell-button" type="button" onClick={begin}>Play again</button>
            <button className="challenge-shell-button" type="button" onClick={() => { setPhase('setup'); setCopyMessage(''); }}>Change settings</button>
          </div>
          <p className="challenge-shell-muted" role="status">{copyMessage}</p>
        </section>
      </main>
    );
  }

  if (!round) return null;
  const values = [round.baseValue, round.a.value, round.b.value];
  const widths = barPercentages(values);
  const bars: { label: string; value: number; width: number; higher: boolean }[] = [
    { label: 'Baseline', value: values[0], width: widths[0], higher: false },
    { label: 'Change A', value: values[1], width: widths[1], higher: round.higher === 'a' },
    { label: 'Change B', value: values[2], width: widths[2], higher: round.higher === 'b' },
  ];
  const correct = picked === round.higher;

  return (
    <main className="challenge-shell">
      <div className="challenge-shell-row">
        <h2>Higher or Lower</h2>
        <span>Round {index + 1} / {rounds.length} · Score {score}</span>
      </div>
      <p>{difficulty[0].toUpperCase() + difficulty.slice(1)} · seed {seed}</p>
      <section className="challenge-shell-card">
        <h2>{round.scenario.title}</h2>
        <p className="play-baseline">
          Baseline {definition.metricLabel}: <strong>{definition.format(round.baseValue)}</strong>
        </p>
        <details className="play-baseline-spec">
          <summary>Baseline spec</summary>
          <dl>
            {definition.inputInfo.map((info) => (
              <div key={info.key}>
                <dt>{info.label}</dt>
                <dd>{formatNumber(round.scenario.inputs[info.key])}{info.unit ? ` ${info.unit}` : ''}</dd>
              </div>
            ))}
          </dl>
        </details>
        <p><strong>Which change gives the higher {definition.metricLabel}?</strong></p>
        <div className="play-options" role="group" aria-label="Choose the higher result">
          <OptionButton side="a" option={round.a} round={round} picked={picked} definition={definition} onPick={pick} />
          <OptionButton side="b" option={round.b} round={round} picked={picked} definition={definition} onPick={pick} />
        </div>
      </section>
      <div aria-live="polite">
        {picked !== null && (
          <section className="challenge-shell-card play-reveal">
            <p className="play-verdict">{correct ? '✓ Correct.' : '✗ Not this time.'}</p>
            <ul className="play-bars" aria-label={`${definition.metricLabel} on a logarithmic scale`}>
              {bars.map((bar) => (
                <li className={`play-bar-row${bar.higher ? ' is-higher' : ''}`} key={bar.label}>
                  <span>{bar.label}</span>
                  <span className="play-bar-track"><span className="play-bar-fill" style={{ display: 'block', width: `${bar.width}%` }} /></span>
                  <span className="play-bar-value">{definition.format(bar.value)}</span>
                </li>
              ))}
            </ul>
            <p className="play-bar-axis">Bar lengths use a logarithmic scale.</p>
            {reason.map((line) => <p className="play-reason" key={line}>{line}</p>)}
            <div className="challenge-shell-actions">
              <button className="challenge-shell-button challenge-shell-button-primary" type="button" onClick={advance}>
                {index === rounds.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
