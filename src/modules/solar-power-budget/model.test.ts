import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compute } from './model';
import { runSolarKernel, type SolarKernelInputs } from './sandbox/kernel';
import { solarPowerBudget } from './sandbox/module';
import { canConnect, resolveInputs } from '../../core/contract';
import { DAWN_DUSK_SSO_ORBIT } from '../../core/orbitalMechanics';
import { orbitalThermalLimits } from '../orbital-thermal-limits/sandbox/module';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const baseInputs = {
  solarArrayAreaM2: 4,
  baseCellEfficiency: 0.30,
  solarFluxWm2: 1361,
  cellOperatingTempC: 65,
  tempCoefficientPwr: -0.0025,
  missionDurationYears: 5,
  annualDegradationRate: 0.015,
  pointingEfficiency: 0.98,
  bosEfficiency: 0.88,
  orbitAltitudeKm: DAWN_DUSK_SSO_ORBIT.orbitAltitudeKm,
  orbitEccentricity: DAWN_DUSK_SSO_ORBIT.orbitEccentricity,
  orbitInclinationDeg: DAWN_DUSK_SSO_ORBIT.orbitInclinationDeg,
  orbitRaanDeg: DAWN_DUSK_SSO_ORBIT.orbitRaanDeg,
  orbitArgumentDeg: DAWN_DUSK_SSO_ORBIT.orbitArgumentDeg,
};

// 1. Basic physics assertions
{
  const res = solarPowerBudget.run(baseInputs);
  assert(res.values.orbitAveragePowerW > 0, 'Average power must be positive');
  assert(res.values.orbitAveragePowerW <= res.values.instantaneousSunlitPowerW, 'Average power must not exceed sunlit peak power');
  assert(res.values.instantaneousSunlitPowerW <= res.values.beginningOfLifePowerW, 'EOL sunlit power must not exceed BOL power');
  assert(res.values.orbitSunlitFraction >= 0 && res.values.orbitSunlitFraction <= 1, 'Sunlit fraction must be within [0, 1]');
  assert(res.values.orbitEnergyGeneratedWh > 0, 'Generated energy per orbit must be positive');
}

// 2. Sensitivity tests
{
  // Area scaling
  const resSmall = solarPowerBudget.run({ ...baseInputs, solarArrayAreaM2: 2 });
  const resLarge = solarPowerBudget.run({ ...baseInputs, solarArrayAreaM2: 8 });
  assert(Math.abs(resLarge.values.orbitAveragePowerW - 4 * resSmall.values.orbitAveragePowerW) < 1e-6, 'Power should scale linearly with array area');

  // Temperature sensitivity
  const resCool = solarPowerBudget.run({ ...baseInputs, cellOperatingTempC: 28 });
  const resHot = solarPowerBudget.run({ ...baseInputs, cellOperatingTempC: 80 });
  assert(resCool.values.orbitAveragePowerW > resHot.values.orbitAveragePowerW, 'Cooler array must generate more power');

  // Degradation sensitivity
  const resYr0 = solarPowerBudget.run({ ...baseInputs, missionDurationYears: 0 });
  const resYr10 = solarPowerBudget.run({ ...baseInputs, missionDurationYears: 10 });
  assert(resYr0.values.orbitAveragePowerW > resYr10.values.orbitAveragePowerW, 'Year 0 array must generate more power than Year 10');

  // Pointing sensitivity
  const resPerfectPointing = solarPowerBudget.run({ ...baseInputs, pointingEfficiency: 1.0 });
  const resPoorPointing = solarPowerBudget.run({ ...baseInputs, pointingEfficiency: 0.8 });
  assert(resPerfectPointing.values.orbitAveragePowerW > resPoorPointing.values.orbitAveragePowerW, 'Better pointing must yield higher power');
}

// 3. Adapter vs Composable Module Agreement
{
  const modResult = solarPowerBudget.run(baseInputs);
  const adaptResult = compute(baseInputs);
  assert(
    Math.round(modResult.values.orbitAveragePowerW) === adaptResult.outputs.orbitAveragePowerW.value,
    'Adapter output must match rounded module output',
  );
}

// 4. Contract and Clamping Assertions
{
  // Undeclared input produces warning diagnostic
  const withTypo = solarPowerBudget.run({ ...baseInputs, randomUndeclaredKey: 123 } as Record<string, number>);
  assert(withTypo.diagnostics.some((d) => d.key === 'randomUndeclaredKey'), 'Undeclared key must trigger diagnostic');

  // Out-of-range clamping
  const clamped = solarPowerBudget.run({ ...baseInputs, baseCellEfficiency: 0.99 });
  assert(clamped.resolvedInputs.baseCellEfficiency === 0.50, 'Out-of-range efficiency must clamp to max 0.50');
  assert(clamped.diagnostics.some((d) => d.key === 'baseCellEfficiency' && d.severity === 'warning'), 'Clamping must trigger warning');

  // Non-finite value fallback
  const nonFinite = solarPowerBudget.run({ ...baseInputs, solarArrayAreaM2: Number.NaN });
  assert(nonFinite.resolvedInputs.solarArrayAreaM2 === 4.0, 'NaN input must fall back to defaultValue');
  assert(nonFinite.diagnostics.some((d) => d.key === 'solarArrayAreaM2' && d.severity === 'error'), 'NaN input must trigger error diagnostic');

  // All declared outputs produced
  for (const outSpec of solarPowerBudget.descriptor.outputs) {
    assert(
      typeof (modResultValues(solarPowerBudget.run(baseInputs))[outSpec.key]) === 'number',
      `Declared output ${outSpec.key} must be produced by run()`,
    );
  }

  // Declared defaults within valid ranges
  const { diagnostics: defDiag } = resolveInputs(solarPowerBudget.descriptor.inputs, {});
  assert(defDiag.length === 0, 'Default port specs must not trigger any clamping diagnostics');
}

function modResultValues(res: ReturnType<typeof solarPowerBudget.run>): Record<string, number> {
  return res.values as unknown as Record<string, number>;
}

// 5. Composition Check with orbital-thermal-limits
{
  const solarOut = solarPowerBudget.descriptor.outputs.find((o) => o.key === 'orbitAveragePowerW')!;
  const thermalIn = orbitalThermalLimits.descriptor.inputs.find((i) => i.key === 'externalGeneratedPowerW')!;
  assert(thermalIn !== undefined, 'orbital-thermal-limits must declare externalGeneratedPowerW port');
  assert(canConnect(solarOut, thermalIn).ok, 'solar-power-budget orbitAveragePowerW must connect to orbital-thermal-limits externalGeneratedPowerW');

  // Verify end-to-end composition run
  const solarRun = solarPowerBudget.run({ solarArrayAreaM2: 10 });
  const thermalRun = orbitalThermalLimits.run({
    computeWattsRequested: 500,
    externalGeneratedPowerW: solarRun.values.orbitAveragePowerW,
  });
  assert(
    thermalRun.values.generatedPowerW === solarRun.values.orbitAveragePowerW,
    'orbital-thermal-limits must adopt externalGeneratedPowerW when supplied',
  );
}

// 6. Golden Vector Verification
{
  const gvPath = fileURLToPath(new URL('../../../data/golden-vectors/solar-power-budget.json', import.meta.url));
  const doc = JSON.parse(readFileSync(gvPath, 'utf8')) as {
    vectors: Array<{
      id: string;
      inputs: Record<string, number>;
      expect: Record<string, number>;
      note?: string;
    }>;
  };

  const relTol = 1e-6;

  for (const v of doc.vectors) {
    const actual = runSolarKernel(v.inputs as unknown as SolarKernelInputs) as unknown as Record<string, number>;

    for (const [key, expected] of Object.entries(v.expect)) {
      const got = actual[key];
      assert(typeof got === 'number', `Golden vector ${v.id}: missing output ${key}`);
      const relDiff = Math.abs(got - expected) / Math.max(Math.abs(expected), 1e-12);
      assert(relDiff < relTol, `Golden vector ${v.id}: ${key} expected ${expected}, got ${got} (${v.note ?? ''})`);
    }
  }

  console.log(`${doc.vectors.length} solar-power-budget golden vectors passed.`);
}

console.log('All solar-power-budget model, contract, composition and golden-vector assertions completed.');
