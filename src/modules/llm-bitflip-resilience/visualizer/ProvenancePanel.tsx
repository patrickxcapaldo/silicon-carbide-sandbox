import { MODELS, SWEEPS, TABLE_3, NOT_USED } from '../data/radiai-measured';
import { OUTCOME_CSV_MODEL_NAMES } from '../data/outcomes';
import { DESCRIPTOR } from '../sandbox/module';

/** View 7: provenance, sources and assumptions. Real checkpoint names appear only here. */
export function ProvenancePanel() {
  return (
    <div className="bfr-prov">
      <h4>Provenance of the measured data</h4>
      <p className="sci-note">Source: P. Capaldo and A. Brooker, “RadiAI: Characterising Stochastic Bit-Flip Resilience in Large Language Models for Aerospace Edge-Computing Applications”, IET Aerospace &amp; AI Technical Networks (preprint). Data are held in a private repository by the authors; the survival numbers are transcribed from the paper’s tables. The per-dose outcome counts (intact, impaired, Semantic Collapse, dead) were supplied by the author as outcome_split_summary.csv, because the paper prints them only as Figure 6. The Llama weights were loaded from a community mirror, not the original gated repository; bit-for-bit equivalence was not verified (paper Section 5.2).</p>
      <div className="bfr-table-wrap">
        <table>
          <thead><tr><th>Model</th><th>Name in the outcome CSV</th><th>Parameters</th><th>Precision</th><th>Clean accuracy (300 questions)</th><th>Paper tables</th></tr></thead>
          <tbody>
            {(['A', 'B'] as const).map((id) => (
              <tr key={id}>
                <td>{MODELS[id].checkpoint}</td><td>{OUTCOME_CSV_MODEL_NAMES[id]}</td><td>{MODELS[id].paramsBillions} B</td><td>{MODELS[id].precision}</td>
                <td>{MODELS[id].cleanAccuracyPct} % (± {MODELS[id].cleanAccuracyCiPct})</td>
                <td>{SWEEPS.filter((s) => s.model === id).map((s) => `Table ${s.table} (${s.batch})`).join(', ')}, Table 8, Table 3; outcome split (Figure 6)</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sci-note">Measured: FP16, greedy decoding, 100 questions per trial, n = 25 per dose level, two seed batches per model, 20 to 80 flips, one software and hardware stack. Table 3 absolute-flip crossings: about {TABLE_3.A.absoluteFlipsApprox[0]}–{TABLE_3.A.absoluteFlipsApprox[1]} (Model A) and {TABLE_3.B.absoluteFlipsApprox[0]}–{TABLE_3.B.absoluteFlipsApprox[1]} (Model B). Not used: {NOT_USED.join(' ')}</p>
      <h4>Other sources</h4>
      <ul className="sci-note">
        <li>Upset-rate range 0.01 to 10 flips/GB/month for commercial cruise altitude: quoted by the paper from JEDEC JESD89A (2006). Not independently verified here, and not a flux model.</li>
        <li>SECDED storage overhead of 12.5 % (8 check bits per 64 data bits): paper Section 2.3, citing JESD89A.</li>
        <li>Memory power default of 0.375 W/GB: a vendor rule of thumb of about 3 W per 8 GB for DDR3/DDR4 modules (Crucial/Micron support article “How Much Power Does Memory Use?”, content.crucial.com, accessed 29 October 2026). A placeholder; set it for your memory.</li>
      </ul>
      <h4>Declared assumptions</h4>
      <ol className="sci-note">{DESCRIPTOR.assumptions.map((a) => <li key={a}>{a}</li>)}</ol>
    </div>
  );
}
