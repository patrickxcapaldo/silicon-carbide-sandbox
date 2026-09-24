import type { ThermalState } from './types';

export type ScenarioPreset = {
  id: string;
  label: string;
  /** One line shown on the preset button. */
  summary: string;
  /** Longer explanation of why this configuration produces the result it does, and what it implies. Shown in the preset's tooltip and referenced by the explainer above the visualisation. */
  explanation: string;
  state: ThermalState;
};

const LEO_ORBIT = { orbitAltitudeKm: 550, orbitEccentricity: 0.01, orbitInclinationDeg: 51.6, orbitRaanDeg: 25, orbitArgumentDeg: 0, orbitPhaseDeg: 0 };
const GEO_ORBIT = { orbitAltitudeKm: 35786, orbitEccentricity: 0.0002, orbitInclinationDeg: 0.02, orbitRaanDeg: 0, orbitArgumentDeg: 0, orbitPhaseDeg: 0 };
// A lower-inclination, favourably-oriented LEO than the one used elsewhere,
// chosen because it shows a somewhat larger eclipse fraction (about 39%
// against this tool's fixed Sun direction) than the standard LEO preset
// above, which makes the eclipse-trap scenario below clearer.
const ECLIPSE_PRONE_ORBIT = { orbitAltitudeKm: 400, orbitEccentricity: 0.001, orbitInclinationDeg: 30, orbitRaanDeg: 90, orbitArgumentDeg: 0, orbitPhaseDeg: 0 };

// Every configuration below was run through the model, not just eyeballed,
// to confirm it actually lands on the status described. The percentages
// quoted in each explanation are the model's real output for that exact
// configuration.
export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'baseline-safe',
    label: 'Comfortable baseline',
    summary: 'A modest AI payload with reasonably sized hardware in low Earth orbit. Both budgets have headroom.',
    explanation: 'A 250 W compute request against a 3 m\u00b2 radiator and a 6 m\u00b2 solar array in a typical 550 km orbit. This uses about 18% of the thermal budget and about 26% of the power budget, once the orbit\u2019s eclipse duty cycle (this orbit is sunlit about 64% of the time) is factored in, and is comfortably Safe on both counts. It is the reference point for the scenarios that follow, each of which changes one specific thing about this baseline to break it in an identifiable way.',
    state: {
      satelliteTempC: 40, operatingTempC: 60, radiatorArea: 3, emissivity: 0.9, solarAbsorptivity: 0.12,
      sinkTempK: 180, earthIrTempK: 255, earthViewFactor: 0.35, earthAlbedo: 0.3,
      solarLoadWm2: 1000, sunIncidence: 0.3, flowRateKgS: 0.4, coolantDeltaT: 12, parasiticHeatW: 30,
      computeWattsRequested: 250, solarPanelAreaM2: 6, solarPanelEfficiency: 0.29, solarPanelPointingFactor: 0.97,
      ...LEO_ORBIT,
    },
  },
  {
    id: 'oversized-geo',
    label: 'Oversized payload in GEO',
    summary: 'A large AI payload placed in a geostationary orbit with only modest hardware. It fails on both budgets.',
    explanation: 'This moves to geostationary altitude and requests 2,500 W of compute while keeping the radiator and array close to the baseline size. Earth\u2019s view factor drops to near zero out here, which helps the thermal side a little, and this orbit happens to show no eclipse at all against this tool\u2019s fixed Sun direction, which helps the power side. Neither comes close to compensating for a tenfold increase in compute on similarly sized hardware: the result is about 167% of the thermal budget and about 113% of the power budget, Overheating on both counts. The lesson is that changing orbit is not a substitute for sizing the radiator and array to the actual compute load, and the compute request is almost always the dominant lever.',
    state: {
      satelliteTempC: 55, operatingTempC: 70, radiatorArea: 3, emissivity: 0.88, solarAbsorptivity: 0.14,
      sinkTempK: 200, earthIrTempK: 255, earthViewFactor: 0.03, earthAlbedo: 0.3,
      solarLoadWm2: 1361, sunIncidence: 0.5, flowRateKgS: 0.4, coolantDeltaT: 12, parasiticHeatW: 40,
      computeWattsRequested: 2500, solarPanelAreaM2: 6, solarPanelEfficiency: 0.29, solarPanelPointingFactor: 0.95,
      ...GEO_ORBIT,
    },
  },
  {
    id: 'power-limited',
    label: 'Power-limited, not heat-limited',
    summary: 'Plenty of radiator but a small solar array. The bottleneck is generating electricity rather than shedding heat.',
    explanation: 'A generous 10 m\u00b2 radiator handles 900 W of compute heat easily, using only 16% of the thermal budget. A small, inefficient and poorly pointed 1.5 m\u00b2 array, however, can generate only about 240 W at best, and less again once this orbit\u2019s eclipse duty cycle is applied. The 900 W request plus bus overhead comes to about 612% of the orbit-averaged supply, so the status reads Overheating for an electrical reason rather than a thermal one. The status badge alone cannot tell you this: you have to look at the telemetry bar and notice that the thermal figure shows headroom while the power figure shows a large deficit. This is why the tool tracks the two budgets separately instead of folding them into a single number.',
    state: {
      satelliteTempC: 45, operatingTempC: 70, radiatorArea: 10, emissivity: 0.9, solarAbsorptivity: 0.12,
      sinkTempK: 180, earthIrTempK: 255, earthViewFactor: 0.3, earthAlbedo: 0.3,
      solarLoadWm2: 1000, sunIncidence: 0.3, flowRateKgS: 0.7, coolantDeltaT: 15, parasiticHeatW: 40,
      computeWattsRequested: 900, solarPanelAreaM2: 1.5, solarPanelEfficiency: 0.2, solarPanelPointingFactor: 0.8,
      ...LEO_ORBIT,
    },
  },
  {
    id: 'heat-limited',
    label: 'Heat-limited, not power-limited',
    summary: 'Plenty of solar power but a tiny, poorly oriented radiator. The bottleneck is shedding heat rather than generating power.',
    explanation: 'The mirror image of the previous scenario, using the same 900 W compute request so the two can be compared directly. The array here is generous at 14 m\u00b2 and well pointed, generating far more power than needed even once eclipse is accounted for, at about 28% power utilisation. The radiator, however, is only 1 m\u00b2, has poor emissivity, absorbs sunlight readily and sits nearly face-on to the Sun, so it can reject only about 35 W net. The 900 W request is roughly 26 times that figure, so the configuration is heavily Overheating for purely thermal reasons. In practice a radiator this undersized would need to be far larger, angled away from the Sun, or paired with a drastically throttled compute load.',
    state: {
      satelliteTempC: 60, operatingTempC: 85, radiatorArea: 1, emissivity: 0.7, solarAbsorptivity: 0.3,
      sinkTempK: 220, earthIrTempK: 270, earthViewFactor: 0.6, earthAlbedo: 0.3,
      solarLoadWm2: 1300, sunIncidence: 0.9, flowRateKgS: 0.2, coolantDeltaT: 6, parasiticHeatW: 40,
      computeWattsRequested: 900, solarPanelAreaM2: 14, solarPanelEfficiency: 0.3, solarPanelPointingFactor: 0.98,
      ...LEO_ORBIT,
    },
  },
  {
    id: 'eclipse-trap',
    label: 'The instantaneous-power trap',
    summary: 'Looks comfortably fine if you only check full-sun generation. The real, eclipse-averaged figure says otherwise.',
    explanation: 'A 600 W compute request against a 2.4 m\u00b2 array in an orbit that is sunlit about 61% of the time. Checked against the array\u2019s instantaneous full-sun output alone, the load uses about 70% of that supply, which reads as comfortable Margin and nothing to worry about. But a continuous compute load has to be sustained across the whole orbit, including the roughly 39% spent in Earth\u2019s shadow, and the array only generates that instantaneous figure while it is actually sunlit. Averaged correctly over the full orbit, the same load comes to about 115% of what the array actually supplies: Overheating on the power budget, despite looking fine by the naive check. This is the exact trap an instantaneous-only power comparison sets: it implicitly assumes 100% duty cycle sunlight, which no real orbit gives you without a battery to carry the load through eclipse, and this tool does not model one.',
    state: {
      satelliteTempC: 40, operatingTempC: 60, radiatorArea: 4, emissivity: 0.9, solarAbsorptivity: 0.12,
      sinkTempK: 180, earthIrTempK: 255, earthViewFactor: 0.35, earthAlbedo: 0.3,
      solarLoadWm2: 1361, sunIncidence: 0.3, flowRateKgS: 0.5, coolantDeltaT: 15, parasiticHeatW: 30,
      computeWattsRequested: 600, solarPanelAreaM2: 2.4, solarPanelEfficiency: 0.29, solarPanelPointingFactor: 0.95,
      ...ECLIPSE_PRONE_ORBIT,
    },
  },
  // ---------------------------------------------------------------------
  // Fleet-architecture presets. Added alongside Study 01 (fleet invariance)
  // and Spark 03. Unlike the five above, these three are pinned by golden
  // vectors gv-08 to gv-10 in data/golden-vectors/orbital-thermal-limits.json,
  // and model.test.ts fails if a preset here drifts from its vector.
  // "Parasitic share" in the last two is parasiticHeatW divided by
  // (radiativeRejectionW - externalHeatW), i.e. the heat budget before the
  // parasitic deduction, taken straight from kernel outputs.
  // ---------------------------------------------------------------------
  {
    id: 'transport-limited-monolith',
    label: 'Transport-limited monolithic node',
    summary: 'A large radiator on a thin coolant loop. Most of the radiating capacity sits idle because the loop cannot deliver the heat to it.',
    explanation: 'A 15 m\u00b2 radiator at 80 \u00b0C could reject about 9,295 W net of solar, albedo and parasitic loads, but the coolant loop (0.05 kg/s with a 5 K rise) can move only about 263 W to it. The 2,000 W request is therefore about 762% of the usable thermal budget and the status reads Overheating, even though roughly 9,030 W of radiating capacity (about 97% of it) goes unused. Power is not the problem: the 30 m\u00b2 array covers this load using about 38% of its orbit-averaged output. This is what happens when radiator area keeps growing on a single node without growing the loop that feeds it: the binding limit stops being radiation and becomes plumbing, \u1e41\u00b7c\u209a\u00b7\u0394T. Raising the flow to 0.2 kg/s at a 10 K rise (about 2,100 W) lifts the ceiling above the request. In this tool the transport figure is a design limit rather than a physical wall, but it grows only as fast as the loop does, which is one reason large platforms split their heat across many loops and one reason fleets of smaller nodes are attractive.',
    state: {
      satelliteTempC: 50, operatingTempC: 80, radiatorArea: 15, emissivity: 0.9, solarAbsorptivity: 0.12,
      sinkTempK: 200, earthIrTempK: 255, earthViewFactor: 0.2, earthAlbedo: 0.3,
      solarLoadWm2: 1000, sunIncidence: 0.5, flowRateKgS: 0.05, coolantDeltaT: 5, parasiticHeatW: 30,
      computeWattsRequested: 2000, solarPanelAreaM2: 30, solarPanelEfficiency: 0.29, solarPanelPointingFactor: 0.97,
      ...LEO_ORBIT,
    },
  },
  {
    id: 'tiny-node-overhead',
    label: 'Tiny node overhead (micro-swarm)',
    summary: 'A 100 W node carrying 30 W of fixed avionics heat. The fixed tax is a large slice of a small radiator\u2019s budget.',
    explanation: 'A 100 W compute request on a 1 m\u00b2 radiator at 65 \u00b0C, with 30 W of avionics and housekeeping heat that does not shrink just because the node does. The radiator can reject about 526 W net of solar and albedo loads before parasitics, so the fixed 30 W takes about 5.7% of that heat budget (and equals 30% of the compute heat itself). The node is comfortably Safe, at about 20% of the thermal budget and about 48% of the power budget on a 1.5 m\u00b2 array, so nothing fails here. The point is the overhead: at this size a large share of every radiator and array watt is spent keeping the node alive rather than computing, which is why swarms of very small nodes are an expensive way to buy a given amount of compute. Compare the next preset, which has the same flux per square metre.',
    state: {
      satelliteTempC: 40, operatingTempC: 65, radiatorArea: 1, emissivity: 0.9, solarAbsorptivity: 0.12,
      sinkTempK: 180, earthIrTempK: 255, earthViewFactor: 0.3, earthAlbedo: 0.3,
      solarLoadWm2: 1000, sunIncidence: 0.3, flowRateKgS: 0.1, coolantDeltaT: 8, parasiticHeatW: 30,
      computeWattsRequested: 100, solarPanelAreaM2: 1.5, solarPanelEfficiency: 0.29, solarPanelPointingFactor: 0.97,
      ...LEO_ORBIT,
    },
  },
  {
    id: 'scaled-node-overhead',
    label: 'Scaled node overhead (modular fleet)',
    summary: 'The same 30 W of fixed heat on a 1 kW node. Same flux per square metre, but the overhead share falls by about eight times.',
    explanation: 'The previous preset scaled up: 1,000 W of compute on an 8 m\u00b2 radiator, at the same 65 \u00b0C, the same environment and the same 30 W of fixed parasitic heat. Gross radiator flux is identical at about 565 W/m\u00b2, so the area needed per watt of heat has not changed, which is the fleet-invariance point in Study 01: dividing a heat load between nodes does not change the total radiator area, only the overhead. What does change is the fixed tax. Net of solar and albedo loads the radiator can reject about 4,206 W before parasitics, so the same 30 W is now about 0.7% of that budget, down from 5.7%, and 3% of the compute heat instead of 30%. The status is Safe at about 24% of the thermal budget and about 57% of the power budget on a 10 m\u00b2 array. Beyond this size the overhead is already small, so further scaling buys little, while the loop and packaging demands shown in the transport-limited preset keep growing with the node.',
    state: {
      satelliteTempC: 40, operatingTempC: 65, radiatorArea: 8, emissivity: 0.9, solarAbsorptivity: 0.12,
      sinkTempK: 180, earthIrTempK: 255, earthViewFactor: 0.3, earthAlbedo: 0.3,
      solarLoadWm2: 1000, sunIncidence: 0.3, flowRateKgS: 0.5, coolantDeltaT: 10, parasiticHeatW: 30,
      computeWattsRequested: 1000, solarPanelAreaM2: 10, solarPanelEfficiency: 0.29, solarPanelPointingFactor: 0.97,
      ...LEO_ORBIT,
    },
  },
];
