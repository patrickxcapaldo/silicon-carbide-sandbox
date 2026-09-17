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

// Every configuration below was run through the model (not just eyeballed)
// to confirm it actually lands on the status described. The percentages
// quoted in each explanation are the model's real output for that exact
// configuration.
export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'baseline-safe',
    label: 'Comfortable baseline',
    summary: 'A modest AI payload with reasonably sized hardware in low Earth orbit. Both budgets have headroom.',
    explanation: 'A 250 W compute request against a 3 m\u00b2 radiator and a 6 m\u00b2 solar array in a typical 550 km orbit. This uses about 18% of the thermal budget and 17% of the power budget, which is comfortably Safe on both counts. It is the reference point for the other four scenarios, each of which changes one specific thing about this baseline in order to break it in an identifiable way.',
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
    explanation: 'This moves to geostationary altitude and requests 2,500 W of compute while keeping the radiator and array close to the baseline size. Earth\u2019s view factor drops to near zero at this altitude because Earth subtends a much smaller angle, which does help a little, but it comes nowhere near compensating for a tenfold increase in compute on similarly sized hardware. The result is about 167% of the thermal budget and 113% of the power budget, so it is Overheating on both counts. The lesson is that changing orbit is not a substitute for sizing the radiator and array to the actual compute load, and the compute request is almost always the dominant lever.',
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
    explanation: 'A generous 10 m\u00b2 radiator handles 900 W of compute heat easily, using only 16% of the thermal budget. A small, inefficient and poorly pointed 1.5 m\u00b2 array, however, can only generate about 240 W. The 900 W request plus bus overhead comes to roughly 392% of what the array can supply, so the status reads Overheating for an electrical reason rather than a thermal one. The status badge alone cannot tell you this. You have to look at the telemetry bar and notice that the thermal figure shows headroom while the power figure shows a large deficit. This is why the tool tracks the two budgets separately instead of folding them into a single number.',
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
    explanation: 'This is the mirror image of the previous scenario, using the same 900 W compute request so the two can be compared directly. The array here is generous at 14 m\u00b2 and well pointed, generating far more power than needed at 18% utilisation. The radiator, however, is only 1 m\u00b2, has poor emissivity, absorbs sunlight readily and sits nearly face-on to the Sun, so it can reject only about 35 W net. The 900 W request is roughly 25 times that figure, so the configuration is heavily Overheating for purely thermal reasons. In practice a radiator this undersized would need to be far larger, angled away from the Sun, or paired with a drastically throttled compute load.',
    state: {
      satelliteTempC: 60, operatingTempC: 85, radiatorArea: 1, emissivity: 0.7, solarAbsorptivity: 0.3,
      sinkTempK: 220, earthIrTempK: 270, earthViewFactor: 0.6, earthAlbedo: 0.3,
      solarLoadWm2: 1300, sunIncidence: 0.9, flowRateKgS: 0.2, coolantDeltaT: 6, parasiticHeatW: 40,
      computeWattsRequested: 900, solarPanelAreaM2: 14, solarPanelEfficiency: 0.3, solarPanelPointingFactor: 0.98,
      ...LEO_ORBIT,
    },
  },
  {
    id: 'eclipse',
    label: 'Fine in sunlight, fails in eclipse',
    summary: 'The same 400 W load on the same hardware, with only the sunlight changing. It demonstrates the tool\u2019s battery-buffering blind spot.',
    explanation: 'A 400 W compute request that is perfectly Safe in daylight, at 26% of the thermal budget and 32% of the power budget. Setting Solar Flux to 0 W/m\u00b2 represents eclipse, when the spacecraft passes into Earth\u2019s shadow. With everything else unchanged, generated power drops to 0 W and the status immediately flips to Overheating on the power budget, since there is no generation at all to divide the load by. A real spacecraft would run this load from batteries for a while, which this tool does not model. It treats every configuration as an indefinite steady state, so eclipse here means permanently in darkness rather than for the next 35 minutes. Loading this preset and switching Solar Flux between roughly 1,000 and 0 is the quickest way to see that limitation directly.',
    state: {
      satelliteTempC: 40, operatingTempC: 65, radiatorArea: 3, emissivity: 0.9, solarAbsorptivity: 0.12,
      sinkTempK: 180, earthIrTempK: 255, earthViewFactor: 0.35, earthAlbedo: 0.3,
      solarLoadWm2: 1000, sunIncidence: 0.3, flowRateKgS: 0.4, coolantDeltaT: 12, parasiticHeatW: 35,
      computeWattsRequested: 400, solarPanelAreaM2: 5, solarPanelEfficiency: 0.29, solarPanelPointingFactor: 0.95,
      ...LEO_ORBIT,
    },
  },
];
