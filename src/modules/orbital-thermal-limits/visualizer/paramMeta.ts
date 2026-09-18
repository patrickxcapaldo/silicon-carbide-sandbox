import type { ThermalState } from './types';

export type ParamMeta = {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  description: string;
};

export const PARAM_META: Record<keyof ThermalState, ParamMeta> = {
  // Orbit
  orbitAltitudeKm: {
    label: 'Perigee altitude', unit: 'km', min: 160, max: 40000, step: 10,
    description: 'Height above mean Earth radius at the closest point of the orbit. It sets the orbital period through Kepler\u2019s third law: roughly 90 minutes at 400 km, about 12 hours at GPS-like altitude, and about 24 hours at geostationary altitude (around 35,786 km).',
  },
  orbitEccentricity: {
    label: 'Eccentricity', unit: '', min: 0, max: 0.75, step: 0.01,
    description: 'A value of 0 is a perfectly circular orbit. Higher values stretch the orbit into an ellipse, holding perigee altitude fixed while apogee rises. Around 0.74 is typical of a Molniya-type highly elliptical orbit. It also affects how much of the orbit is spent in Earth\u2019s shadow, since the satellite moves more slowly near apogee than perigee.',
  },
  orbitInclinationDeg: {
    label: 'Inclination', unit: '\u00b0', min: 0, max: 98, step: 1,
    description: 'Tilt of the orbital plane relative to Earth\u2019s equator. 0\u00b0 is equatorial, about 90\u00b0 is polar, and just under 98\u00b0 is a typical Sun-synchronous inclination for low orbits. This is one of the main things that determines how much of the orbit is spent in Earth\u2019s shadow, which now feeds directly into the power budget.',
  },
  orbitRaanDeg: {
    label: 'RAAN', unit: '\u00b0', min: 0, max: 360, step: 1,
    description: 'Right ascension of the ascending node. It rotates the whole orbital plane around Earth\u2019s polar axis, which changes the orbit\u2019s orientation relative to the fixed Sun direction used here, and so can noticeably shift how much of the orbit falls in eclipse.',
  },
  orbitArgumentDeg: {
    label: 'Argument of perigee', unit: '\u00b0', min: 0, max: 360, step: 1,
    description: 'Rotates the ellipse within its own orbital plane, which determines where perigee points. It only has a visible effect, including on eclipse duration, when eccentricity is greater than 0.',
  },
  orbitPhaseDeg: {
    label: 'Orbital phase', unit: '\u00b0', min: 0, max: 360, step: 1,
    description: 'The satellite\u2019s true anomaly, meaning its position around the orbit right now, measured from perigee (0\u00b0). Dragging this while paused moves the satellite directly, and pressing Play advances it automatically over time.',
  },

  // Radiator / loop
  radiatorArea: {
    label: 'Radiator area', unit: 'm\u00b2', min: 0.5, max: 20, step: 0.5,
    description: 'Total two-sided radiating area of the panels. More area rejects more heat at the same temperature, at the cost of mass, drag and stowage volume.',
  },
  operatingTempC: {
    label: 'Radiator temperature', unit: '\u00b0C', min: 20, max: 180, step: 1,
    description: 'Hot-side temperature of the radiator and coolant. Radiated power scales with the fourth power of absolute temperature, so this has a disproportionately large effect on rejection capacity.',
  },
  emissivity: {
    label: 'IR emissivity', unit: '\u03b5', min: 0.5, max: 0.99, step: 0.01,
    description: 'How efficiently the radiator surface emits long-wave infrared. Modelled as a constant independent of solar absorptivity below, which is how real spacecraft coatings are designed: a selective surface rather than a grey body, which would require the two to be equal. White paints and certain coatings reach roughly 0.85 to 0.95, whereas polished bare metal is much lower.',
  },
  solarAbsorptivity: {
    label: 'Solar absorptivity', unit: '\u03b1', min: 0.02, max: 0.8, step: 0.01,
    description: 'Fraction of incident sunlight the radiator coating absorbs rather than reflects. Good radiator coatings aim for low \u03b1 and high \u03b5 together, such as white paint or silvered Teflon, which is only possible because the two are independent properties rather than a single grey-body value.',
  },
  sinkTempK: {
    label: 'Space sink temperature', unit: 'K', min: 3, max: 250, step: 1,
    description: 'Effective background temperature the radiator radiates against when facing deep space. True deep space is about 2.7 K, but a real radiator also sees warm structure and other spacecraft surfaces, so a higher effective sink is normally used.',
  },
  earthIrTempK: {
    label: 'Earth IR temperature', unit: 'K', min: 180, max: 320, step: 1,
    description: 'Effective blackbody temperature of Earth\u2019s thermal (long-wave) emission, roughly 255 K on average. That is much warmer than deep space, so facing Earth increases the radiator\u2019s heat load.',
  },
  earthAlbedo: {
    label: 'Earth albedo', unit: '', min: 0, max: 0.9, step: 0.01,
    description: 'Fraction of incoming sunlight Earth reflects back into space, with a global average of about 0.3. This reflected light can land on the radiator in addition to direct sunlight and Earth\u2019s own infrared.',
  },
  earthViewFactor: {
    label: 'Earth view factor', unit: '', min: 0, max: 1, step: 0.01,
    description: 'Fraction of the radiator\u2019s field of view occupied by Earth rather than deep space. A flat, nadir-pointing plate sees F = (R\u2091/(R\u2091+h))\u00b2, which is close to 0.85 in low orbit and under 0.03 at geostationary altitude. Orbit presets suggest a value from this formula, but radiators angled away from nadir see less and can be set lower.',
  },
  coolantDeltaT: {
    label: 'Coolant \u0394T', unit: 'K', min: 1, max: 80, step: 1,
    description: 'Temperature rise of the coolant as it picks up heat from the compute payload, up to the maximum the payload can tolerate on its hot side. A larger \u0394T moves more heat at the same flow rate, but is a design limit set by the payload rather than a hard physical ceiling on the fluid itself.',
  },
  flowRateKgS: {
    label: 'Coolant flow', unit: 'kg/s', min: 0.01, max: 1.5, step: 0.01,
    description: 'Mass flow rate of a single-phase, space-grade dielectric coolant such as Galden PFPE around the loop. Together with \u0394T this sets how much heat the loop can move (P = \u1e41\u00b7c\u209a\u00b7\u0394T) while keeping the payload under its temperature limit. Pumping coolant faster costs more electrical power for the pump itself, which is not modelled here.',
  },
  parasiticHeatW: {
    label: 'Parasitic heat', unit: 'W', min: 0, max: 500, step: 5,
    description: 'Heat from electronic and resistive bus losses, such as pumps, avionics and wiring, that also has to be rejected through the same radiator. It is also used as a stand-in for that hardware\u2019s electrical draw in the power budget below, which does not extend to active heaters or an RF payload, since electrical power does not map one-to-one onto waste heat for either of those.',
  },

  // Spacecraft / environment
  satelliteTempC: {
    label: 'Bus temperature', unit: '\u00b0C', min: -20, max: 150, step: 1,
    description: 'Illustrative bulk temperature of the spacecraft bus body (the structure and avionics box), shown by its colour in the 3D view. It is independent of the radiator thermal calculation.',
  },
  solarLoadWm2: {
    label: 'Solar flux', unit: 'W/m\u00b2', min: 0, max: 1600, step: 10,
    description: 'Incident sunlight intensity. Roughly 1,361 W/m\u00b2 is the solar constant near Earth. Set it towards 0 to represent eclipse, when the spacecraft is in Earth\u2019s shadow.',
  },
  sunIncidence: {
    label: 'Sun incidence', unit: '', min: 0, max: 1, step: 0.01,
    description: 'Cosine-like factor for the angle between the radiator\u2019s surface normal and the Sun direction. At 1 the sunlight hits the radiator face-on, which is the worst case for absorbed heat. At 0 the sunlight is edge-on or blocked.',
  },

  // Compute
  computeWattsRequested: {
    label: 'Requested compute power', unit: 'W', min: 0, max: 5000, step: 10,
    description: 'Continuous electrical power drawn by the onboard AI compute, almost all of which ends up as waste heat that must cross the same radiator and coolant path. For scale, an edge inference module draws tens of watts, a single H100-class GPU is around 700 W, and a GB300-class GPU is around 1,400 W. The quick-select buttons below set these values directly.',
  },

  // Power / solar array
  solarPanelAreaM2: {
    label: 'Solar array area', unit: 'm\u00b2', min: 0.5, max: 30, step: 0.5,
    description: 'Total active solar cell area across both deployed array wings. Larger arrays generate more power but add mass, drag and deployment complexity.',
  },
  solarPanelEfficiency: {
    label: 'Solar cell efficiency', unit: '\u03b7', min: 0.05, max: 0.4, step: 0.01,
    description: 'Net electrical efficiency of the array, combining cell physics, packing density and wiring losses. Modern space-grade triple-junction cells run at roughly 28 to 32%, whereas older or cheaper silicon cells are closer to 14 to 20%.',
  },
  solarPanelPointingFactor: {
    label: 'Solar pointing accuracy', unit: '', min: 0, max: 1, step: 0.01,
    description: 'How well the array\u2019s single-axis drive keeps it aimed at the Sun, where 1 is perfect tracking. Unlike the radiator, the array actively rotates to track the Sun regardless of orbital position, and it visibly swings in the 3D view as this value changes.',
  },
};
