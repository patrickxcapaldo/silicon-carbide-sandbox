const suites = [
  'src/core/play/play.test.ts',
  'src/modules/orbital-thermal-limits/model.test.ts',
  'src/modules/orbital-thermal-limits/challenge/challenge.test.ts',
  'src/modules/orbital-thermal-limits/play/play.test.ts',
  'src/modules/solar-power-budget/model.test.ts',
  'src/modules/solar-power-budget/challenge/challenge.test.ts',
  'src/modules/solar-power-budget/play/play.test.ts',
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
