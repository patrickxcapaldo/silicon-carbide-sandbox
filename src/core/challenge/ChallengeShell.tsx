import { useEffect, useMemo, useState } from 'react';
import { createRandomSeed } from './rng';
import { generateRandomRun } from './generator';
import { challengeShareString, finalScore, formatElapsedTime } from './scoring';
import type {
  ChallengeDefinition,
  ChallengeDifficulty,
  ChallengeLevel,
  ChallengeRoundRecord,
  ChallengeSettings,
  ChallengeTimer,
} from './types';
import './challenge.css';

const DIFFICULTIES: ChallengeDifficulty[] = ['easy', 'medium', 'hard'];
function formatTimerSettings(timer: ChallengeTimer, difficulty: ChallengeDifficulty, limits: Record<ChallengeDifficulty, number>): string {
  if (timer === 'off') return 'Off';
  if (timer === 'stopwatch') return 'Stopwatch';
  return `Time limit (${formatElapsedTime(limits[difficulty])})`;
}

export function ChallengeShell<Inputs extends Record<string, number>>({
  definition,
}: {
  definition: ChallengeDefinition<Inputs>;
}) {
  const [phase, setPhase] = useState<'setup' | 'playing' | 'scorecard'>('setup');
  const [questionSet, setQuestionSet] = useState<'classic' | 'random'>('classic');
  const [difficulty, setDifficulty] = useState<ChallengeDifficulty>('medium');
  const [hintsEnabled, setHintsEnabled] = useState(true);
  const [timerMode, setTimerMode] = useState<ChallengeTimer>('off');
  const [seedInput, setSeedInput] = useState('');
  const [settings, setSettings] = useState<ChallengeSettings | null>(null);
  const [levels, setLevels] = useState<ChallengeLevel<Inputs>[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [visibleHintCount, setVisibleHintCount] = useState(0);
  const [records, setRecords] = useState<ChallengeRoundRecord<Inputs>[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [copyMessage, setCopyMessage] = useState('');
  const [setupError, setSetupError] = useState('');

  const level = levels[currentIndex];
  const evaluation = useMemo(
    () => level ? definition.evaluate(level.inputs) : null,
    [definition, level],
  );
  const roundHints = useMemo(
    () => level && evaluation ? definition.hints(level, evaluation) : null,
    [definition, evaluation, level],
  );
  const timeLimit = settings?.timer === 'limit' && settings
    ? definition.timeLimitsSeconds[settings.difficulty]
    : undefined;
  const timedOut = timeLimit !== undefined && phase === 'playing' && elapsedSeconds >= timeLimit;
  const isQuestionOpen = phase === 'playing' && selectedAnswer === null && !timedOut;
  const scoreRecords = useMemo(() => {
    if (!timedOut || !settings) return records;
    return [
      ...records,
      ...levels.slice(currentIndex).map((pendingLevel, index): ChallengeRoundRecord<Inputs> => ({
        level: pendingLevel,
        evaluation: definition.evaluate(pendingLevel.inputs),
        selectedAnswer: null,
        correct: false,
        hintsUsed: index === 0 ? visibleHintCount : 0,
      })),
    ];
  }, [currentIndex, definition, levels, records, settings, timedOut, visibleHintCount]);

  useEffect(() => {
    if (!isQuestionOpen) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      setElapsedSeconds((previous) => previous + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isQuestionOpen]);

  const score = finalScore(scoreRecords, settings?.hints ?? hintsEnabled);
  const displayedTime = timeLimit === undefined ? elapsedSeconds : Math.min(elapsedSeconds, timeLimit);
  const versionInfo = `${definition.versionInfo}`;

  const begin = () => {
    setSetupError('');
    const seed = questionSet === 'random'
      ? (seedInput.trim() || createRandomSeed())
      : seedInput.trim();
    try {
      const run = questionSet === 'classic'
        ? { levels: definition.classicLevels, fallbackCount: 0, attempts: 0 }
        : generateRandomRun(definition, seed, difficulty);
      if (questionSet === 'random') setSeedInput(seed);
      setSettings({
        questionSet,
        difficulty,
        hints: hintsEnabled,
        timer: timerMode,
        seed,
        generatedSeed: questionSet === 'random' ? seed : undefined,
      });
      setLevels(run.levels);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setVisibleHintCount(0);
      setRecords([]);
      setElapsedSeconds(0);
      setPhase('playing');
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : 'Could not begin the challenge.');
    }
  };

  const answer = (answerId: string) => {
    if (!evaluation || selectedAnswer !== null) return;
    const correct = answerId === evaluation.answerId;
    setSelectedAnswer(answerId);
    setRecords((previous) => [...previous, {
      level,
      evaluation,
      selectedAnswer: answerId,
      correct,
      hintsUsed: visibleHintCount,
    }]);
  };

  const advance = () => {
    if (currentIndex + 1 >= levels.length) {
      setPhase('scorecard');
      return;
    }
    setCurrentIndex((previous) => previous + 1);
    setSelectedAnswer(null);
    setVisibleHintCount(0);
  };

  const resetForSettings = () => {
    setPhase('setup');
    setCopyMessage('');
  };

  const shareString = settings
    ? challengeShareString({
      title: definition.title,
      score,
      settings,
      timeSeconds: displayedTime,
      versionInfo,
      records: scoreRecords,
    })
    : '';

  const copyShareString = async () => {
    const fallback = () => {
      const textarea = document.createElement('textarea');
      textarea.value = shareString;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.append(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      return copied;
    };
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(shareString);
      else if (!fallback()) throw new Error('Clipboard copy is not available in this browser.');
      setCopyMessage('Copied.');
    } catch {
      if (fallback()) setCopyMessage('Copied.');
      else setCopyMessage('Clipboard copy failed.');
    }
  };

  if (phase === 'setup') {
    return (
      <main className="challenge-shell" aria-labelledby="challenge-setup-title">
        <section className="challenge-shell-card">
          <h2 id="challenge-setup-title">{definition.title}</h2>
          <p>What it is: a short challenge in identifying the first limit on a satellite compute system.</p>
          <p>What it tests: whether you can compare radiator rejection, coolant transport and orbit-average electrical power.</p>
          <ol>
            <li>Read the spacecraft spec card.</li>
            <li>Work out or estimate the three ceilings.</li>
            <li>Choose what breaks first as compute demand rises.</li>
          </ol>
          <p>Hints reveal the method first, then coolant and power working, then radiator working. Each hint costs one point from your final score.</p>
          <p><strong>Nothing leaves this device.</strong></p>
          <div className="challenge-shell-settings">
            <label>
              Question set
              <select value={questionSet} onChange={(event) => setQuestionSet(event.target.value as 'classic' | 'random')}>
                <option value="classic">Classic — fixed ten</option>
                <option value="random">Random — seeded</option>
              </select>
            </label>
            <label>
              Difficulty {questionSet === 'classic' ? '(Classic is Mixed)' : ''}
              <select value={difficulty} disabled={questionSet === 'classic'} onChange={(event) => setDifficulty(event.target.value as ChallengeDifficulty)}>
                {DIFFICULTIES.map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
              </select>
            </label>
            <label>
              Hints
              <select value={hintsEnabled ? 'on' : 'off'} onChange={(event) => setHintsEnabled(event.target.value === 'on')}>
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </label>
            <label>
              Timer
              <select value={timerMode} onChange={(event) => setTimerMode(event.target.value as ChallengeTimer)}>
                <option value="off">Off</option>
                <option value="stopwatch">Stopwatch</option>
                <option value="limit">{formatTimerSettings('limit', difficulty, definition.timeLimitsSeconds)}</option>
              </select>
            </label>
            {questionSet === 'random' && (
              <label>
                Seed (optional; blank starts a new random run)
                <input value={seedInput} maxLength={12} onChange={(event) => setSeedInput(event.target.value)} placeholder="For example K7F2Q" />
              </label>
            )}
          </div>
          <p className="challenge-shell-muted">Random difficulty controls the separation between the lowest and next-lowest ceiling.</p>
          {setupError && <p className="challenge-shell-inline-error" role="alert">{setupError}</p>}
          <div className="challenge-shell-actions">
            <button className="challenge-shell-button challenge-shell-button-primary" type="button" onClick={begin}>Begin Challenge</button>
          </div>
        </section>
      </main>
    );
  }

  if (phase === 'scorecard' || timedOut) {
    return (
      <main className="challenge-shell" aria-live="polite">
        <section className="challenge-shell-card">
          <h2>Challenge complete</h2>
          <p><strong>Score:</strong> {score} / 10</p>
          <p><strong>Set:</strong> {settings?.questionSet === 'classic' ? 'Classic' : 'Random'}</p>
          <p><strong>Difficulty:</strong> {settings?.questionSet === 'classic' ? 'Mixed' : settings?.difficulty}</p>
          <p><strong>Hints used:</strong> {settings?.hints ? scoreRecords.reduce((sum, record) => sum + record.hintsUsed, 0) : 0}</p>
          <p><strong>Time:</strong> {formatElapsedTime(displayedTime)}{timedOut ? ' — time limit reached' : ''}</p>
          {settings?.questionSet === 'random' && <p><strong>Seed:</strong> {settings.generatedSeed}</p>}
          {timedOut && <p>Unanswered questions count as incorrect.</p>}
          {scoreRecords.some((record) => !record.correct) && (
            <section>
              <h3>Review</h3>
              <div className="challenge-shell-review">
                {scoreRecords.filter((record) => !record.correct).map((record) => (
                  <div className="challenge-shell-review-item" key={record.level.id}>
                    <strong>{record.level.title}</strong>
                    <p>{record.level.lesson}</p>
                    <p>{Object.entries(record.evaluation.values).map(([id, value]) => `${definition.options.find((option) => option.id === id)?.label ?? id}: ${record.evaluation.formattedValues?.[id] ?? value.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`).join(' · ')}</p>
                    <p>Correct answer: {definition.options.find((option) => option.id === record.evaluation.answerId)?.label}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
          <pre className="challenge-share">{shareString}</pre>
          <div className="challenge-shell-actions">
            <button className="challenge-shell-button challenge-shell-button-primary" type="button" onClick={copyShareString}>Copy</button>
            <button className="challenge-shell-button" type="button" onClick={begin}>Play again</button>
            <button className="challenge-shell-button" type="button" onClick={resetForSettings}>Change settings</button>
          </div>
          <p className="challenge-shell-muted" role="status">{copyMessage}</p>
        </section>
      </main>
    );
  }

  if (!level || !evaluation) return null;
  const levelHints = roundHints!;
  const resultCorrect = selectedAnswer === evaluation.answerId;

  return (
    <main className="challenge-shell">
      <div className="challenge-shell-row">
        <h2>{definition.title}</h2>
        <span>Level {currentIndex + 1} / 10 · Score {score}</span>
      </div>
      <p>{settings?.questionSet === 'classic' ? 'Classic · Mixed' : `Random · ${settings?.difficulty} · seed ${settings?.generatedSeed}`}</p>
      {settings?.timer !== 'off' && <p role="timer" aria-label="Challenge timer">{formatElapsedTime(displayedTime)}{timeLimit ? ` / ${formatElapsedTime(timeLimit)}` : ''}</p>}
      <section className="challenge-shell-card">
        <h2>{level.title}</h2>
        <definition.SpecCard level={level} evaluation={evaluation} />
        {settings?.questionSet === 'random' && settings.difficulty === 'easy' && <definition.Formulas />}
        {settings?.questionSet === 'random' && settings.difficulty === 'medium' && (
          <details>
            <summary>Formulas</summary>
            <definition.Formulas />
          </details>
        )}
        <p><strong>Scale the compute demand up. Which limit do you hit first?</strong></p>
        {settings?.hints && selectedAnswer === null && (
          <div>
            {visibleHintCount < levelHints.length && (
              <button
                className="challenge-shell-button"
                type="button"
                onClick={() => setVisibleHintCount((previous) => Math.min(previous + 1, levelHints.length))}
              >
                {visibleHintCount === 0 ? 'Show a hint' : 'Show next hint'}
              </button>
            )}
            {levelHints.slice(0, visibleHintCount).map((hint, index) => (
              <div className="challenge-shell-hint" key={`${hint.title}-${index}`}>
                <strong>{hint.title}</strong>
                <div>{hint.working}</div>
              </div>
            ))}
          </div>
        )}
        <div className="challenge-answer-buttons" role="group" aria-label="Choose the first limit">
          {definition.options.map((option) => (
            <button
              className="challenge-button"
              type="button"
              key={option.id}
              disabled={selectedAnswer !== null}
              aria-pressed={selectedAnswer === option.id}
              onClick={() => answer(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>
      <div aria-live="polite">
        {selectedAnswer !== null && (
          <>
            <definition.Reveal level={level} evaluation={evaluation} selectedAnswer={selectedAnswer} correct={resultCorrect} />
            <div className="challenge-shell-actions">
              <button className="challenge-shell-button challenge-shell-button-primary" type="button" onClick={advance}>
                {currentIndex === levels.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
