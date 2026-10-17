import type { ChallengeEvaluation, ChallengeLevel } from '../../../core/challenge/types';
import { ORBIT_PRESETS } from '../visualizer/orbitPresets';
import { PARAM_META } from '../visualizer/paramMeta';
import { formatQuantity, formatWatts, formatPercent } from '../visualizer/format';
import { LossBars } from './LossBars';
import { FormulaLine } from './FormulaLine';
import type { SolarLossBreakdown } from './losses';

export const answerOptions = [
  { id: 'eclipse', label: 'Eclipse' },
  { id: 'thermal', label: 'Thermal' },
  { id: 'radiation', label: 'Radiation' },
];

const SPEC_KEYS = [
  'solarArrayAreaM2',
  'baseCellEfficiency',
  'cellOperatingTempC',
  'missionDurationYears',
  'annualDegradationRate',
] as const;

const ENVIRONMENT_KEYS = [
  'tempCoefficientPwr',
  'pointingEfficiency',
  'bosEfficiency',
  'solarFluxWm2',
  'orbitEccentricity',
  'orbitRaanDeg',
] as const;

function orbitLabel(inputs: Record<string, number>): string {
  const preset = ORBIT_PRESETS.find(
    (candidate) =>
      candidate.altitudeKm === inputs.orbitAltitudeKm &&
      candidate.eccentricity === inputs.orbitEccentricity &&
      candidate.inclinationDeg === inputs.orbitInclinationDeg &&
      candidate.raanDeg === inputs.orbitRaanDeg,
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

export function SpecCard({
  level,
  evaluation,
}: {
  level: ChallengeLevel<Record<string, number>>;
  evaluation: ChallengeEvaluation;
}) {
  const inputs = level.inputs;
  return (
    <>
      <dl className="challenge-specs">
        {SPEC_KEYS.map((id) => (
          <SpecValue key={id} id={id} inputs={inputs} />
        ))}
        <div className="challenge-spec">
          <dt>Orbit</dt>
          <dd>{orbitLabel(inputs)}</dd>
        </div>
        <div className="challenge-spec">
          <dt>Orbit sunlit fraction (given)</dt>
          <dd>{((evaluation.sunlitFraction ?? 1) * 100).toFixed(1)}%</dd>
        </div>
      </dl>
      <details className="challenge-environment">
        <summary>System & environmental coefficients</summary>
        <dl>
          {ENVIRONMENT_KEYS.map((id) => (
            <EnvironmentValue key={id} id={id} inputs={inputs} />
          ))}
        </dl>
      </details>
    </>
  );
}

const challengeEquations = [
  {
    id: 'eclipse-drain',
    label: 'Eclipse shadow drain',
    latex: '\\Delta P_{\\text{eclipse}} = P_{\\text{sunlit}} \\cdot (1 - f_{\\text{sunlit}})',
    description: 'Loss from zero electrical generation during shadow transit through Earth’s shadow cylinder.',
  },
  {
    id: 'thermal-drain',
    label: 'Thermal bandgap drain',
    latex: '\\Delta P_{\\text{thermal}} = P_{\\text{BOL}} \\cdot |\\gamma| \\cdot (T_{\\text{cell}} - 28\\;{^\\circ}\\mathrm{C})',
    description: 'Efficiency reduction from equilibrium cell temperature rising above STC 28 °C rating.',
  },
  {
    id: 'radiation-drain',
    label: 'Radiation fluence drain',
    latex: '\\Delta P_{\\text{radiation}} = P_{\\text{temp}} \\cdot [1 - (1 - r_{\\text{deg}})^{\\Delta t}]',
    description: 'Permanent junction degradation from trapped proton/electron fluence over the mission lifespan.',
  },
];

export function Formulas() {
  return (
    <section className="challenge-formulas">
      <h3>Power Drain Reference</h3>
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
  level,
  evaluation,
  selectedAnswer,
  correct,
}: {
  level: ChallengeLevel<Record<string, number>>;
  evaluation: ChallengeEvaluation;
  selectedAnswer: string | null;
  correct: boolean;
}) {
  const details = evaluation.details as SolarLossBreakdown;
  const labels: Record<string, string> = {
    eclipse: 'Eclipse',
    thermal: 'Thermal',
    radiation: 'Radiation',
  };

  return (
    <section className="challenge-reveal-card">
      <div className="challenge-result-status">
        <div>
          <h2>{correct ? 'Correct' : 'Not quite'}</h2>
          <p>
            Your answer: <strong>{labels[selectedAnswer ?? ''] ?? 'Unanswered'}</strong>. Dominant loss:{' '}
            <strong>{labels[evaluation.answerId]}</strong>.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Orbit Average Power</span>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#38bdf8' }}>
            {formatWatts(details.orbitAveragePowerW)}
          </div>
        </div>
      </div>

      <LossBars evaluation={evaluation} />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', margin: '6px 0 10px' }}>
        <span>Sunlit Fraction: {formatPercent(evaluation.sunlitFraction ?? 1)}</span>
        <span>BOL Capacity: {formatWatts(details.unconstrainedBolW)}</span>
      </div>

      <p className="challenge-lesson">{level.lesson}</p>
    </section>
  );
}
