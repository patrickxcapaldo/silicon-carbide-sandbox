import { execFileSync } from 'node:child_process';

const suites = [
  'src/modules/orbital-thermal-limits/model.test.ts',
  'src/modules/solar-power-budget/model.test.ts',
];

console.log('Running test suites across all modules...\n');

for (const suite of suites) {
  console.log(`=== Running ${suite} ===`);
  try {
    await import(`../${suite}`);
    console.log(`=== Passed: ${suite} ===\n`);
  } catch (err) {
    console.error(`\n❌ Failed: ${suite}`, err);
    process.exit(1);
  }
}

console.log('✅ All module test suites passed successfully.');
