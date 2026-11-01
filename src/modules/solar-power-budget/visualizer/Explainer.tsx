import { useMemo } from 'react';
import { CardGrid, Chapter, Equation, Working } from '../../../core/ui';
import { formatWatts, formatPercent } from './format';
import { chapterExamples } from './chapterData';

export function Explainer() {
  const { worked, losses, tempSweep, radSweep } = useMemo(() => chapterExamples(), []);
  const v = worked.values;
  const i = worked.resolvedInputs;

  return (
    <Chapter>
      <h2>The question: how much power does a space solar array actually deliver?</h2>
      <p>
        Solar irradiance above Earth’s atmosphere is intense and unattenuated by clouds or weather—roughly{' '}
        1,361 W/m² (Air Mass Zero, AM0). But turning that raw photon flux into continuous, dependable electrical
        power for orbital electronics is shaped by four inescapable physical realities:
      </p>
      <ul>
        <li><strong>Thermal bandgap drop:</strong> Solar cells heat up in direct sunlight (typically 50–90 °C in LEO), which reduces their open-circuit voltage and overall conversion efficiency.</li>
        <li><strong>Space radiation damage:</strong> Trapped protons and electrons in the Van Allen belts displace lattice atoms and darken coverglass over the mission lifespan.</li>
        <li><strong>Balance of system & pointing:</strong> Cell packing factor, coverglass transmission, blocking diodes, harness I²R losses, power conditioning electronics, and array sun-tracking cosine errors take steady cuts.</li>
        <li><strong>Earth shadow eclipse:</strong> Except in specialized dawn-dusk orbits, spacecraft spend roughly 30–40% of every low Earth orbit in total darkness, generating zero power.</li>
      </ul>
      <p>
        This module models these physical mechanisms to calculate the true orbit-averaged continuous electrical power available to
        the satellite bus, feeding directly into thermal limits or battery energy storage sizing.
      </p>

      <h3>From incident sunlight to continuous orbit-averaged power</h3>
      <p>
        A space solar array’s rated nameplate efficiency (Standard Test Conditions: 28 °C, AM0) is never what is delivered on orbit.
        The power calculation progresses through a chain of physical deratings:
      </p>
      <Working summary="Show the working">
        <p>1. Cell efficiency decreases linearly with operating temperature above standard test conditions (T₀ = 28 °C):</p>
        <Equation latex={'\\eta_{\\text{temp}} = \\eta_0 \\left[ 1 + \\gamma (T_{\\text{cell}} - 28\\;{^\\circ}\\mathrm{C}) \\right]'} />
        <p>where γ is the temperature coefficient (typically -0.20% to -0.30%/K for multi-junction GaAs cells).</p>

        <p>2. Radiation fluence across mission duration Δt causes cumulative exponential degradation:</p>
        <Equation latex={'\\eta_{\\text{EOL}} = \\eta_{\\text{temp}} \\,(1 - r_{\\text{deg}})^{\\Delta t}'} />

        <p>3. Delivered bus power while illuminated in direct sunlight accounts for balance of system (BOS) and sun tracking angle θ:</p>
        <Equation latex={'P_{\\text{sunlit}} = S \\cdot A_{\\text{array}} \\cdot \\eta_{\\text{EOL}} \\cdot \\eta_{\\text{bos}} \\cdot \\cos(\\theta)'} />

        <p>4. Continuous orbit-averaged power accounts for the orbital eclipse duty cycle (sunlit fraction f_sunlit):</p>
        <Equation latex={'P_{\\text{avg}} = P_{\\text{sunlit}} \\cdot f_{\\text{sunlit}}'} />

        <p>5. Total electrical energy generated per Keplerian orbital revolution sizes energy storage:</p>
        <Equation latex={'E_{\\text{orbit}} = P_{\\text{avg}} \\cdot T_{\\text{orbit}} = P_{\\text{sunlit}} \\cdot (f_{\\text{sunlit}} \\cdot T_{\\text{orbit}})'} />
      </Working>

      <h3>The three dominant power drains</h3>
      <p>
        Every orbital photovoltaic system experiences three major power deductions from its theoretical STC potential.
        Understanding which drain dominates dictates where engineering mass and budget should be spent:
      </p>
      <CardGrid>
        <section>
          <h4>Eclipse Shadow</h4>
          <Equation latex={'\\Delta P_{\\text{eclipse}} = P_{\\text{sunlit}} (1 - f_{\\text{sunlit}})'} />
          <p>Power lost due to the fraction of each orbit spent in Earth’s cylindrical shadow.</p>
        </section>
        <section>
          <h4>Thermal Derating</h4>
          <Equation latex={'\\Delta P_{\\text{thermal}} = P_{\\text{BOL}} |\\gamma| (T_{\\text{cell}} - 28\\;{^\\circ}\\mathrm{C})'} />
          <p>Loss of cell bandgap efficiency due to equilibrium array heating in full sunlight.</p>
        </section>
        <section>
          <h4>Radiation & Aging</h4>
          <Equation latex={'\\Delta P_{\\text{rad}} = P_{\\text{temp}} [1 - (1 - r_{\\text{deg}})^{\\Delta t}]'} />
          <p>Irreversible junction degradation from trapped Van Allen protons and cosmic rays.</p>
        </section>
      </CardGrid>

      <Working summary="Show the working: reference 5-year LEO mission">
        <p>
          Calculated dynamically from the physics kernel for a 5 m² array in a 500 km, 51.6° orbit at 65 °C after 5 years:
        </p>
        <dl className="sci-facts">
          <div><dt>BOL Peak Power (STC 28 °C)</dt><dd>{formatWatts(v.beginningOfLifePowerW)}</dd></div>
          <div><dt>Instantaneous Sunlit Power (EOL)</dt><dd>{formatWatts(v.instantaneousSunlitPowerW)}</dd></div>
          <div><dt>Orbit Average Power</dt><dd>{formatWatts(v.orbitAveragePowerW)}</dd></div>
          <div><dt>Orbit Sunlit Fraction</dt><dd>{(v.orbitSunlitFraction * 100).toFixed(1)}% ({v.orbitEclipseDurationMin.toFixed(1)} min eclipse)</dd></div>
          <div><dt>Thermal Loss</dt><dd>{formatWatts(losses.thermalLossW)} (-{formatPercent(1 - v.temperatureDerateFactor)})</dd></div>
          <div><dt>Radiation Loss</dt><dd>{formatWatts(losses.radiationLossW)} (-{formatPercent(1 - v.radiationDerateFactor)})</dd></div>
          <div><dt>Eclipse Loss</dt><dd>{formatWatts(losses.eclipseLossW)} (-{formatPercent(1 - v.orbitSunlitFraction)})</dd></div>
          <div><dt>Energy per Orbit</dt><dd>{Math.round(v.orbitEnergyGeneratedWh)} W·h</dd></div>
        </dl>
        <p>
          In this mission configuration, <strong>{losses.dominantLoss.toUpperCase()}</strong> is the dominant power drain.
        </p>
      </Working>

      <Working summary="Show the working: cell temperature sensitivity sweep">
        <p>
          Impact of operating temperature on cell efficiency and delivered sunlit power, holding all other reference inputs fixed:
        </p>
        <table className="sci-table">
          <thead>
            <tr>
              <th>Cell Temperature</th>
              <th>Temperature Factor</th>
              <th>Sunlit Power</th>
            </tr>
          </thead>
          <tbody>
            {tempSweep.map((row) => (
              <tr key={row.tempC}>
                <td>{row.tempC} °C</td>
                <td>{row.deratePct.toFixed(1)}%</td>
                <td>{formatWatts(row.sunlitPowerW)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Working>

      <Working summary="Show the working: multi-year radiation retention sweep">
        <p>
          Cumulative performance retention across mission duration at an annual degradation rate of {(i.annualDegradationRate * 100).toFixed(1)}%/yr:
        </p>
        <table className="sci-table">
          <thead>
            <tr>
              <th>Mission Lifetime</th>
              <th>Radiation Retention</th>
              <th>Sunlit Power</th>
            </tr>
          </thead>
          <tbody>
            {radSweep.map((row) => (
              <tr key={row.years}>
                <td>{row.years} years</td>
                <td>{row.retentionPct.toFixed(1)}%</td>
                <td>{formatWatts(row.sunlitPowerW)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Working>

      <h3>How to use the tool</h3>
      <p>
        In <strong>Explore</strong> mode, select scenario or orbit presets, adjust array aperture area, cell operating temperature,
        mission duration, and orbital elements to observe how power deratings cascade into delivered orbit-averaged power.
      </p>
      <p>
        In <strong>Challenge</strong> mode, inspect the mission spec card (orbit geometry, mission age, cell temperature) and determine
        which of the three power drains—<strong>Eclipse</strong>, <strong>Thermal</strong>, or <strong>Radiation</strong>—takes the largest
        toll on electrical generation.
      </p>

      <h3>What this does not capture</h3>
      <p>
        This is a first-order orbital power budgeting model. It evaluates orbit-averaged energy delivery and instantaneous sunlit capacity,
        but does not simulate battery electrochemical dynamics (depth-of-discharge, charge rate limits, or battery round-trip hysteresis).
        Array equilibrium temperature is treated as constant throughout the sunlit arc, neglecting transient cooling during eclipse transit.
        Albedo illumination and Earth thermal infrared reflection onto photovoltaic faces are also omitted, treating direct solar flux as
        the sole electrical source.
      </p>
    </Chapter>
  );
}
