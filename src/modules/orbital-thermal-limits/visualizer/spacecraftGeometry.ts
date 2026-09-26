// Shared panel-sizing formulas used by Radiator, CoolantLoop and SolarPanel.
// Previously the radiator's width/height and the solar wing's length/width
// were each computed with a hard Math.min() cap, duplicated independently
// in three files. Two problems came from that: the formulas could (and
// did) drift out of sync, and a hard cap means the model looks completely
// frozen once you cross the threshold that trips it.
//
// A second problem showed up once radiatorArea/solarPanelAreaM2 grew to
// support multi-km monolithic platforms (1 m^2 micro-node up to 1e7 m^2):
// a pure sqrt(area) mapping saturates the scene long before GW scale, so
// a 100 W node, a 175 kW Starmind-class node and a 5 GW monolith all
// looked like the same size. We map area through log10 instead, so each
// *decade* of physical size still produces visible growth, then soft-cap
// with tanh so the rendered extent stays bounded for the close-up camera
// and the orbit-view non-clipping marker.
//
// `softCap` tracks the raw value closely for small inputs, then
// asymptotically approaches (but never quite reaches) the ceiling for
// large ones. There's no value at which growth truly stops, so the
// geometry always responds to the slider, while the rendered size still
// stays safely bounded (tanh(x) < 1 always, so the output is strictly less
// than `ceiling`) -- which is what lets ThermalScene compute a reliable,
// provably-safe max reach for the non-clipping marker in Orbit view.

function softCap(raw: number, ceiling: number) {
  return ceiling * Math.tanh(raw / ceiling);
}

/**
 * Log-decade visual extent. `decades = log10(1 + panelArea)` grows by ~1
 * per order of magnitude of physical area; the linear coefficients set
 * the scene-unit size at the low end and the growth per decade. Verified
 * against the reference points quoted below by evaluating this function
 * directly, not just by inspection.
 */
function logDecadeExtent(panelArea: number, base: number, perDecade: number, ceiling: number) {
  const decades = Math.log10(1 + Math.max(0.05, panelArea));
  return softCap(base + decades * perDecade, ceiling);
}

export function radiatorPanelSize(radiatorArea: number) {
  // Total radiatorArea is two-sided; each wing is half.
  const onePanelArea = Math.max(0.1, radiatorArea / 2);
  const aspect = 2.0;
  // Reference points (scene units, before aspect split), verified:
  //   ~1 m^2 total  -> width ~ 0.5   (100 W micro-node)
  //   ~160 m^2      -> width ~ 2.1   (Starmind-class node)
  //   ~1e7 m^2      -> width ~ 5.0   (5 GW monolith concept)
  const longEdge = logDecadeExtent(onePanelArea, 0.35, 0.95, 6.5);
  const shortEdge = longEdge / Math.sqrt(aspect);
  return { width: longEdge, height: shortEdge };
}

// Ceiling values above are exact upper bounds for radiatorPanelSize's
// output at any input, so this is a safe (if slightly conservative) static
// upper bound on how far a radiator can reach from the bus center.
export const RADIATOR_MAX_REACH = 0.36 + 6.5 / 2 + 0.22;

export function solarWingSize(areaM2: number) {
  const wingArea = Math.max(0.05, areaM2 / 2);
  const aspect = 3.1;
  // Same log-decade curve, slightly different base/ceiling so solar wings
  // track the radiator scale across node -> fleet -> monolith without
  // dominating the close-up framing at the high end.
  const longEdge = logDecadeExtent(wingArea, 0.40, 0.90, 6.2);
  const shortEdge = longEdge / Math.sqrt(aspect);
  return { length: longEdge, width: shortEdge };
}

export const SOLAR_HINGE = 0.235;
export const SOLAR_MAX_REACH = SOLAR_HINGE + 6.2;
