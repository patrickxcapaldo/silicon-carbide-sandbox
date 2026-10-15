import { useMemo, useState } from 'react';
import { BUILD_INFO } from '../../../core/buildInfo';
import { MODULE_RELEASE_VERSION } from '../version';
import { orbitalThermalLimits } from '../sandbox/module';
import { ORBIT_PRESETS } from '../visualizer/orbitPresets';
import { PARAM_META } from '../visualizer/paramMeta';
import { StatusBadge } from '../visualizer/StatusBadge';
import { formatQuantity, formatWatts } from '../visualizer/format';
import type { ThermalStatus } from '../visualizer/types';
import { ceilingsOf, type ChallengeAnswer } from './ceilings';
import { CHALLENGE_LEVELS } from './levels';
import './ChallengeGame.css';

const ANSWERS: { key: ChallengeAnswer; label: string }[] = [
  { key: 'radiator', label: 'Radiator' },
  { key: 'coolant', label: 'Coolant' },
  { key: 'power', label: 'Power' },
];

const SPEC_KEYS = [
  'computeWattsRequested', 'radiatorArea', 'operatingTempC', 'flowRateKgS',
  'coolantDeltaT', 'solarPanelAreaM2', 'solarPanelEfficiency',
] as const;

const ENVIRONMENT_KEYS = [
  'emissivity', 'solarAbsorptivity', 'sinkTempK', 'earthIrTempK', 'earthAlbedo',
  'earthViewFactor', 'solarLoadWm2', 'sunIncidence', 'parasiticHeatW', 'solarPanelPointingFactor',
] as const;

function orbitLabel(inputs: Record<string, number>): string {
  const preset = ORBIT_PRESETS.find((candidate) =>
    candidate.altitudeKm === inputs.orbitAltitudeKm &&
    candidate.eccentricity === inputs.orbitEccentricity &&
    candidate.inclinationDeg === inputs.orbitInclinationDeg &&
    candidate.raanDeg === inputs.orbitRaanDeg &&
    candidate.argumentDeg === inputs.orbitArgumentDeg,
  );
  if (preset) return preset.label;
  const altitude = PARAM_META.orbitAltitudeKm;
  const inclination = PARAM_META.orbitInclinationDeg;
  return `${formatQuantity(inputs.orbitAltitudeKm, altitude.unit, altitude.step)} · ${formatQuantity(inputs.orbitInclinationDeg, inclination.unit, inclination.step)} inclination`;
}

function SpecValue({ id, inputs }: { id: keyof typeof PARAM_META; inputs: Record<string, number> }) {
  const meta = PARAM_META[id];
  return (
    <div className="challenge-spec">
      <dt>{meta.label}</dt>
      <dd>{formatQuantity(inputs[id], meta.unit, meta.step)}</dd>
    </div>
  );
}

function EnvironmentValue({ id, inputs }: { id: keyof typeof PARAM_META; inputs: Record<string, number> }) {
  const meta = PARAM_META[id];
  return (
    <div>
      <dt>{meta.label}</dt>
      <dd>{formatQuantity(inputs[id], meta.unit, meta.step)}</dd>
    </div>
  );
}

function copyFallback(text: string): boolean {
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

export function ChallengeGame() {
  const [levelIndex, setLevelIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<ChallengeAnswer | null>(null);
  const [score, setScore] = useState(0);
  const [roundResults, setRoundResults] = useState<boolean[]>([]);
  const [copyMessage, setCopyMessage] = useState('');
  const level = CHALLENGE_LEVELS[Math.min(levelIndex, CHALLENGE_LEVELS.length - 1)];
  const result = useMemo(() => orbitalThermalLimits.run(level.inputs), [level]);
  const ceilings = useMemo(() => ceilingsOf(result), [result]);
  const finished = levelIndex >= CHALLENGE_LEVELS.length;
  const requestedLoad = result.resolvedInputs.computeWattsRequested;
  const maximum = Math.max(requestedLoad, ceilings.radiator, ceilings.coolant, ceilings.power, 1);
  const shareString = useMemo(() => [
    `What Breaks First? ${score}/10 ${roundResults.map((correct) => correct ? '🟩' : '🟥').join('')}`,
    `Silicon Carbide Sandbox v${BUILD_INFO.sandboxVersion} · orbital-thermal-limits v${MODULE_RELEASE_VERSION}`,
  ].join('\n'), [roundResults, score]);

  if (finished) {
    const copyShareString = async () => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareString);
        } else if (!copyFallback(shareString)) {
          throw new Error('Clipboard copy is not available in this browser.');
        }
        setCopyMessage('Copied.');
      } catch {
        try {
          if (!copyFallback(shareString)) throw new Error('Clipboard copy failed.');
          setCopyMessage('Copied.');
        } catch (error) {
          setCopyMessage(error instanceof Error ? error.message : 'Clipboard copy failed.');
        }
      }
    };

    return (
      <main className="challenge-game" aria-live="polite">
        <section className="challenge-end-card">
          <h2>Challenge complete</h2>
          <p>Your score: <strong>{score} / {CHALLENGE_LEVELS.length}</strong></p>
          <pre className="challenge-share">{shareString}</pre>
          <div className="challenge-actions">
            <button className="challenge-button challenge-button-primary" type="button" onClick={copyShareString}>Copy</button>
            <button
              className="challenge-button"
              type="button"
              onClick={() => {
                setLevelIndex(0);
                setSelectedAnswer(null);
                setScore(0);
                setRoundResults([]);
                setCopyMessage('');
              }}
            >
              Play again
            </button>
          </div>
          <p className="challenge-copy-status" role="status">{copyMessage}</p>
        </section>
      </main>
    );
  }

  const isRevealed = selectedAnswer !== null;
  const status = result.status as ThermalStatus;

  return (
    <main className="challenge-game">
      <div className="challenge-toolbar">
        <div>
          <h2>What Breaks First?</h2>
          <p>Pick the lowest ceiling before the model reveals the budgets.</p>
        </div>
        <div className="challenge-progress" aria-label={`Level ${levelIndex + 1} of ${CHALLENGE_LEVELS.length}; score ${score}`}>
          <strong>{levelIndex + 1} / {CHALLENGE_LEVELS.length}</strong>
          <span>Score: {score}</span>
        </div>
      </div>

      <section className="challenge-prompt-card">
        <p>Level {levelIndex + 1}</p>
        <h2>{level.title}</h2>
        <dl className="challenge-specs">
          {SPEC_KEYS.map((id) => <SpecValue key={id} id={id} inputs={level.inputs} />)}
          <div className="challenge-spec">
            <dt>Orbit</dt>
            <dd>{orbitLabel(level.inputs)}</dd>
          </div>
        </dl>
        <details className="challenge-environment">
          <summary>Environment details</summary>
          <dl>
            {ENVIRONMENT_KEYS.map((id) => <EnvironmentValue key={id} id={id} inputs={level.inputs} />)}
          </dl>
        </details>

        <p className="challenge-question">Scale the compute demand up. Which limit do you hit first?</p>
        <div className="challenge-answer-buttons" role="group" aria-label="Choose the first limit">
          {ANSWERS.map(({ key, label }) => (
            <button
              key={key}
              className={`challenge-button${selectedAnswer === ceilings.answer && key === ceilings.answer ? ' is-correct' : ''}${selectedAnswer === key && selectedAnswer !== ceilings.answer ? ' is-incorrect' : ''}`}
              type="button"
              disabled={isRevealed}
              onClick={() => {
                if (selectedAnswer !== null) return;
                setSelectedAnswer(key);
                setRoundResults((previous) => [...previous, key === ceilings.answer]);
                if (key === ceilings.answer) setScore((previous) => previous + 1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {isRevealed && (
        <section className="challenge-reveal-card" aria-live="polite">
          <div className="challenge-result-status">
            <div>
              <h2>{selectedAnswer === ceilings.answer ? 'Correct' : 'Not quite'}</h2>
              <p>Lowest ceiling: <strong>{ANSWERS.find(({ key }) => key === ceilings.answer)?.label}</strong></p>
            </div>
            <div>
              <span>Requested-load status</span>
              <StatusBadge status={status} />
            </div>
          </div>
          <p className="challenge-marker-legend">White marker: requested compute load ({formatWatts(requestedLoad)}).</p>
          <div className="challenge-bars" aria-label="Capacity ceilings">
            {ANSWERS.map(({ key, label }) => {
              const value = ceilings[key];
              const width = Math.max(1.5, (Math.max(0, value) / maximum) * 100);
              const marker = Math.min(100, Math.max(0, (requestedLoad / maximum) * 100));
              return (
                <div className="challenge-bar-row" key={key}>
                  <div className="challenge-bar-label">{label}: {formatWatts(value)}</div>
                  <div
                    className="challenge-bar-track"
                    role="img"
                    aria-label={`${label} ceiling ${formatWatts(value)}${key === ceilings.answer ? ', lowest ceiling' : ''}`}
                  >
                    <div className={`challenge-bar-fill${key === ceilings.answer ? ' is-binding' : ''}`} style={{ width: `${width}%` }} />
                    <div className="challenge-request-marker" style={{ left: `${marker}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {result.values.orbitSunlitFraction < 1 && (
            <p>Orbit sunlit fraction: {(result.values.orbitSunlitFraction * 100).toFixed(1)}%</p>
          )}
          <p className="challenge-lesson">{level.lesson}</p>
          <div className="challenge-actions">
            <button
              className="challenge-button challenge-button-primary"
              type="button"
              onClick={() => {
                setLevelIndex((previous) => previous + 1);
                setSelectedAnswer(null);
              }}
            >
              {levelIndex + 1 === CHALLENGE_LEVELS.length ? 'Finish' : 'Next'}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
