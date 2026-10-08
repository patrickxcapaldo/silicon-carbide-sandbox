import { BUILD_INFO } from '../../core/buildInfo';
import { INPUT_SPECS, orbitalThermalLimits } from './sandbox/module';

type JsonNumber = number | 'Infinity' | '-Infinity' | 'NaN';

export interface OrbitalThermalRunRecord {
  schemaVersion: 1;
  createdAt: string;
  software: {
    sandboxVersion: string;
    sourceCommit: string;
    sourceDirty: boolean;
    moduleId: string;
    moduleReleaseVersion: string;
    moduleContractVersion: string;
  };
  requestedInputs: Record<string, number>;
  resolvedInputs: Record<string, number>;
  outputs: Record<string, JsonNumber>;
  status: string;
  diagnostics: ReturnType<typeof orbitalThermalLimits.run>['diagnostics'];
  assumptions: string[];
  assumptionRegistryRevisions: { id: string; revision: number }[];
}

function jsonNumber(value: number): JsonNumber {
  if (Number.isNaN(value)) return 'NaN';
  if (value === Number.POSITIVE_INFINITY) return 'Infinity';
  if (value === Number.NEGATIVE_INFINITY) return '-Infinity';
  return value;
}

export function createRunRecord(
  inputs: Record<string, number>,
  createdAt = new Date(),
): OrbitalThermalRunRecord {
  const requestedInputs = Object.fromEntries(
    INPUT_SPECS
      .filter(({ key }) => Object.hasOwn(inputs, key))
      .map(({ key }) => [key, inputs[key]]),
  );
  const result = orbitalThermalLimits.run(requestedInputs);

  return {
    schemaVersion: 1,
    createdAt: createdAt.toISOString(),
    software: {
      sandboxVersion: BUILD_INFO.sandboxVersion,
      sourceCommit: BUILD_INFO.sourceCommit,
      sourceDirty: BUILD_INFO.sourceDirty,
      moduleId: orbitalThermalLimits.descriptor.id,
      moduleReleaseVersion: orbitalThermalLimits.descriptor.releaseVersion,
      moduleContractVersion: orbitalThermalLimits.descriptor.contractVersion,
    },
    requestedInputs,
    resolvedInputs: result.resolvedInputs,
    outputs: Object.fromEntries(
      Object.entries(result.values).map(([key, value]) => [key, jsonNumber(value)]),
    ),
    status: result.status,
    diagnostics: result.diagnostics,
    assumptions: orbitalThermalLimits.descriptor.assumptions,
    assumptionRegistryRevisions: [],
  };
}

export function verifyRunRecord(record: OrbitalThermalRunRecord): void {
  const descriptor = orbitalThermalLimits.descriptor;
  if (record.schemaVersion !== 1) throw new Error(`Unsupported run record schema version: ${record.schemaVersion}`);
  if (record.software.moduleId !== descriptor.id) throw new Error(`Record module ${record.software.moduleId} does not match ${descriptor.id}`);
  if (record.software.moduleReleaseVersion !== descriptor.releaseVersion) {
    throw new Error(`Record module release ${record.software.moduleReleaseVersion} does not match ${descriptor.releaseVersion}`);
  }
  if (record.software.moduleContractVersion !== descriptor.contractVersion) {
    throw new Error(`Record contract ${record.software.moduleContractVersion} does not match ${descriptor.contractVersion}`);
  }
  if (JSON.stringify(record.assumptions) !== JSON.stringify(descriptor.assumptions)) {
    throw new Error('Declared assumptions do not match the archived run record');
  }

  const result = orbitalThermalLimits.run(record.requestedInputs);
  if (JSON.stringify(result.resolvedInputs) !== JSON.stringify(record.resolvedInputs)) {
    throw new Error('Resolved inputs do not match the archived run record');
  }
  if (result.status !== record.status) throw new Error(`Status mismatch: expected ${record.status}, got ${result.status}`);
  if (JSON.stringify(result.diagnostics) !== JSON.stringify(record.diagnostics)) {
    throw new Error('Diagnostics do not match the archived run record');
  }

  const outputEntries = Object.entries(result.values);
  if (outputEntries.length !== Object.keys(record.outputs).length) throw new Error('Output key count does not match the archived run record');
  for (const [key, value] of outputEntries) {
    if (jsonNumber(value) !== record.outputs[key]) throw new Error(`Output mismatch for ${key}`);
  }
}