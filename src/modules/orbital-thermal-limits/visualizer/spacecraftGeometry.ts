// Shared panel-sizing formulas. Previously the radiator's width/height and
// the solar wing's length/width were each computed with a hard Math.min()
// cap, duplicated independently in Radiator.tsx, CoolantLoop.tsx (which
// needs to know the radiator's width to attach the coolant tube at its
// edge) and SolarPanel.tsx. Two problems came from that: the formulas could
// (and did) drift out of sync, and a hard cap means the model looks
// completely frozen once you cross the threshold that trips it -- dragging
// the area slider from, say, 10 m^2 to 20 m^2 produced no visible change at
// all, which reads as broken.
//
// `softCap` fixes the "looks broken" part: it tracks the raw value closely
// for small inputs, then asymptotically approaches (but never quite
// reaches) the ceiling for large ones, via tanh. There's no value at which
// growth truly stops, so the geometry always responds to the slider, while
// the rendered size still stays safely bounded (tanh(x) < 1 always, so the
// output is strictly less than `ceiling`) -- which is what lets
// ThermalScene compute a reliable, provably-safe max reach for the
// non-clipping marker in Orbit view.

function softCap(raw: number, ceiling: number) {
  return ceiling * Math.tanh(raw / ceiling);
}

export function radiatorPanelSize(radiatorArea: number) {
  const onePanelArea = Math.max(0.1, radiatorArea / 2);
  const aspect = 2.0;
  const width = softCap(Math.sqrt(onePanelArea * aspect) * 0.78, 2.6);
  const height = softCap(Math.sqrt(onePanelArea / aspect) * 0.78, 1.3);
  return { width, height };
}
// Ceiling values above are exact upper bounds for radiatorPanelSize's
// output at any input, so this is a safe (if slightly conservative) static
// upper bound on how far a radiator can reach from the bus center.
export const RADIATOR_MAX_REACH = 0.36 + 2.6 / 2 + 0.22;

export function solarWingSize(areaM2: number) {
  const wingArea = Math.max(0.05, areaM2 / 2);
  const aspect = 3.1;
  const length = softCap(Math.sqrt(wingArea * aspect) * 0.82, 2.7);
  const width = softCap(Math.sqrt(wingArea / aspect) * 0.82, 1.05);
  return { length, width };
}
export const SOLAR_HINGE = 0.235;
export const SOLAR_MAX_REACH = SOLAR_HINGE + 2.7;
