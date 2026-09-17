/**
 * silicon-carbide-sandbox module contract.
 *
 * This file is the connective tissue of the ecosystem. Every module, whatever
 * domain it covers, exposes the same shape so that modules can be inspected,
 * composed and validated without knowing anything about each other's
 * internals.
 *
 * The design rules behind it:
 *
 * 1. A module is a pure function from a typed input record to a typed output
 *    record. No I/O, no globals, no clock, no randomness unless it is passed
 *    in explicitly. This is what makes a module testable, reproducible and
 *    safe to call from a UI at 60 fps, a batch sweep, a notebook or another
 *    module.
 * 2. Every quantity carries a unit and a physical dimension. Dimensions are
 *    what let the ecosystem check that an output actually can feed a given
 *    input, rather than trusting that two things both called "power" mean the
 *    same thing.
 * 3. Values crossing module boundaries are full-precision numbers. Rounding
 *    and formatting belong to presentation, never to the computation, because
 *    rounding errors compound when modules are chained.
 * 4. Out-of-range or missing inputs are reported, not silently replaced. A
 *    module may still substitute a default so that a UI stays responsive, but
 *    it has to say that it did.
 */

/** SI base dimensions, as exponents. Dimensionless is all zeroes. */
export type Dimension = {
  mass?: number;
  length?: number;
  time?: number;
  current?: number;
  temperature?: number;
};

export const DIMENSIONLESS: Dimension = {};
export const DIM_POWER: Dimension = { mass: 1, length: 2, time: -3 };
export const DIM_AREA: Dimension = { length: 2 };
export const DIM_LENGTH: Dimension = { length: 1 };
export const DIM_TEMPERATURE: Dimension = { temperature: 1 };
export const DIM_TIME: Dimension = { time: 1 };
export const DIM_MASS_FLOW: Dimension = { mass: 1, time: -1 };
export const DIM_IRRADIANCE: Dimension = { mass: 1, time: -3 };
export const DIM_ANGLE: Dimension = DIMENSIONLESS;

/** Two dimensions match when every exponent matches, treating absent as zero. */
export function sameDimension(a: Dimension, b: Dimension): boolean {
  const keys: (keyof Dimension)[] = ['mass', 'length', 'time', 'current', 'temperature'];
  return keys.every((k) => (a[k] ?? 0) === (b[k] ?? 0));
}

export function formatDimension(d: Dimension): string {
  const parts: string[] = [];
  const symbols: [keyof Dimension, string][] = [
    ['mass', 'M'], ['length', 'L'], ['time', 'T'], ['current', 'I'], ['temperature', 'Θ'],
  ];
  for (const [key, symbol] of symbols) {
    const exp = d[key] ?? 0;
    if (exp !== 0) parts.push(exp === 1 ? symbol : `${symbol}^${exp}`);
  }
  return parts.length ? parts.join('·') : 'dimensionless';
}

/** Declaration of one input a module accepts. */
export type PortSpec = {
  /** Stable machine key. Never change this without a major version bump. */
  key: string;
  label: string;
  /** Display unit the canonical value is expressed in. */
  unit: string;
  dimension: Dimension;
  description: string;
  /** Canonical-unit bounds. Values outside are clamped and reported. */
  min?: number;
  max?: number;
  defaultValue: number;
  /**
   * Hint for ecosystem wiring: the kind of upstream module that would
   * naturally supply this input. Purely advisory, used by tooling and by
   * humans reading the module, not enforced here.
   */
  typicalSource?: string;
};

/** Declaration of one output a module produces. */
export type OutputSpec = {
  key: string;
  label: string;
  unit: string;
  dimension: Dimension;
  description: string;
  /**
   * Whether this output is a physical quantity suitable for feeding another
   * module, or a derived indicator meant for humans. Both are legitimate;
   * marking them keeps composition honest.
   */
  kind: 'quantity' | 'indicator';
};

/** Static, inspectable description of a module. */
export type ModuleDescriptor = {
  /** Stable ecosystem identifier, for example 'orbital-thermal-limits'. */
  id: string;
  /** Semantic version of the *contract*, not the implementation. */
  version: string;
  title: string;
  summary: string;
  /** Scientific domains this module draws on, for ecosystem navigation. */
  domains: string[];
  inputs: PortSpec[];
  outputs: OutputSpec[];
  /**
   * Plain statements of what the module deliberately does not model. Kept
   * machine-readable so that a composed pipeline can surface the union of
   * every constituent module's caveats rather than hiding them.
   */
  assumptions: string[];
};

export type Severity = 'info' | 'warning' | 'error';

export type Diagnostic = {
  severity: Severity;
  /** Input or output key this concerns, where applicable. */
  key?: string;
  message: string;
};

/**
 * Result of running a module. `values` holds full-precision canonical-unit
 * numbers keyed by output key, suitable for feeding directly into another
 * module. Everything else is metadata.
 */
export type ModuleResult<TOutputs extends Record<string, number> = Record<string, number>> = {
  values: TOutputs;
  diagnostics: Diagnostic[];
  /** Inputs actually used after defaulting and clamping, for reproducibility. */
  resolvedInputs: Record<string, number>;
};

/** The single interface every module implements. */
export type SandboxModule<TOutputs extends Record<string, number> = Record<string, number>> = {
  descriptor: ModuleDescriptor;
  run(inputs: Partial<Record<string, number>>): ModuleResult<TOutputs>;
};

/**
 * Resolve a raw input record against a module's port specs: apply defaults for
 * anything missing, clamp anything out of range, reject anything non-finite,
 * and record a diagnostic for each intervention. Shared by every module so
 * that input handling behaves identically across the ecosystem.
 */
export function resolveInputs(
  specs: PortSpec[],
  raw: Partial<Record<string, number>>,
): { resolved: Record<string, number>; diagnostics: Diagnostic[] } {
  const resolved: Record<string, number> = {};
  const diagnostics: Diagnostic[] = [];

  for (const spec of specs) {
    const supplied = raw[spec.key];
    let value: number;

    if (supplied === undefined) {
      value = spec.defaultValue;
    } else if (typeof supplied !== 'number' || !Number.isFinite(supplied)) {
      value = spec.defaultValue;
      diagnostics.push({
        severity: 'error', key: spec.key,
        message: `${spec.label} received a non-finite value and fell back to the default of ${spec.defaultValue} ${spec.unit}.`,
      });
    } else {
      value = supplied;
      if (spec.min !== undefined && value < spec.min) {
        diagnostics.push({
          severity: 'warning', key: spec.key,
          message: `${spec.label} was ${value} ${spec.unit}, below the supported minimum of ${spec.min} ${spec.unit}, and was clamped.`,
        });
        value = spec.min;
      }
      if (spec.max !== undefined && value > spec.max) {
        diagnostics.push({
          severity: 'warning', key: spec.key,
          message: `${spec.label} was ${value} ${spec.unit}, above the supported maximum of ${spec.max} ${spec.unit}, and was clamped.`,
        });
        value = spec.max;
      }
    }
    resolved[spec.key] = value;
  }

  // An unknown key is almost always a typo or a stale wiring, and silently
  // ignoring it is how a pipeline ends up quietly running on defaults.
  const known = new Set(specs.map((s) => s.key));
  for (const key of Object.keys(raw)) {
    if (!known.has(key)) {
      diagnostics.push({
        severity: 'warning', key,
        message: `Input '${key}' is not declared by this module and was ignored.`,
      });
    }
  }

  return { resolved, diagnostics };
}

/**
 * Check whether one module's output can legitimately feed another's input.
 * Dimension agreement is necessary but not sufficient: torque and energy share
 * a dimension yet are not interchangeable, so a human still has to agree the
 * connection is meaningful. This catches the mechanical errors.
 */
export function canConnect(from: OutputSpec, to: PortSpec): { ok: boolean; reason?: string } {
  if (!sameDimension(from.dimension, to.dimension)) {
    return {
      ok: false,
      reason: `Dimension mismatch: ${from.label} is ${formatDimension(from.dimension)} but ${to.label} expects ${formatDimension(to.dimension)}.`,
    };
  }
  if (from.unit !== to.unit) {
    return {
      ok: false,
      reason: `Unit mismatch: ${from.label} is in ${from.unit} but ${to.label} expects ${to.unit}. Convert before connecting.`,
    };
  }
  return { ok: true };
}
