import { SCENARIO_PRESETS } from './scenarioPresets';

/**
 * Static explainer content meant to sit above the <ThermalVisualizer/>
 * canvas on the page rather than inside it. Deliberately styled plainly
 * rather than matching the dark widget UI, since this is ordinary page
 * content and the host page's own typography and theme should usually win.
 */
export function Explainer() {
  return (
    <div style={{ maxWidth: 780, margin: '0 auto 24px', lineHeight: 1.6, fontSize: 15 }}>
      <h2 style={{ fontSize: 22, marginBottom: 8 }}>Can you run AI compute on a satellite?</h2>
      <p>
        Putting GPUs in orbit for AI compute gets suggested fairly regularly, usually on the grounds that solar power is
        unlimited up there and that cooling is free in a vacuum. Neither is quite true. A solar array generates only as
        much electricity as its area, efficiency and Sun-pointing allow, and getting rid of waste heat in a vacuum means
        radiating it away, which is slower and more area-hungry than the air or water cooling used on the ground. This
        tool is a back-of-the-envelope calculator and 3D visualisation for working out whether a given combination of
        compute load, radiator, solar array and orbit is actually sustainable. It is not an engineering tool, but it is
        enough to build some intuition for why the numbers come out the way they do.
      </p>

      <h3 style={{ fontSize: 17, marginTop: 20, marginBottom: 6 }}>How it works</h3>
      <p>
        The tool checks two independent constraints. The <strong>thermal budget</strong> compares the heat your requested
        compute power generates against how much the radiator and coolant loop can actually reject, which depends on the
        radiator's size and temperature and on how much of its field of view is Earth rather than cold deep space. The{' '}
        <strong>power budget</strong> compares the same compute load, plus a small allowance for pumps and avionics,
        against the electricity the solar array can generate from its area, cell efficiency and Sun-pointing accuracy.
        Either constraint can be the one that limits you in practice, so the tool reports both separately instead of
        combining them into a single figure. The power-limited and heat-limited scenarios below are built specifically to
        fail for opposite reasons.
      </p>
      <p>
        The orbit is modelled with real two-body orbital mechanics. Choosing an altitude, eccentricity and inclination
        gives the actual orbital period, and the satellite can be played through its orbit at real relative speed or sped
        up by a chosen multiple. Eccentric orbits correctly move faster near their closest approach to Earth and slower
        near their furthest point rather than sweeping round at a constant rate.
      </p>

      <h3 style={{ fontSize: 17, marginTop: 20, marginBottom: 6 }}>The main parameters</h3>
      <ul style={{ paddingLeft: 20 }}>
        <li><strong>Requested compute power.</strong> How much continuous electrical power the AI hardware draws. This is the main lever, and almost everything else exists either to supply it or to reject the heat it produces.</li>
        <li><strong>Radiator area, temperature and coatings.</strong> How large the radiator is and how efficiently it sheds heat. Larger and cooler rejects more, at the cost of mass and stowed volume.</li>
        <li><strong>Solar array area, efficiency and pointing.</strong> How much electricity is generated. A larger, more efficient, better aimed array supplies more power.</li>
        <li><strong>Orbit.</strong> Altitude and eccentricity set the orbital period and, through the presets, a reasonable starting Earth view factor. Different orbit classes trade off Earth heating, eclipse frequency and practical constellation design in different ways.</li>
      </ul>
      <p style={{ fontSize: 13.5, opacity: 0.75 }}>
        Every parameter has its own explanation behind the small information buttons in the controls panel, including
        reference wattages for real GPUs where those are relevant.
      </p>

      <h3 style={{ fontSize: 17, marginTop: 20, marginBottom: 6 }}>Scenarios worth trying</h3>
      <p>
        The scenario presets in the controls panel load these five complete configurations directly. Each one was run
        through the model to confirm it lands on the outcome described rather than simply looking plausible.
      </p>
      <ol style={{ paddingLeft: 20 }}>
        {SCENARIO_PRESETS.map((s) => (
          <li key={s.id} style={{ marginBottom: 12 }}>
            <strong>{s.label}.</strong> {s.explanation}
          </li>
        ))}
      </ol>

      <h3 style={{ fontSize: 17, marginTop: 20, marginBottom: 6 }}>What this does not capture</h3>
      <p style={{ fontSize: 14 }}>
        This is a steady-state snapshot rather than a simulation over time. There is no thermal mass, no battery state of
        charge and no model of temperature actually rising or falling, so a configuration is either sustainable
        indefinitely or it is not. The eclipse scenario above is the clearest illustration of what that leaves out. The
        Earth view factor, coolant properties and Sun-relative geometry are all simplified, so the results are best
        treated as a reasonable first-order estimate for exploring trade-offs rather than as something to build hardware
        against.
      </p>
    </div>
  );
}
