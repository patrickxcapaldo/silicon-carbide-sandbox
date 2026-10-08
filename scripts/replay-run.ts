import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { verifyRunRecord, type OrbitalThermalRunRecord } from '../src/modules/orbital-thermal-limits/runRecord';

const recordPath = process.argv[2];

if (!recordPath) {
  console.error('Usage: npm run replay -- <path-to-run-record.json>');
  process.exitCode = 1;
} else {
  try {
    const record = JSON.parse(readFileSync(resolve(recordPath), 'utf8')) as OrbitalThermalRunRecord;
    const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
    const currentCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    if (record.software.sourceDirty) throw new Error('This run was exported from a dirty source tree and cannot be replayed as a release.');
    if (record.software.sandboxVersion !== packageJson.version) {
      throw new Error(`Record Sandbox version ${record.software.sandboxVersion} does not match ${packageJson.version}`);
    }
    if (record.software.sourceCommit !== currentCommit) {
      throw new Error(`Record source commit ${record.software.sourceCommit} does not match checked-out commit ${currentCommit}`);
    }
    verifyRunRecord(record);
    console.log(`Verified ${record.software.moduleId} v${record.software.moduleReleaseVersion} from ${record.software.sourceCommit}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}