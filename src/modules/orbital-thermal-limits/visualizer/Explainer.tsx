import { useEffect, useMemo, useRef } from 'react';
import katex from 'katex';
import { formatWatts } from './format';
import { chapterExamples } from './chapterData';
import 'katex/dist/katex.min.css';
import './Explainer.css';

function Equation({ latex }: { latex: string }) {
  const elementRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (elementRef.current) katex.render(latex, elementRef.current, { throwOnError: false, displayMode: true });
  }, [latex]);
  return <div className="chapter-equation" ref={elementRef} />;
}

export function Explainer() {
  const { worked, fluxes, coolantSpecificHeat } = useMemo(() => chapterExamples(), []);
  const v = worked.values;
  const i = worked.resolvedInputs;
  const powerCeiling = v.generatedPowerW - i.parasiticHeatW;
  const thermalCeiling = Math.max(0, Math.min(v.netRadiatorCapacityW, v.transportCapacityW));

  return (
    <article className="module-chapter">
      <a className="chapter-skip-link" href="#module-tool">Skip to tool</a>
      <h2>The question: can you run AI compute on a satellite?</h2>
      <p>
        Putting GPUs in orbit for AI compute gets suggested fairly regularly, usually on the grounds that solar power is
        unlimited up there and that cooling is free in a vacuum. Neither is quite true. A solar array generates only as
        much electricity as its area, efficiency and Sun-pointing allow, and getting rid of waste heat in a vacuum means
        radiating it away, which is slower and more area-hungry than the air or water cooling used on the ground. Real
        spacecraft loops use synthetic dielectric fluids rather than water, both because water would freeze at radiator
        temperatures in eclipse and because it would be an electrical hazard near dense electronics if a line leaked.
        This tool is a back-of-the-envelope calculator and 3D visualisation for testing whether a combination of compute,
        radiator, solar array and orbit is sustainable.
      </p>

      <h3>Two budgets: thermal and electrical</h3>
      <p>
        The thermal budget asks whether the radiator can reject the compute waste heat and whether the coolant loop can
        carry that heat to the radiator. The electrical budget asks whether orbit-average solar generation can supply
        continuous compute and the parasitic bus load. Either budget can be the first limit.
      </p>
      <details className="chapter-working">
        <summary>Show the working</summary>
        <p>The radiator temperature is converted to kelvin before applying radiative exchange. Its field of view is split between deep space and Earth:</p>
        <Equation latex={'T_r=T_{operating,°C}+273.15\\;\\mathrm{K}'} />
        <Equation latex={'P_{rad}=\\max\\!\\left(0,\\epsilon\\sigma A\\left[(1-F_E)(T_r^4-T_s^4)+F_E(T_r^4-T_E^4)\\right]\\right)'} />
        <p>Direct sunlight and Earth-reflected sunlight are absorbed separately. The model uses projected radiator area equal to area times Sun incidence.</p>
        <Equation latex={'A_{projected}=A\\,f_{sun\\,incidence}'} />
        <Equation latex={'P_{solar}=\\alpha\\,S\\,A_{projected}'} />
        <Equation latex={'P_{albedo}=\\alpha\\,S\\,a_E\\,A_{projected}\\,F_E'} />
        <Equation latex={'P_{Earth\\,IR}=\\epsilon\\sigma A F_E T_E^4'} />
        <p>Here α is solar absorptivity, S is solar flux, aₑ is Earth albedo and Fₑ is Earth view factor. Earth infrared is already represented in the Earth-background term of radiative exchange; it is reported for diagnosis, not subtracted a second time.</p>
        <Equation latex={'P_{external}=P_{solar}+P_{albedo},\\qquad R=P_{rad}-P_{external}-P_{parasitic}'} />
        <p>Array generation is averaged over the orbit. The model supplies the sunlit fraction from orbital geometry, so it does not need to be hand-calculated.</p>
        <Equation latex={'P_{array,instant}=S\\,A_{array}\\,\\eta\\,f_{pointing}'} />
        <Equation latex={'P_{array,average}=P_{array,instant}\\,f_{sunlit}'} />
        <Equation latex={'P_{generated}=\\begin{cases}P_{override},&P_{override}>0\\\\P_{array,average},&\\text{otherwise}\\end{cases}'} />
        <Equation latex={'D_{thermal}=P_{compute,requested}-\\max(0,\\min(R,C))'} />
        <Equation latex={'D_{power}=P_{compute,requested}+P_{parasitic}-P_{generated}'} />
        <Equation latex={'U_{thermal}=P_{compute,requested}/P_{thermal,available},\\quad U_{power}=(P_{compute,requested}+P_{parasitic})/P_{generated},\\quad U=\\max(U_{thermal},U_{power})'} />
        <Equation latex={'q_{radiator}=P_{rad}/\\max(A,10^{-6}\\;\\mathrm{m^2})\\quad[\\mathrm{W/m^2}]'} />
      </details>

      <h3>The three ceilings</h3>
      <p>Use the same names on the spec card and in the challenge: R, C and E are all available compute ceilings, in watts.</p>
      <div className="chapter-ceiling-grid">
        <section><h4>Radiator ceiling R</h4><Equation latex={'R=P_{rad}-P_{solar}-P_{albedo}-P_{parasitic}\\quad[\\mathrm{W}]'} /><p>Net radiator capacity after the absorbed external and parasitic loads.</p></section>
        <section><h4>Coolant ceiling C</h4><Equation latex={`C=\\dot m\\,c_p\\,\\Delta T\\quad[\\mathrm{W}],\\qquad c_p=${coolantSpecificHeat.toLocaleString('en-GB')}\\;\\mathrm{J\\,kg^{-1}\\,K^{-1}}`} /><p>The model's coolant specific heat in this run is {coolantSpecificHeat.toLocaleString('en-GB')} J/kg·K, derived from the kernel's transport capacity.</p></section>
        <section><h4>Power ceiling E</h4><Equation latex={'E=P_{generated}-P_{parasitic}\\quad[\\mathrm{W}]'} /><p>Orbit-average array power left for continuous compute after parasitic load.</p></section>
      </div>
      <p><strong>The lowest of R, C and E is what you hit first as compute demand rises.</strong> The sunlit fraction comes from the orbit geometry and is given by the model.</p>
      <p>Thermal utilisation is requested compute divided by the available thermal ceiling; electrical utilisation is compute plus parasitic load divided by generated array power. The model reports the worse of those two. Status is Safe through 60%, Margin above 60% through 85%, Limit above 85% while both budgets hold, and Overheating if a budget is exceeded or no thermal capacity is available.</p>

      <details className="chapter-working">
        <summary>Show the working: a run from the challenge</summary>
        <p>The example uses the Thin pipe configuration. Values below are calculated from the kernel when this chapter renders.</p>
        <dl className="chapter-example-values">
          <div><dt>Requested compute</dt><dd>{formatWatts(i.computeWattsRequested)}</dd></div>
          <div><dt>Radiator ceiling R</dt><dd>{formatWatts(v.netRadiatorCapacityW)}</dd></div>
          <div><dt>Coolant ceiling C</dt><dd>{formatWatts(v.transportCapacityW)}</dd></div>
          <div><dt>Power ceiling E</dt><dd>{formatWatts(powerCeiling)}</dd></div>
          <div><dt>Thermal ceiling</dt><dd>{formatWatts(thermalCeiling)}</dd></div>
          <div><dt>Orbit sunlit fraction</dt><dd>{(v.orbitSunlitFraction * 100).toFixed(1)}%</dd></div>
          <div><dt>Model status</dt><dd>{worked.status}</dd></div>
        </dl>
        <p>Since C is the smallest ceiling, coolant transport is the first limit in this configuration.</p>
      </details>

      <details className="chapter-working">
        <summary>Show the working: radiator flux at selected temperatures</summary>
        <p>These flux values come from separate kernel runs using the same radiator and environment, changing only operating temperature.</p>
        <table className="chapter-flux-table">
          <thead><tr><th>Operating temperature</th><th>Gross radiator flux</th></tr></thead>
          <tbody>{fluxes.map(({ operatingTempC, radiatorFluxWm2 }) => (
            <tr key={operatingTempC}><td>{operatingTempC} °C</td><td>{radiatorFluxWm2.toLocaleString('en-GB', { maximumFractionDigits: 1 })} W/m²</td></tr>
          ))}</tbody>
        </table>
      </details>

      <h3>How to use the tool</h3>
      <p>
        In Explore, adjust compute demand, radiator, coolant loop, array and orbit, then compare the telemetry. In
        Challenge, read the spec card, estimate R, C and E, and choose the lowest before seeing the result. Open the
        working or request hints when you want to check the arithmetic.
      </p>

      <h3>What this does not capture</h3>
      <p>
        This is a steady-state snapshot rather than a simulation over time. There is no thermal mass and no battery state
        of charge, so it cannot show temperature transients or guarantee uninterrupted operation through eclipse. The
        power budget is averaged over a full orbit, but it does not track a battery being drawn down and recharged through
        a pass. The Earth view factor and Sun-relative geometry are simplified, and the results are best treated as a
        reasonable first-order estimate for exploring trade-offs rather than as something to build hardware against.
      </p>
    </article>
  );
}
