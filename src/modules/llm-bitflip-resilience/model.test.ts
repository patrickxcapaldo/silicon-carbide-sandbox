import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { compute } from './model';
import { INPUT_SPECS, OUTPUT_SPECS, llmBitflipResilience } from './sandbox/module';
import * as k from './sandbox/kernel';
import { MODELS, SWEEPS, TABLE_8, SEMANTIC_COLLAPSE } from './data/radiai-measured';
import { OUTCOMES } from './data/outcomes';
import { canConnect, resolveInputs } from '../../core/contract';
import { orbitalThermalLimits } from '../orbital-thermal-limits/sandbox/module';
import { createRunRecord, verifyRunRecord } from './runRecord';
import { manifest } from './manifest';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}
function near(a: number, b: number, tol: number, message: string): void {
  assert(Math.abs(a - b) <= tol, `${message}: expected ${b} +/- ${tol}, got ${a}`);
}
function rel(a: number, b: number, tol: number, message: string): void {
  assert(Math.abs(a - b) / Math.max(Math.abs(b), 1e-300) <= tol, `${message}: expected ${b}, got ${a} (rel tol ${tol})`);
}

/* 1. Table integrity ------------------------------------------------- */
{
  for (const s of SWEEPS) {
    const params = MODELS[s.model].params;
    for (const r of s.rows) {
      near(Math.round(k.fpbFromFlips(r.flips, params) * 100) / 100, r.fpb, 1e-9, `Table ${s.table}: FPB at ${r.flips} flips`);
      assert(r.n === 25, `Table ${s.table}: n must be 25`);
      assert(r.survivalPct % 4 === 0, `Table ${s.table}: survival must be a multiple of 4 % for n = 25`);
    }
    assert(s.rows.every((r, i) => i === 0 || r.flips > s.rows[i - 1].flips), `Table ${s.table}: doses ascending`);
  }
  assert(SWEEPS.find((s) => s.table === 4)!.rows.length === 6, 'Table 4 has six dose levels');
  assert(SWEEPS.find((s) => s.table === 5)!.rows.length === 7, 'Table 5 has seven dose levels');
  assert(SWEEPS.find((s) => s.table === 6)!.rows.length === 6, 'Table 6 has six dose levels');
  assert(SWEEPS.find((s) => s.table === 7)!.rows.length === 7, 'Table 7 has seven dose levels');

  // Empirical 50 % crossings reproduce Table 8 and the abstract.
  const cross = k.allCrossings();
  near(cross['A-original'].fpb, 5.45, 0.0051, 'Model A original crossing');
  near(cross['A-replication'].fpb, 4.44, 0.0051, 'Model A replication crossing');
  near(cross['B-original'].fpb, 10.13, 0.0051, 'Model B original crossing');
  near(cross['B-replication'].fpb, 8.75, 0.0051, 'Model B replication crossing');
  for (const t of TABLE_8) {
    near(cross[`${t.model}-${t.batch}`].fpb, t.empiricalCrossingFpb, 0.0051, `Table 8 crossing ${t.model} ${t.batch}`);
  }
  // Absolute-flip crossings, Table 3: approximately 36 to 44 and 27 to 31.
  assert(cross['A-replication'].flips > 35.5 && cross['A-original'].flips < 44, 'Model A absolute crossings about 36 to 44 flips');
  assert(cross['B-replication'].flips > 26.5 && cross['B-original'].flips < 31.5, 'Model B absolute crossings about 27 to 31 flips');
  near(k.N50_REF, 39.6875, 1e-9, 'N50_ref is the mean of the two Model A crossings');
  near(k.N50_REF_BAND[0], 35.625, 1e-9, 'N50_ref band, lower');
  near(k.N50_REF_BAND[1], 43.75, 1e-9, 'N50_ref band, upper');

  // Footprints and ratio.
  const gbA = k.bytesToGb(k.footprintBytes(MODELS.A.params, 2));
  const gbB = k.bytesToGb(k.footprintBytes(MODELS.B.params, 2));
  near(gbA, 16.06, 5e-3, 'Model A footprint');
  near(gbB, 6.17, 5e-3, 'Model B footprint');
  near(gbA / gbB, 2.602, 5e-4, 'Footprint ratio');

  // Parameter shares and baselines.
  for (const id of ['A', 'B'] as const) {
    const p = MODELS[id].paramShare;
    near(p.selfAttentionPct + p.mlpPct + p.otherPct, 100, 1e-9, `Parameter shares for model ${id} sum to 100 %`);
  }
  assert(MODELS.A.cleanAccuracyPct === 69.3 && MODELS.B.cleanAccuracyPct === 57.0, 'Clean baselines 69.3 % and 57.0 %');
  assert(MODELS.A.params === 8.03e9 && MODELS.B.params === 3.086e9, 'Parameter counts');
  assert(SEMANTIC_COLLAPSE.probePassesCollapsedPct[0] === 17 && SEMANTIC_COLLAPSE.probePassesCollapsedPct[1] === 24, 'Canary pass range 17 to 24 %');
}

/* 2. FP16 ------------------------------------------------------------ */
{
  assert(k.fp16Decode(0x3c00) === 1, '0x3C00 is 1.0');
  assert(k.fp16Decode(0x2c00) === 0.0625, '0x2C00 is 0.0625');
  assert(k.fp16Encode(1) === 0x3c00 && k.fp16Encode(0.0625) === 0x2c00, 'Encode 1.0 and 0.0625');
  assert(k.fp16Decode(0xbc00) === -1, 'Sign bit negates');
  assert(k.fp16Encode(65504) === 0x7bff && k.fp16Decode(0x7bff) === 65504, 'FP16 maximum is 65504');
  assert(k.fp16Decode(0x0001) === 2 ** -24, 'Smallest subnormal');
  assert(k.fp16Encode(65520) === 0x7c00, 'Overflow rounds to the Inf pattern');
  // Round trip over every finite pattern.
  for (let b = 0; b < 0x10000; b++) {
    const exp = (b >> 10) & 0x1f;
    if (exp === 0x1f) continue;
    const v = k.fp16Decode(b);
    const e = k.fp16Encode(v);
    assert(e === b || (v === 0 && (e & 0x7fff) === 0), `Encode(decode(0x${b.toString(16)})) is the identity`);
  }
  // Exponent flip factors 2^{1,2,4,8,16} on a normal weight.
  const w = k.fp16Encode(0.02);
  for (const bit of [10, 11, 12, 13, 14]) {
    const eff = k.flipEffect(w, bit);
    const wasZero = ((w >> bit) & 1) === 0;
    const expected = k.exponentFlipFactor(bit, wasZero);
    rel(eff.ratio, expected, 1e-12, `Exponent bit ${bit} factor`);
    assert(Math.abs(Math.log2(eff.ratio)) === 2 ** (bit - 10), `Bit ${bit} swing is 2^${2 ** (bit - 10)}`);
  }
  assert(k.exponentFlipFactor(10, true) === 2 && k.exponentFlipFactor(14, true) === 65536 && k.exponentFlipFactor(14, false) === 1 / 65536, 'Factor endpoints');
  // Bit 14 of 0.0625 gives 4096; of 1.0 gives the Inf pattern; of 0.02 gives x65536.
  assert(k.flipEffect(0x2c00, 14).after === 4096, 'Bit-14 flip of 0.0625 is 4096');
  assert(k.flipEffect(0x3c00, 14).kind === 'inf-pattern' && k.flipEffect(0x3c00, 14).after === Infinity, 'Bit-14 flip of 1.0 is the Inf pattern');
  assert(k.bit14Effect(0.02).ratio === 65536, 'Bit-14 flip of a small weight is x2^16');
  assert(k.bit14Effect(4).ratio === 1 / 65536, 'Bit-14 flip of a weight of 4 goes down by 2^16');
  // Mantissa and sign.
  assert(Math.abs(k.flipEffect(0x3c00, 9).ratio - 1.5) < 1e-12, 'Mantissa bit 9 changes magnitude by at most a factor of 2');
  for (const b of [0x3c00, 0x2c00, 0x1234, 0x5555, 0xabcd]) {
    for (let bit = 0; bit < 16; bit++) {
      const m = k.flipEffect(b, bit);
      const mant = bit < 10 && ((b >> 10) & 0x1f) !== 0 && ((b >> 10) & 0x1f) !== 0x1f;
      if (mant) assert(m.after / m.before <= 2 && m.after / m.before >= 0.5, 'Mantissa flips stay within a factor of 2');
    }
  }
  assert(k.flipEffect(0x3c00, 15).after === -1, 'Sign flip negates');
  // Bit-exact round trip, mirroring the paper's XOR check.
  for (let b = 0; b < 0x10000; b += 7) for (let bit = 0; bit < 16; bit++) {
    assert(k.flipBit(k.flipBit(b, bit), bit) === b, 'flip(flip(x)) is the identity');
  }
  // Probabilities.
  near(k.P_BIT_CLASS.sign, 1 / 16, 1e-15, 'P(sign)');
  near(k.P_BIT_CLASS.exponent, 0.3125, 1e-15, 'P(exponent) is 31.25 %');
  near(k.P_BIT_CLASS.mantissa, 10 / 16, 1e-15, 'P(mantissa)');
  near(k.pAtLeastOneBit14(40), 0.9243, 5e-5, 'P(>=1 bit-14 flip in 40)');
  near(k.pAtLeastOneExponent(40), 1 - (11 / 16) ** 40, 1e-15, 'P(>=1 exponent flip in 40)');
  assert(k.pAtLeastOneBit14(0) === 0, 'No flips, no bit-14 flip');
}

/* 3. Scaling --------------------------------------------------------- */
{
  const NL = 8.03e9;
  const NS = 3.086e9;
  const base = { bytesPerParam: 2, upsetRateFlipsPerGbMonth: 1, eccEnabled: 0, mbuFraction: 0 };
  for (const alpha of [0, 0.16, 0.29, 0.32, 0.35, 0.51, 1, 1.2]) {
    const ratio = k.t50Days(NL, { ...base, toleranceExponent: alpha }) / k.t50Days(NS, { ...base, toleranceExponent: alpha });
    rel(ratio, (NL / NS) ** (alpha - 1), 1e-12, `t50 ratio at alpha = ${alpha}`);
  }
  near(k.t50Days(NL, { ...base, toleranceExponent: 1 }) / k.t50Days(NS, { ...base, toleranceExponent: 1 }), 1, 1e-12, 'alpha = 1 gives ratio 1.000');
  near((NL / NS) ** (0.29 - 1), 0.51, 0.005, 'alpha 0.29 gives about 0.51');
  near((NL / NS) ** (0.35 - 1), 0.54, 0.005, 'alpha 0.35 gives about 0.54');
  // Derived alpha from the two measured models.
  const d = k.ALPHA_DERIVATION;
  near(d.paramRatio, 2.602, 5e-4, 'Parameter ratio');
  near(d.batchMatchedRatios[0], 1.32, 0.005, 'Batch-matched ratio, replication');
  near(d.batchMatchedRatios[1], 1.40, 0.005, 'Batch-matched ratio, original');
  near(d.batchMatchedAlpha[0], 0.29, 0.005, 'alpha lower, batch matched');
  near(d.batchMatchedAlpha[1], 0.35, 0.005, 'alpha upper, batch matched');
  near(d.twoPointAlpha, 0.32, 0.005, 'Two-point alpha');
  // The paper rounds the cross-batch ratios from rounded flips (1.16 to 1.63); unrounded they are 1.14 to 1.62.
  near(d.crossBatchRatios[0], 1.14, 0.005, 'Cross-batch ratio, low (unrounded)');
  near(d.crossBatchRatios[1], 1.62, 0.005, 'Cross-batch ratio, high (unrounded)');
  assert(d.crossBatchRatios[0] > 1.13 && d.crossBatchRatios[1] < 1.64, 'Cross-batch extremes consistent with the paper to rounding');
  // The anchor reproduces itself, and scales as designed.
  near(k.n50Flips(MODELS.A.params, 0.32), k.N50_REF, 1e-12, 'N50 at the reference size is the anchor');
  rel(k.n50Flips(2 * MODELS.A.params, 0.5), k.N50_REF * Math.SQRT2, 1e-12, 'Doubling params at alpha 0.5');
  // Curve collapse: at the reference size the curve is the Model A mean curve.
  near(k.survivalAt(30, MODELS.A.params, 0.32, true).survival, 0.72, 1e-12, 'S_ref(30) is the mean of 76 % and 68 %');
  near(k.survivalAt(40, MODELS.A.params, 0.32, true).survival, 0.46, 1e-12, 'S_ref(40) is the mean of 56 % and 36 %');
  near(k.survivalAt(0, MODELS.A.params, 0.32, true).survival, 1, 1e-12, 'Clean at zero when assumed');
  assert(k.survivalAt(10, MODELS.A.params, 0.32, true).region === 'interpolated-low', 'Below 20 flips is flagged interpolated, not measured');
  assert(k.survivalAt(10, MODELS.A.params, 0.32, false).region === 'unmeasured-low', 'Below 20 flips without the assumption is flagged unmeasured');
  assert(k.survivalAt(100, MODELS.A.params, 0.32, true).region === 'unmeasured-high', 'Above 80 flips is flagged unmeasured');
  assert(k.survivalAt(50, MODELS.A.params, 0.32, true).region === 'measured', 'Inside 20 to 80 flips is measured');
  // The residual against Model B is exposed and small at the two-point alpha, large at alpha = 0 and 1.
  const resid = k.collapseResidualsAgainstModelB(0.32);
  assert(resid.length === 7, 'One residual per Model B dose');
  assert(k.collapseRmse(0.32) < k.collapseRmse(0) && k.collapseRmse(0.32) < k.collapseRmse(1), 'The two-point exponent fits Model B better than 0 or 1');
}

/* 4. Poisson --------------------------------------------------------- */
{
  for (const lambda of [0, 0.01, 1, 40, 500, 1e4, 1e5]) {
    near(k.poissonExpect(lambda, () => 1), 1, 1e-9, `Poisson normalises at lambda = ${lambda}`);
  }
  near(k.poissonExpect(40, (n) => n), 40, 1e-8, 'Poisson mean');
  near(k.poissonExpect(40, (n) => (n - 40) ** 2), 40, 1e-6, 'Poisson variance');
  // Degenerate lambda reduces to S(n).
  const S = (n: number) => k.survivalAt(n, MODELS.A.params, 0.32, true).survival;
  near(k.poissonExpect(0, S), S(0), 1e-15, 'lambda = 0 gives S(0)');
  near(k.poissonExpectSaturating(1e-12, S, 200, S(201)), 1, 1e-9, 'Tiny lambda gives clean survival');
  // Saturating form agrees with the plain sum.
  const sat = k.poissonExpectSaturating(60, S, 120, S(121));
  near(sat, k.poissonExpect(60, S), 1e-9, 'Saturating Poisson sum agrees with the plain sum');
  // Stable at large lambda: all mass is beyond the measured range, so survival is the held value.
  const big = llmBitflipResilience.run({ upsetRateFlipsPerGbMonth: 1e6, scrubIntervalDays: 3650 });
  assert(Number.isFinite(big.values.expectedSurvival), 'Expected survival is finite at very large lambda');
  near(big.values.expectedSurvival, k.survivalRef(1e9, true).survival, 1e-9, 'Large lambda gives the held tail value');
  assert(big.values.unmeasuredMass > 0.999, 'Nearly all mass is beyond the measured range at very large lambda');
  assert(big.diagnostics.some((d) => /beyond the measured dose range/.test(d.message)), 'Unmeasured mass raises a warning');
  // Expected survival falls as the scrub interval grows.
  const e1 = llmBitflipResilience.run({ scrubIntervalDays: 10 }).values.expectedSurvival;
  const e2 = llmBitflipResilience.run({ scrubIntervalDays: 100 }).values.expectedSurvival;
  assert(e2 < e1 && e1 < 1, 'Longer intervals give lower expected survival');
}

/* 5. SECDED ---------------------------------------------------------- */
{
  const W = k.secdedWords(16.06e9);
  rel(W, 2.0075e9, 1e-12, 'Words in Model A at 16.06 GB');
  near(k.flipsBeforeOneDoubleHit(W), 63400, 50, 'About 63 400 flips before one expected double hit');
  rel(k.expectedDoubleHits(40, W), 1600 / (2 * W), 1e-15, 'Double hits at 40 flips');
  // 1600 / 4.015e9 = 3.985e-7, which the brief rounds to about 3.9e-7 (truncated); it is 4.0e-7 to two figures.
  near(k.expectedDoubleHits(40, W), 3.985e-7, 5e-10, 'Double hits at N = 40 is about 4.0e-7');
  assert(k.expectedDoubleHits(40, W) < 4.1e-7 && k.expectedDoubleHits(40, W) > 3.8e-7, 'Order of magnitude of 4e-7');
  near(k.uncorrectableEvents(100, W, 0), 100 * 100 / (2 * W), 1e-15, 'm = 0 leaves only double hits');
  near(k.uncorrectableEvents(100, W, 0.1), 10 + 100 * 100 / (2 * W), 1e-12, 'm = 0.1 adds m x lambda');
  near(k.effectiveFlipsEcc(100, W, 0.1), 2 * k.uncorrectableEvents(100, W, 0.1), 1e-15, 'n_eff = 2U');
  for (const m of [0, 0.001, 0.05]) {
    const lam = k.rawFlipsToReachEffective(40, W, m);
    near(k.effectiveFlipsEcc(lam, W, m), 40, 1e-6, `Root of n_eff = 40 at m = ${m}`);
  }
  // With ECC the survival time is far longer when m = 0, and the extra power is 12.5 % of memory power.
  const off = llmBitflipResilience.run({});
  const on = llmBitflipResilience.run({ eccEnabled: 1 });
  assert(on.values.t50Days > 1000 * off.values.t50Days, 'SECDED with m = 0 lengthens t50 by orders of magnitude');
  near(on.values.eccExtraPowerW, 0.125 * on.values.memoryPowerW, 1e-12, 'ECC extra power is 12.5 %');
  assert(off.values.eccExtraPowerW === 0, 'No extra power without ECC');
  near(on.values.storageWithEccGb, 1.125 * on.values.memoryFootprintGb, 1e-12, 'Storage x 1.125 with ECC');
  assert(on.diagnostics.some((d) => /analytic extension/.test(d.message)), 'ECC raises the not-measured warning');
  // A large multi-bit fraction erodes the benefit.
  const mbu = llmBitflipResilience.run({ eccEnabled: 1, mbuFraction: 0.5 });
  assert(mbu.values.t50Days < on.values.t50Days / 100, 'Multi-bit upsets erode the SECDED benefit');
}

/* 6. Canary Bayes ---------------------------------------------------- */
{
  near(k.canaryPosterior(0.3, 0.17, 0.94), 0.072, 5e-4, 's = 0.30, 17 % / 94 %');
  near(k.canaryPosterior(0.3, 0.24, 0.82), 0.111, 5e-4, 's = 0.30, 24 % / 82 %');
  near(k.canaryPosterior(0.5, 0.17, 0.94), 0.153, 5e-4, 's = 0.50, 17 % / 94 %');
  near(k.canaryPosterior(0.5, 0.24, 0.82), 0.226, 5e-4, 's = 0.50, 24 % / 82 %');
  assert(k.canaryPosterior(0.3, 0.2, 0.9) > 0.3 * 0 && k.canaryPosterior(0.3, 0.2, 0.9) < 0.3, 'A pass lowers the odds of collapse but does not remove them');
  near(k.CANARY.sensitivityPct[0], 76, 1e-9, 'Sensitivity lower end 76 %');
  near(k.CANARY.sensitivityPct[1], 83, 1e-9, 'Sensitivity upper end 83 %');
}

/* 7. Semantic Collapse band and outcomes loader --------------------- */
{
  const lo = k.semanticCollapseSurvivorShareBand(20);
  assert(lo.low === 0.12 && lo.high === 0.35 && lo.basis === 'lowest-two-doses', 'Lowest two doses: 12 to 35 %');
  const hi = k.semanticCollapseSurvivorShareBand(80);
  assert(hi.low === 0.35 && hi.high === 0.67 && hi.basis === 'highest-two-doses', 'Highest two doses: 35 to 67 %');
  const mid = k.semanticCollapseSurvivorShareBand(45);
  assert(mid.basis === 'envelope' && mid.low === 0.12 && mid.high === 0.67, 'Between them only the envelope is claimed');
  // Parser fixture, not data: one synthetic row used only to exercise the parser.
  const rows = k.parseOutcomesCsv('model,batch,flips,n,intact,impaired,semantic_collapse,dead\nX,y,20,4,1,1,1,1\n');
  assert(rows.length === 1 && rows[0].n === 4, 'outcomes.csv parser reads a row');
  let threw = false;
  try { k.parseOutcomesCsv('model,batch,flips,n,intact,impaired,semantic_collapse,dead\nX,y,20,4,1,1,1,2\n'); } catch { threw = true; }
  assert(threw, 'outcomes.csv rows whose counts do not sum to n are rejected');
}


/* 7b. Outcome split (author-supplied; paper Figure 6) --------------- */
{
  const csvPath = fileURLToPath(new URL('./data/outcome_split_summary.csv', import.meta.url));
  const parsed = k.parseOutcomesCsv(readFileSync(csvPath, 'utf8'));
  assert(parsed.length === 26 && OUTCOMES.length === 26, 'Outcome CSV has 26 rows and the typed copy matches');
  const idOf = (name: string) => (name.includes('Llama') ? 'A' : 'B');
  const batchOf = (b: string) => (b === 'Original' ? 'original' : 'replication');
  parsed.forEach((r, i) => {
    const o = OUTCOMES[i];
    assert(o.model === idOf(r.model) && o.batch === batchOf(r.batch) && o.flips === r.flips && o.n === r.n && o.intact === r.intact && o.impaired === r.impaired && o.semanticCollapse === r.semanticCollapse && o.dead === r.dead, `Outcome row ${i + 1} matches the CSV`);
  });
  // Dead counts agree with the paper's survival tables (survival = accuracy > 0).
  for (const o of OUTCOMES) {
    const sweep = SWEEPS.find((x) => x.model === o.model && x.batch === o.batch)!;
    const row = sweep.rows.find((x) => x.flips === o.flips);
    assert(row !== undefined, `Outcome dose ${o.flips} exists in the survival table`);
    near(((o.n - o.dead) / o.n) * 100, row!.survivalPct, 1e-9, `Survivors match Tables 4 to 7 (${o.model} ${o.batch} ${o.flips})`);
  }
  // Paper Section 7.1: Semantic Collapse is 11 to 17 % of trials in every batch.
  for (const m of ['A', 'B'] as const) for (const b of ['original', 'replication'] as const) {
    const share = k.scShareOfTrialsInBatch(m, b) * 100;
    assert(share >= 10.5 && share <= 17.5, `Semantic Collapse share of trials in ${m} ${b} is about 11 to 17 % (got ${share.toFixed(1)})`);
  }
  // Paper abstract: 21 % to 43 % of survivors for the larger model (original batch).
  const orig = k.scSurvivorShareLowHigh('A', 'original');
  near(orig.low, 0.21, 0.005, 'Semantic Collapse share of survivors, lowest two doses, original batch');
  near(orig.high, 0.43, 0.005, 'Semantic Collapse share of survivors, highest two doses, original batch');
  for (const m of ['A', 'B'] as const) for (const b of ['both', 'original', 'replication'] as const) {
    const q = k.scSurvivorShareLowHigh(m, b);
    assert(q.high > q.low, `Semantic Collapse share of survivors grows with dose (${m} ${b})`);
    assert(q.low >= 0.115 && q.low <= 0.355 && q.high >= 0.345 && q.high <= 0.675, `Share of survivors sits in the paper ranges 12-35 % to 35-67 % (${m} ${b})`);
  }
  assert(k.outcomeSplit('A', 'both').length === 6 && k.outcomeSplit('B', 'both').length === 7, 'Dose counts per model');
  assert(k.outcomeSplit('A', 'both')[0].n === 50, 'Pooled batches have n = 50 per dose');
  assert(k.nearestMeasuredModel(8.03e9) === 'A' && k.nearestMeasuredModel(3.086e9) === 'B' && k.nearestMeasuredModel(4e9) === 'B' && k.nearestMeasuredModel(6e9) === 'A', 'Nearest measured model follows size');
  assert(k.nearestMeasuredDose('A', 70) === 60 || k.nearestMeasuredDose('A', 70) === 80, 'Nearest measured dose for a dose that was not run');
  assert(k.outcomeSplit('B', 'both').every((d) => d.intact + d.impaired + d.semanticCollapse + d.dead === d.n), 'Categories sum to n');
}

/* 7c. Bit 14 by weight magnitude (corrected wording) ---------------- */
{
  for (const [w, c] of [[0.02, 'times-2^16'], [0.5, 'times-2^16'], [0.99, 'times-2^16'], [1, 'inf-nan-pattern'], [1.5, 'inf-nan-pattern'], [1.99, 'inf-nan-pattern'], [2, 'divides-by-2^16'], [3, 'divides-by-2^16'], [4, 'divides-by-2^16'], [100, 'divides-by-2^16']] as const) {
    assert(k.bit14Case(w) === c, `bit14Case(${w}) is ${c}`);
    const e = k.bit14Effect(w);
    if (c === 'times-2^16') assert(e.ratio === 65536 && e.kind === 'finite', `Bit-14 flip at |w| = ${w} multiplies by 2^16`);
    else if (c === 'divides-by-2^16' && w < 4) assert(e.ratio < 1 / 30000 && e.after < 1e-3, `Bit-14 flip at |w| = ${w} falls into the subnormal range, about 2^-16 of the weight or less`);
    else if (c === 'divides-by-2^16') assert(e.ratio === 1 / 65536, `Bit-14 flip at |w| = ${w} divides by 2^16`);
    else assert(e.kind !== 'finite' && !Number.isFinite(e.after), `Bit-14 flip at |w| = ${w} lands on an Inf/NaN pattern`);
  }
  assert(k.bit14Effect(1).kind === 'inf-pattern' && k.bit14Effect(1.5).kind === 'nan-pattern', 'Exactly 1.0 gives Inf; other weights in [1, 2) give NaN');
}

/* 8. Contract -------------------------------------------------------- */
{
  const { diagnostics: defDiag } = resolveInputs(llmBitflipResilience.descriptor.inputs, {});
  assert(defDiag.length === 0, 'Defaults trigger no clamping diagnostics');
  for (const spec of INPUT_SPECS) {
    assert(spec.min !== undefined && spec.max !== undefined, `${spec.key} declares bounds`);
    assert(spec.defaultValue >= spec.min! && spec.defaultValue <= spec.max!, `${spec.key} default is inside its range`);
    assert(spec.description.length > 20, `${spec.key} has a description`);
  }
  const clamped = llmBitflipResilience.run({ modelParamsBillions: 1e9, toleranceExponent: -3 });
  assert(clamped.diagnostics.some((d) => d.key === 'modelParamsBillions' && d.severity === 'warning'), 'Clamping reports a diagnostic');
  assert(clamped.resolvedInputs.modelParamsBillions === 1000 && clamped.resolvedInputs.toleranceExponent === 0, 'Clamped values are recorded');
  const unknown = llmBitflipResilience.run({ nonsense: 1 });
  assert(unknown.diagnostics.some((d) => d.key === 'nonsense'), 'Unknown keys are warned');
  const nan = llmBitflipResilience.run({ upsetRateFlipsPerGbMonth: Number.NaN });
  assert(nan.diagnostics.some((d) => d.severity === 'error'), 'Non-finite input is an error diagnostic');
  const res = llmBitflipResilience.run({});
  for (const o of OUTPUT_SPECS) assert(typeof res.values[o.key as keyof typeof res.values] === 'number', `Output ${o.key} is produced`);
  assert(Object.keys(res.values).length === OUTPUT_SPECS.length, 'No undeclared outputs');
  assert(llmBitflipResilience.descriptor.assumptions.length >= 10, 'Assumptions are declared');
  for (const must of [/single-bit/i, /No physical flux/i, /Uniform layer sampling/i, /Persistent corruption/i, /FP16 weights only/i, /Instruction-tuned/i, /greedy/i, /one software and hardware stack/i, /25 trials/i, /weakly identified/i, /Curve collapse/i, /accuracy at or below 40 %/i, /accuracy greater than zero/i]) {
    assert(llmBitflipResilience.descriptor.assumptions.some((a) => must.test(a)), `Assumption present: ${must}`);
  }
  // Extrapolation warnings fire outside the measured range.
  assert(llmBitflipResilience.run({ modelParamsBillions: 70 }).diagnostics.some((d) => /Extrapolation/.test(d.message)), 'Size extrapolation warns');
  assert(!llmBitflipResilience.run({ modelParamsBillions: 5 }).diagnostics.some((d) => /Extrapolation/.test(d.message)), 'Interpolation between the two sizes does not warn');
  assert(llmBitflipResilience.run({ injectedFlips: 200 }).diagnostics.some((d) => /measured dose range/.test(d.message)), 'Dose above 80 flips warns');
  assert(llmBitflipResilience.run({ injectedFlips: 5 }).diagnostics.some((d) => /measured dose range/.test(d.message)), 'Dose below 20 flips warns');
  assert(llmBitflipResilience.run({ upsetRateFlipsPerGbMonth: 500 }).diagnostics.some((d) => /unvalidated/.test(d.message)), 'Rate above the illustrative range is labelled unvalidated');
  assert(llmBitflipResilience.run({ bytesPerParam: 1 }).diagnostics.some((d) => /not measured for this precision/.test(d.message)), 'Non-FP16 precision warns');
  assert(llmBitflipResilience.run({ bytesPerParam: 1 }).diagnostics.every((d) => d.severity !== 'error'), 'Non-FP16 precision is a warning, not an error');
  assert(llmBitflipResilience.run({ toleranceExponent: 1 }).diagnostics.some((d) => /hypothesis, not a fit/.test(d.message)), 'Alpha outside the data-implied band is flagged');
  // Defaults produce no warnings.
  assert(res.diagnostics.length === 0, 'Default run raises no diagnostics');
  // Adapter rounds only.
  const view = compute({});
  assert(view.outputs.n50Flips.unit === 'flips', 'Adapter labels units');
  assert(manifest.parameters.length === INPUT_SPECS.length && manifest.id === 'llm-bitflip-resilience', 'Manifest mirrors the declared inputs');
  // Run record round trip.
  const rec = createRunRecord({ upsetRateFlipsPerGbMonth: 2 }, new Date('2026-10-29T00:00:00Z'));
  verifyRunRecord(rec);
}

/* 9. Composition with the thermal module ----------------------------- */
{
  const memOut = llmBitflipResilience.descriptor.outputs.find((o) => o.key === 'memoryPowerW')!;
  const eccOut = llmBitflipResilience.descriptor.outputs.find((o) => o.key === 'eccExtraPowerW')!;
  assert(memOut.kind === 'quantity' && eccOut.kind === 'quantity' && memOut.unit === 'W' && eccOut.unit === 'W', 'Power outputs are quantities in W');
  const parasitic = orbitalThermalLimits.descriptor.inputs.find((p) => p.key === 'parasiticHeatW')!;
  const compute_ = orbitalThermalLimits.descriptor.inputs.find((p) => p.key === 'computeWattsRequested')!;
  assert(canConnect(memOut, parasitic).ok, 'memoryPowerW connects to parasiticHeatW');
  assert(canConnect(eccOut, parasitic).ok, 'eccExtraPowerW connects to parasiticHeatW');
  assert(canConnect(memOut, compute_).ok, 'memoryPowerW connects to computeWattsRequested');
  const run = llmBitflipResilience.run({ eccEnabled: 1 });
  const thermal = orbitalThermalLimits.run({ parasiticHeatW: run.values.memoryPowerW + run.values.eccExtraPowerW });
  assert(thermal.resolvedInputs.parasiticHeatW === run.values.memoryPowerW + run.values.eccExtraPowerW, 'Thermal module adopts the memory heat');
}

/* 10. Golden vectors ------------------------------------------------- */
{
  const gvPath = fileURLToPath(new URL('../../../data/golden-vectors/llm-bitflip-resilience.json', import.meta.url));
  const doc = JSON.parse(readFileSync(gvPath, 'utf8')) as {
    vectors: Array<{ id: string; inputs: Record<string, number>; expect: Record<string, number>; note?: string }>;
  };
  const relTol = 1e-9;
  for (const v of doc.vectors) {
    const actual = llmBitflipResilience.run(v.inputs).values as unknown as Record<string, number>;
    for (const [key, expected] of Object.entries(v.expect)) {
      const got = actual[key];
      assert(typeof got === 'number', `Golden vector ${v.id}: missing output ${key}`);
      const d = Math.abs(got - expected) / Math.max(Math.abs(expected), 1e-12);
      assert(d < relTol, `Golden vector ${v.id}: ${key} expected ${expected}, got ${got} (${v.note ?? ''})`);
    }
  }
  console.log(`${doc.vectors.length} llm-bitflip-resilience golden vectors passed.`);
}

/* 11. Hygiene: no banned names, no Float16Array, no physics in React -- */
{
  const root = fileURLToPath(new URL('.', import.meta.url));
  const banned = ['Air' + 'bus', 'EA' + 'SA', 'Jet' + 'Blue', 'EL' + 'AC', 'A3' + '20', 'Star' + 'cloud', 'Space' + 'X', 'Star' + 'mind', 'Goo' + 'gle', 'Sun' + 'catcher', 'NVI' + 'DIA'];
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx|css|md|json)$/.test(name)) files.push(p);
    }
  };
  walk(root);
  assert(files.length > 5, 'Module files were found for the hygiene scan');
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    for (const word of banned) assert(!text.includes(word), `Banned name "${word}" found in ${f}`);
    if (!f.endsWith('model.test.ts')) assert(!/Float16Array/.test(text), `Float16Array used in ${f}`);
    if (f.includes('/visualizer/') && f.endsWith('.tsx')) {
      assert(!/Math\.(pow|exp|log|sqrt)\(/.test(text), `Physics-like maths in React component ${f}`);
    }
  }
}

console.log('All llm-bitflip-resilience model, contract, composition and golden-vector assertions completed.');
