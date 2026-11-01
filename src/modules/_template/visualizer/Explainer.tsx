import { Callout, Chapter, Equation, Facts, Working } from '../../../core/ui';
import { equations } from '../equations';
import { run } from '../model';

/**
 * The textbook half of the page, always in this order (North Star):
 *   1. The question   2. Concepts   3. Equations   4. Worked example   5. Limits
 * Keep prose to ~780px (Chapter does this), British English, units on every number.
 */
export function Explainer() {
  const example = run({ areaM2: 4, temperatureK: 330, emissivity: 0.9, loadW: 2000 });
  return (
    <Chapter>
      <h2>The question: how much heat can a radiator reject?</h2>
      <p>In space there is no air to carry heat away, so everything a spacecraft dissipates must leave as infrared radiation. State the question in one paragraph, then say what the reader will be able to answer by the end.</p>
      <Callout>Put the one sentence the reader should remember here.</Callout>

      <h3>Concepts</h3>
      <ul>
        <li><strong>Emissivity.</strong> One plain sentence per concept, bold term first.</li>
      </ul>

      <h3>Equations</h3>
      <p><strong>{equations[0].label}.</strong> {equations[0].description}</p>
      <Equation latex={equations[0].latex} />
      <Working summary="Show the working">
        <p>Longer derivations and secondary equations go in a disclosure so the main line stays short.</p>
      </Working>

      <h3>Worked example</h3>
      <p>Walk one concrete case with real numbers, using the same model the tool runs.</p>
      <Facts
        items={[
          ['Area', '4 m²'],
          ['Temperature', '330 K'],
          ['Emissivity', '0.90'],
          ['Radiated power', `${Math.round(example.radiatedW).toLocaleString('en-GB')} W`],
        ]}
      />

      <h3>What this does not capture</h3>
      <p>List what is ignored and which way it biases the answer.</p>
    </Chapter>
  );
}
