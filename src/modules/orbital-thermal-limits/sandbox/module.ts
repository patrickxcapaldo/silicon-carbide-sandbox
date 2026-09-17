import {
  DIMENSIONLESS, DIM_AREA, DIM_IRRADIANCE, DIM_MASS_FLOW, DIM_POWER, DIM_TEMPERATURE,
  resolveInputs,
  type Diagnostic, type ModuleDescriptor, type ModuleResult, type PortSpec, type SandboxModule,
} from './contract';
import {
  classifyStatus, kernelWarnings, runThermalKernel,
  type ThermalKernelInputs,
} from './kernel';

/**
 * Temperature difference, as opposed to absolute temperature. Same dimension,
 * different meaning, which is exactly the case where dimension checking alone
 * is not enough and a human has to agree the connection makes sense.
 */
const DIM_TEMPERATURE_DELTA = DIM_TEMPERATURE;

export const INPUT_SPECS: PortSpec[] = [
  {
    key: 'computeWattsRequested', label: 'Requested compute power', unit: 'W', dimension: DIM_POWER,
    min: 0, max: 5000, defaultValue: 300,
    description: 'Continuous electrical power drawn by the onboard AI compute, almost all of which becomes waste heat.',
    typicalSource: 'An accelerator or datacentre workload module that converts a model size and throughput target into a power draw.',
  },
  {
    key: 'radiatorArea', label: 'Radiator area', unit: 'm²', dimension: DIM_AREA,
    min: 0.5, max: 20, defaultValue: 2,
    description: 'Total two-sided radiating area of the panels.',
    typicalSource: 'A spacecraft mass and volume budget module, since radiator area trades against launch mass and stowed volume.',
  },
  {
    key: 'operatingTempC', label: 'Radiator temperature', unit: '°C', dimension: DIM_TEMPERATURE,
    min: 20, max: 180, defaultValue: 70,
    description: 'Hot-side temperature of the radiator and coolant.',
  },
  {
    key: 'emissivity', label: 'Infrared emissivity', unit: '', dimension: DIMENSIONLESS,
    min: 0.5, max: 0.99, defaultValue: 0.9,
    description: 'How efficiently the radiator surface emits long-wave infrared.',
    typicalSource: 'A materials or surface-coatings module.',
  },
  {
    key: 'solarAbsorptivity', label: 'Solar absorptivity', unit: '', dimension: DIMENSIONLESS,
    min: 0.02, max: 0.8, defaultValue: 0.12,
    description: 'Fraction of incident sunlight the radiator coating absorbs rather than reflects.',
    typicalSource: 'A materials or surface-coatings module.',
  },
  {
    key: 'sinkTempK', label: 'Space sink temperature', unit: 'K', dimension: DIM_TEMPERATURE,
    min: 3, max: 250, defaultValue: 180,
    description: 'Effective background temperature the radiator radiates against when facing deep space.',
  },
  {
    key: 'earthIrTempK', label: 'Earth infrared temperature', unit: 'K', dimension: DIM_TEMPERATURE,
    min: 180, max: 320, defaultValue: 255,
    description: 'Effective blackbody temperature of Earth long-wave emission.',
  },
  {
    key: 'earthViewFactor', label: 'Earth view factor', unit: '', dimension: DIMENSIONLESS,
    min: 0, max: 1, defaultValue: 0.35,
    description: 'Fraction of the radiator field of view occupied by Earth rather than deep space.',
    typicalSource: 'An orbit geometry module, which can derive it from altitude and radiator pointing.',
  },
  {
    key: 'earthAlbedo', label: 'Earth albedo', unit: '', dimension: DIMENSIONLESS,
    min: 0, max: 0.9, defaultValue: 0.3,
    description: 'Fraction of incoming sunlight Earth reflects back into space.',
  },
  {
    key: 'solarLoadWm2', label: 'Solar flux', unit: 'W/m²', dimension: DIM_IRRADIANCE,
    min: 0, max: 1600, defaultValue: 1361,
    description: 'Incident sunlight intensity. Set to 0 to represent eclipse.',
    typicalSource: 'An orbit and eclipse timing module, which can supply the flux over an orbit.',
  },
  {
    key: 'sunIncidence', label: 'Sun incidence', unit: '', dimension: DIMENSIONLESS,
    min: 0, max: 1, defaultValue: 0.75,
    description: 'Cosine-like factor for the angle between the radiator normal and the Sun direction.',
    typicalSource: 'An attitude and pointing module.',
  },
  {
    key: 'flowRateKgS', label: 'Coolant flow', unit: 'kg/s', dimension: DIM_MASS_FLOW,
    min: 0.01, max: 1.5, defaultValue: 0.35,
    description: 'Mass flow rate of coolant around the loop.',
  },
  {
    key: 'coolantDeltaT', label: 'Coolant temperature rise', unit: 'K', dimension: DIM_TEMPERATURE_DELTA,
    min: 1, max: 80, defaultValue: 10,
    description: 'Allowed temperature rise of the coolant as it collects heat from the payload.',
  },
  {
    key: 'parasiticHeatW', label: 'Parasitic heat', unit: 'W', dimension: DIM_POWER,
    min: 0, max: 500, defaultValue: 40,
    description: 'Non-compute heat entering the loop, also used as a proxy for non-compute bus electrical draw.',
  },
  {
    key: 'solarPanelAreaM2', label: 'Solar array area', unit: 'm²', dimension: DIM_AREA,
    min: 0.5, max: 30, defaultValue: 4,
    description: 'Total active solar cell area across both deployed wings.',
    typicalSource: 'A spacecraft mass and volume budget module.',
  },
  {
    key: 'solarPanelEfficiency', label: 'Solar cell efficiency', unit: '', dimension: DIMENSIONLESS,
    min: 0.05, max: 0.4, defaultValue: 0.29,
    description: 'Net array electrical efficiency including cell, packing and wiring losses.',
    typicalSource: 'A photovoltaic technology module.',
  },
  {
    key: 'solarPanelPointingFactor', label: 'Solar pointing accuracy', unit: '', dimension: DIMENSIONLESS,
    min: 0, max: 1, defaultValue: 0.95,
    description: 'How well the single-axis array drive keeps the array aimed at the Sun.',
    typicalSource: 'An attitude and pointing module.',
  },
];

export const DESCRIPTOR: ModuleDescriptor = {
  id: 'orbital-thermal-limits',
  version: '1.0.0',
  title: 'Orbital thermal and power limits',
  summary: 'Steady-state heat rejection and electrical power balance for an AI compute payload on an Earth-orbiting spacecraft.',
  domains: ['thermodynamics', 'radiative heat transfer', 'orbital mechanics', 'photovoltaics'],
  inputs: INPUT_SPECS,
  outputs: [
    { key: 'maxComputeHeatW', label: 'Maximum compute heat', unit: 'W', dimension: DIM_POWER, kind: 'quantity', description: 'Continuous compute heat that can be transported and rejected after environmental and parasitic loads.' },
    { key: 'radiativeRejectionW', label: 'Gross radiative rejection', unit: 'W', dimension: DIM_POWER, kind: 'quantity', description: 'Net long-wave radiation leaving the radiator before absorbed external loads.' },
    { key: 'externalHeatW', label: 'External thermal load', unit: 'W', dimension: DIM_POWER, kind: 'quantity', description: 'Solar and albedo power absorbed by the radiator.' },
    { key: 'absorbedSolarW', label: 'Absorbed direct solar', unit: 'W', dimension: DIM_POWER, kind: 'quantity', description: 'Direct sunlight absorbed by the radiator surface.' },
    { key: 'absorbedAlbedoW', label: 'Absorbed albedo', unit: 'W', dimension: DIM_POWER, kind: 'quantity', description: 'Reflected sunlight from Earth absorbed by the radiator.' },
    { key: 'absorbedEarthIrW', label: 'Absorbed Earth infrared', unit: 'W', dimension: DIM_POWER, kind: 'quantity', description: 'Earth long-wave emission absorbed by the radiator, already reflected in the rejection figure.' },
    { key: 'transportCapacityW', label: 'Coolant transport capacity', unit: 'W', dimension: DIM_POWER, kind: 'quantity', description: 'Sensible heat transport ceiling of the coolant loop.' },
    { key: 'netRadiatorCapacityW', label: 'Net radiator capacity', unit: 'W', dimension: DIM_POWER, kind: 'quantity', description: 'Radiative rejection remaining after external and parasitic loads.' },
    { key: 'radiatorFluxWm2', label: 'Radiator heat flux', unit: 'W/m²', dimension: DIM_IRRADIANCE, kind: 'quantity', description: 'Gross radiative rejection per square metre of radiator area.' },
    { key: 'computeDeficitW', label: 'Compute thermal deficit', unit: 'W', dimension: DIM_POWER, kind: 'quantity', description: 'Requested compute power minus the rejectable heat ceiling. Positive means thermally unsustainable.' },
    { key: 'generatedPowerW', label: 'Solar array power', unit: 'W', dimension: DIM_POWER, kind: 'quantity', description: 'Electrical power produced by the solar array.' },
    { key: 'busElectricalLoadW', label: 'Bus electrical load', unit: 'W', dimension: DIM_POWER, kind: 'quantity', description: 'Requested compute power plus non-compute bus draw.' },
    { key: 'powerDeficitW', label: 'Electrical power deficit', unit: 'W', dimension: DIM_POWER, kind: 'quantity', description: 'Bus electrical load minus array generation. Positive means the array cannot supply the load.' },
    { key: 'computeUtilisation', label: 'Thermal budget utilisation', unit: '', dimension: DIMENSIONLESS, kind: 'indicator', description: 'Requested compute power as a fraction of the rejectable heat ceiling.' },
    { key: 'powerUtilisation', label: 'Power budget utilisation', unit: '', dimension: DIMENSIONLESS, kind: 'indicator', description: 'Bus electrical load as a fraction of array generation.' },
    { key: 'overallUtilisation', label: 'Binding utilisation', unit: '', dimension: DIMENSIONLESS, kind: 'indicator', description: 'The worse of the thermal and power utilisations, which determines the status.' },
  ],
  assumptions: [
    'Steady state only. There is no thermal mass, no transient temperature response and no battery state of charge, so a configuration is either sustainable indefinitely or it is not.',
    'The Earth view factor is supplied as an input rather than derived from radiator geometry and attitude during flight.',
    'The coolant loop is a single-phase, water-like sensible heat transport with a fixed specific heat of 4180 J/kg·K. There is no two-phase behaviour and no pump power cost.',
    'Parasitic heat is reused as a proxy for non-compute bus electrical draw, on the basis that electrical power in and waste heat out are close for electronic loads.',
    'Compute electrical power is assumed to convert entirely to waste heat.',
    'Radiator temperature is uniform, with no gradients, conduction paths or multi-node spacecraft network.',
    'Optical properties are grey, meaning emissivity and absorptivity do not vary with wavelength.',
  ],
};

export type OrbitalThermalOutputs = {
  maxComputeHeatW: number;
  radiativeRejectionW: number;
  externalHeatW: number;
  absorbedSolarW: number;
  absorbedAlbedoW: number;
  absorbedEarthIrW: number;
  transportCapacityW: number;
  netRadiatorCapacityW: number;
  radiatorFluxWm2: number;
  computeDeficitW: number;
  generatedPowerW: number;
  busElectricalLoadW: number;
  powerDeficitW: number;
  computeUtilisation: number;
  powerUtilisation: number;
  overallUtilisation: number;
};

export type OrbitalThermalResult = ModuleResult<OrbitalThermalOutputs> & {
  /** Human-facing classification, derived from the same numbers. */
  status: ReturnType<typeof classifyStatus>;
};

export type OrbitalThermalModule = Omit<SandboxModule<OrbitalThermalOutputs>, 'run'> & {
  run(inputs: Partial<Record<string, number>>): OrbitalThermalResult;
};

/**
 * The module's public, composable entry point. Everything else in the project,
 * including the 3D visualisation and the host framework adapter, goes through
 * this or through the kernel directly.
 */
export const orbitalThermalLimits: OrbitalThermalModule = {
  descriptor: DESCRIPTOR,
  run(inputs: Partial<Record<string, number>>): OrbitalThermalResult {
    const { resolved, diagnostics } = resolveInputs(INPUT_SPECS, inputs);
    const kernelInputs = resolved as unknown as ThermalKernelInputs;
    const out = runThermalKernel(kernelInputs);
    const status = classifyStatus(out);

    const allDiagnostics: Diagnostic[] = [
      ...diagnostics,
      ...kernelWarnings(kernelInputs, out).map((message): Diagnostic => ({ severity: 'warning', message })),
    ];

    return {
      values: {
        maxComputeHeatW: out.maxComputeHeatW,
        radiativeRejectionW: out.radiativeRejectionW,
        externalHeatW: out.externalHeatW,
        absorbedSolarW: out.absorbedSolarW,
        absorbedAlbedoW: out.absorbedAlbedoW,
        absorbedEarthIrW: out.absorbedEarthIrW,
        transportCapacityW: out.transportCapacityW,
        netRadiatorCapacityW: out.netRadiatorCapacityW,
        radiatorFluxWm2: out.radiatorFluxWm2,
        computeDeficitW: out.computeDeficitW,
        generatedPowerW: out.generatedPowerW,
        busElectricalLoadW: out.busElectricalLoadW,
        powerDeficitW: out.powerDeficitW,
        computeUtilisation: out.computeUtilisation,
        powerUtilisation: out.powerUtilisation,
        overallUtilisation: out.overallUtilisation,
      },
      diagnostics: allDiagnostics,
      resolvedInputs: resolved,
      status,
    };
  },
};
