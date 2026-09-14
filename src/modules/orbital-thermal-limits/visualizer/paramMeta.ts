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
    description: 'Height above mean Earth radius at the closest point of the orbit. Sets orbital period via Kepler\u2019s third law: ~90 min at 400 km, ~12 h at GPS-like altitude, ~24 h at geostationary altitude (~35,786 km).',
  },
  orbitEccentricity: {
    label: 'Eccentricity', unit: '', min: 0, max: 0.75, step: 0.01,
    description: '0 = perfectly circular orbit. Higher values stretch the orbit into an ellipse (perigee altitude stays fixed; apogee rises). ~0.74 is typical of a Molniya-type highly elliptical orbit.',
  },
  orbitInclinationDeg: {
    label: 'Inclination', unit: '\u00b0', min: 0, max: 98, step: 1,
    description: 'Tilt of the orbital plane relative to Earth\u2019s equator. 0\u00b0 is equatorial, ~90\u00b0 is polar, and just under 98\u00b0 is a typical Sun-synchronous inclination for low orbits.',
  },
  orbitRaanDeg: {
    label: 'RAAN', unit: '\u00b0', min: 0, max: 360, step: 1,
    description: 'Right ascension of the ascending node \u2014 rotates the whole orbital plane around Earth\u2019s polar axis. Mainly changes the orbit\u2019s orientation in this visualization, not its thermal environment.',
  },
  orbitArgumentDeg: {
    label: 'Argument of perigee', unit: '\u00b0', min: 0, max: 360, step: 1,
    description: 'Rotates the ellipse within its own orbital plane, i.e. where perigee points. Only visible when eccentricity is greater than 0.',
  },
  orbitPhaseDeg: {
    label: 'Orbital phase', unit: '\u00b0', min: 0, max: 360, step: 1,
    description: 'The satellite\u2019s true anomaly \u2014 its position around the orbit right now, measured from perigee (0\u00b0). Dragging this while paused moves the satellite directly; press Play to advance it automatically over time.',
  },

  // Radiator / loop
  radiatorArea: {
    label: 'Radiator area', unit: 'm\u00b2', min: 0.5, max: 20, step: 0.5,
    description: 'Total two-sided radiating area of the panels. More area rejects more heat for the same temperature, at the cost of mass, drag, and stowage volume.',
  },
  operatingTempC: {
    label: 'Radiator temperature', unit: '\u00b0C', min: 20, max: 180, step: 1,
    description: 'Hot-side temperature of the radiator/coolant. Radiated power scales with the 4th power of absolute temperature, so this has an outsized effect on rejection capacity.',
  },
  emissivity: {
    label: 'IR emissivity', unit: '\u03b5', min: 0.5, max: 0.99, step: 0.01,
    description: 'How efficiently the radiator surface emits long-wave infrared. White paints and certain coatings reach ~0.85\u20130.95; polished bare metal is much lower.',
  },
  solarAbsorptivity: {
    label: 'Solar absorptivity', unit: '\u03b1', min: 0.02, max: 0.8, step: 0.01,
    description: 'Fraction of incident sunlight the radiator coating absorbs (as opposed to reflecting). Good radiator coatings aim for low \u03b1 and high \u03b5 together (e.g. white paint, silvered Teflon).',
  },
  sinkTempK: {
    label: 'Space sink temperature', unit: 'K', min: 3, max: 250, step: 1,
    description: 'Effective background temperature the radiator radiates against when facing deep space. True deep space is ~2.7 K, but a real radiator also sees some warm structure/other spacecraft surfaces, so an effective sink above that is often used.',
  },
  earthIrTempK: {
    label: 'Earth IR temperature', unit: 'K', min: 180, max: 320, step: 1,
    description: 'Effective blackbody temperature of Earth\u2019s thermal (long-wave) emission, roughly 255 K on average \u2014 much warmer than deep space, so facing Earth increases radiator heat load.',
  },
  earthAlbedo: {
    label: 'Earth albedo', unit: '', min: 0, max: 0.9, step: 0.01,
    description: 'Fraction of incoming sunlight Earth reflects back into space (global average ~0.3). This reflected light can land on the radiator in addition to direct sunlight and Earth\u2019s own infrared.',
  },
  earthViewFactor: {
    label: 'Earth view factor', unit: '', min: 0, max: 1, step: 0.01,
    description: 'Fraction of the radiator\u2019s field of view occupied by Earth rather than deep space. A flat, nadir-pointing plate sees F = (R\u2091/(R\u2091+h))\u00b2 \u2014 close to 0.85 in low orbit, under 0.03 at geostationary altitude. Orbit presets suggest a value from this formula; radiators angled away from nadir see less and can be set lower.',
  },
  coolantDeltaT: {
    label: 'Coolant \u0394T', unit: 'K', min: 1, max: 80, step: 1,
    description: 'Allowed temperature rise of the coolant as it picks up heat from the compute payload before reaching the radiator. Larger \u0394T moves more heat for the same flow rate, but requires the payload to tolerate a hotter coolant return.',
  },
  flowRateKgS: {
    label: 'Coolant flow', unit: 'kg/s', min: 0.01, max: 1.5, step: 0.01,
    description: 'Mass flow rate of coolant around the loop. Together with \u0394T this sets the loop\u2019s sensible-heat transport ceiling (P = \u1e41\u00b7c\u209a\u00b7\u0394T); pumping more/faster coolant costs more electrical power for the pump itself (not modeled here).',
  },
  parasiticHeatW: {
    label: 'Parasitic heat', unit: 'W', min: 0, max: 500, step: 5,
    description: 'Heat from pumps, avionics, wiring losses, and other non-compute hardware that also has to be rejected through the same radiator.',
  },

  // Spacecraft / environment
  satelliteTempC: {
    label: 'Bus temperature', unit: '\u00b0C', min: -20, max: 150, step: 1,
    description: 'Illustrative bulk temperature of the spacecraft bus body (structure/avionics box), shown by its color in the 3D view. Independent of the radiator thermal calculation.',
  },
  solarLoadWm2: {
    label: 'Solar flux', unit: 'W/m\u00b2', min: 0, max: 1600, step: 10,
    description: 'Incident sunlight intensity. ~1,361 W/m\u00b2 is the solar constant near Earth; set toward 0 to represent eclipse (Earth\u2019s shadow).',
  },
  sunIncidence: {
    label: 'Sun incidence', unit: '', min: 0, max: 1, step: 0.01,
    description: 'Cosine-like factor for the angle between the radiator\u2019s surface normal and the Sun direction. 1 = sunlight hits the radiator face-on (worst case for absorbed heat); 0 = sunlight is edge-on or blocked.',
  },

  // Compute
  computeWattsRequested: {
    label: 'Requested compute power', unit: 'W', min: 0, max: 5000, step: 10,
    description: 'Continuous electrical power drawn by the onboard AI compute, almost all of which ends up as waste heat that must cross the same radiator/coolant path. For scale: an edge inference module draws tens of watts, a single H100-class GPU is ~700 W, and a GB300-class GPU is ~1,400 W \u2014 see the quick-select buttons below.',
  },
};
