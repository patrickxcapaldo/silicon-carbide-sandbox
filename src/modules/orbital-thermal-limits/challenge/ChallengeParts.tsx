import type { ChallengeEvaluation, ChallengeLevel } from '../../../core/challenge/types';
import { ORBIT_PRESETS } from '../visualizer/orbitPresets';
import { PARAM_META } from '../visualizer/paramMeta';
import { StatusBadge } from '../visualizer/StatusBadge';
import { formatQuantity, formatWatts } from '../visualizer/format';
import type { ThermalStatus } from '../visualizer/types';
import { CeilingBars } from './CeilingBars';
import { FormulaLine } from './FormulaLine';
import type { OrbitalThermalResult } from '../sandbox/module';

const answerOptions = [
  { id: 'radiator', label: 'Radiator' },
  { id: 'coolant', label: 'Coolant' },
  { id: 'power', label: 'Power' },
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
  return <div className="challenge-spec"><dt>{meta.label}</dt><dd>{formatQuantity(inputs[id], meta.unit, meta.step)}</dd></div>;
}

function EnvironmentValue({ id, inputs }: { id: keyof typeof PARAM_META; inputs: Record<string, number> }) {
  const meta = PARAM_META[id];
  return <div><dt>{meta.label}</dt><dd>{formatQuantity(inputs[id], meta.unit, meta.step)}</dd></div>;
}

export function SpecCard({ level, evaluation }: { level: ChallengeLevel<Record<string, number>>; evaluation: ChallengeEvaluation }) {
  const inputs = level.inputs;
  return (
    <>
      <dl className="challenge-specs">
        {SPEC_KEYS.map((id) => <SpecValue key={id} id={id} inputs={inputs} />)}
        <div className="challenge-spec"><dt>Orbit</dt><dd>{orbitLabel(inputs)}</dd></div>
        <div className="challenge-spec"><dt>Sunlit fraction (given)</dt><dd>{((evaluation.sunlitFraction ?? 0) * 100).toFixed(1)}%</dd></div>
      </dl>
      <details className="challenge-environment">
        <summary>Environment details</summary>
        <dl>{ENVIRONMENT_KEYS.map((id) => <EnvironmentValue key={id} id={id} inputs={inputs} />)}</dl>
      </details>
    </>
  );
}

const challengeEquations = [
  { id: 'radiator-ceiling', label: 'Radiator ceiling R', latex: 'R=P_{rad}-P_{solar}-P_{albedo}-P_{parasitic}', description: 'Net radiative rejection after absorbed solar and albedo loads and parasitic heat.' },
  { id: 'coolant-ceiling', label: 'Coolant ceiling C', latex: 'C=\\dot m c_p\\Delta T', description: 'Sensible heat transported by the single-phase coolant loop.' },
  { id: 'power-ceiling', label: 'Power ceiling E', latex: 'E=P_{generated}-P_{parasitic}', description: 'Orbit-average array generation available for continuous compute after bus demand.' },
];

export function Formulas() {
  return (
    <section className="challenge-formulas">
      <h3>Ceiling reference</h3>
      {challengeEquations.map((equation) => (
        <section key={equation.id}>
          <strong>{equation.label}</strong>
          <FormulaLine latex={equation.latex} />
          <p>{equation.description}</p>
        </section>
      ))}
    </section>
  );
}

export function Reveal({
  level, evaluation, selectedAnswer, correct,
}: {
  level: ChallengeLevel<Record<string, number>>;
  evaluation: ChallengeEvaluation;
  selectedAnswer: string | null;
  correct: boolean;
}) {
  const result = evaluation.details as OrbitalThermalResult;
  const labels = Object.fromEntries(answerOptions.map(({ id, label }) => [id, label]));
  return (
    <section className="challenge-reveal-card">
      <div className="challenge-result-status">
        <div>
          <h2>{correct ? 'Correct' : 'Not quite'}</h2>
          <p>Your answer: <strong>{labels[selectedAnswer ?? ''] ?? 'Unanswered'}</strong>. Lowest ceiling: <strong>{labels[evaluation.answerId]}</strong>.</p>
        </div>
        <div><span>Requested-load status</span><StatusBadge status={evaluation.status as ThermalStatus} /></div>
      </div>
      <CeilingBars evaluation={evaluation} requestedLoad={result.resolvedInputs.computeWattsRequested} />
      {result.values.orbitSunlitFraction < 1 && <p>Orbit sunlit fraction: {(result.values.orbitSunlitFraction * 100).toFixed(1)}%</p>}
      <p className="challenge-lesson">{level.lesson}</p>
    </section>
  );
}
