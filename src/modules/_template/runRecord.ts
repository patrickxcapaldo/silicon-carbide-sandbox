import { BUILD_INFO } from '../../core/buildInfo';
import type { DownloadableRunRecord } from '../../core/ui';
import { manifest } from './manifest';
import { run } from './model';

export interface RunRecord extends DownloadableRunRecord {
  schemaVersion: 1;
  software: { sandboxVersion: string; sourceCommit: string; sourceDirty: boolean; moduleId: string; moduleReleaseVersion: string };
  inputs: Record<string, number>;
  outputs: Record<string, number>;
}

/** What the Export button downloads. Record everything needed to reproduce the run. */
export function createRunRecord(inputs: Record<string, number>, createdAt = new Date()): RunRecord {
  return {
    schemaVersion: 1,
    createdAt: createdAt.toISOString(),
    software: {
      sandboxVersion: BUILD_INFO.sandboxVersion,
      sourceCommit: BUILD_INFO.sourceCommit,
      sourceDirty: BUILD_INFO.sourceDirty,
      moduleId: manifest.id,
      moduleReleaseVersion: manifest.releaseVersion,
    },
    inputs,
    outputs: run(inputs),
  };
}
