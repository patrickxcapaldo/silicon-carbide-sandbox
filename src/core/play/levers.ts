import type { PlayChange, PlayLever } from './types';

export interface LeverSpec {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  return value.toLocaleString('en-GB', { maximumSignificantDigits: 3 });
}

function toThreeSignificant(value: number): number {
  return Number(value.toPrecision(3));
}

function describe(spec: LeverSpec, before: number, after: number): string {
  const unit = spec.unit ? ` ${spec.unit}` : '';
  return `${spec.label} ${formatNumber(before)} → ${formatNumber(after)}${unit}`;
}

function pick<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

export type Range = readonly [number, number];

function logUniform([low, high]: Range, rng: () => number): number {
  return Math.exp(Math.log(low) + rng() * (Math.log(high) - Math.log(low)));
}

function changeOf(
  leverId: string,
  spec: LeverSpec,
  base: Record<string, number>,
  target: number,
): PlayChange | null {
  const before = base[spec.key];
  const after = toThreeSignificant(Math.min(spec.max, Math.max(spec.min, target)));
  if (after === before) return null;
  return {
    leverId,
    summary: describe(spec, before, after),
    inputs: { ...base, [spec.key]: after },
  };
}

/** Multiply one input by a factor drawn log-uniformly from `factor`, clamped to the declared range. */
export function scaleLever(spec: LeverSpec, factor: Range, lesson: string): PlayLever {
  return {
    id: spec.key,
    lesson,
    make: (base, rng) => changeOf(spec.key, spec, base, base[spec.key] * logUniform(factor, rng)),
  };
}

/** Add a whole-number step drawn uniformly from `step` (negative to subtract), clamped to the declared range. */
export function stepLever(spec: LeverSpec, step: Range, lesson: string): PlayLever {
  return {
    id: spec.key,
    lesson,
    make: (base, rng) => changeOf(spec.key, spec, base, base[spec.key] + Math.round(step[0] + rng() * (step[1] - step[0]))),
  };
}

export interface OrbitChoice {
  id: string;
  label: string;
  altitudeKm: number;
  eccentricity: number;
  inclinationDeg: number;
  raanDeg: number;
  argumentDeg: number;
}

const near = (left: number, right: number) => Math.abs(left - right) < 1e-6;

/** Swap the whole orbit for one of the module's own presets. */
export function orbitLever(presets: readonly OrbitChoice[], lesson: string): PlayLever {
  return {
    id: 'orbit',
    lesson,
    make: (base, rng) => {
      const candidates = presets.filter((preset) => !(
        near(base.orbitAltitudeKm, preset.altitudeKm) &&
        near(base.orbitEccentricity, preset.eccentricity) &&
        near(base.orbitInclinationDeg, preset.inclinationDeg) &&
        near(base.orbitRaanDeg, preset.raanDeg) &&
        near(base.orbitArgumentDeg, preset.argumentDeg)
      ));
      if (candidates.length === 0) return null;
      const preset = pick(candidates, rng);
      return {
        leverId: 'orbit',
        summary: `Orbit → ${preset.label}`,
        inputs: {
          ...base,
          orbitAltitudeKm: preset.altitudeKm,
          orbitEccentricity: preset.eccentricity,
          orbitInclinationDeg: preset.inclinationDeg,
          orbitRaanDeg: preset.raanDeg,
          orbitArgumentDeg: preset.argumentDeg,
        },
      };
    },
  };
}
