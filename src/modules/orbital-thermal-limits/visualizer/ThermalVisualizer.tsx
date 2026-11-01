import { Canvas } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { orbitalThermalLimits } from '../sandbox/module';
import { ThermalScene, type CameraFocus, type ViewMode } from './ThermalScene';
import { ControlPanel } from './ControlPanel';
import { StatusBadge } from './StatusBadge';
import { DetailsPanel, ExploreCanvas, Metric, MetricGrid, Overlay } from '../../../core/ui';
import { useOrbitClock } from './useOrbitClock';
import { nadirEarthViewFactor } from './orbit';
import { DAWN_DUSK_SSO_ORBIT } from '../sandbox/orbitalMechanics';
import { formatWatts } from './format';
import { ORBIT_PRESETS, type OrbitPreset } from './orbitPresets';
import type { ScenarioPreset } from './scenarioPresets';
import type { ThermalDerived, ThermalState } from './types';
import { CeilingBars } from '../challenge/CeilingBars';

const INITIAL_STATE: ThermalState = {
  satelliteTempC: 45, operatingTempC: 70, radiatorArea: 2, emissivity: 0.9, solarAbsorptivity: 0.12,
  sinkTempK: 180, earthIrTempK: 255, earthViewFactor: 0.35, earthAlbedo: 0.30,
  solarLoadWm2: 700, sunIncidence: 0.75, flowRateKgS: 0.35, coolantDeltaT: 10, parasiticHeatW: 40,
  computeWattsRequested: 300, solarPanelAreaM2: 4, solarPanelEfficiency: 0.29, solarPanelPointingFactor: 0.95,
  ...DAWN_DUSK_SSO_ORBIT,
};

type ThermalVisualizerProps = { initialState?: Partial<ThermalState>; onStateChange?: (state: ThermalState) => void; onExport?: () => void; };

export function ThermalVisualizer({ initialState = INITIAL_STATE, onStateChange, onExport }: ThermalVisualizerProps) {
  const [state, setState] = useState<ThermalState>({ ...INITIAL_STATE, ...initialState });
  const [viewMode, setViewMode] = useState<ViewMode>('orbit');
  const [cameraFocus, setCameraFocus] = useState<CameraFocus>('earth');

  const handleViewModeChange = useCallback((nextViewMode: ViewMode) => {
    setViewMode(nextViewMode);
    if (nextViewMode === 'closeup') setCameraFocus('satellite');
  }, []);

  // Tracks which preset button, if any, produced the current state exactly,
  // so the controls panel can highlight it. Set only by applyOrbitPreset /
  // applyScenario below and cleared by handleChange whenever the person
  // edits a slider the preset in question actually sets -- never by
  // handlePhaseChange, so playback advancing orbitPhaseDeg does not itself
  // clear a scenario or orbit preset's highlight.
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [selectedOrbitPresetId, setSelectedOrbitPresetId] = useState<string | null>(() => {
    const dawnDusk = ORBIT_PRESETS.find((preset) => preset.id === 'leo-dawn-dusk-sso');
    return dawnDusk &&
      state.orbitAltitudeKm === dawnDusk.altitudeKm &&
      state.orbitEccentricity === dawnDusk.eccentricity &&
      state.orbitInclinationDeg === dawnDusk.inclinationDeg &&
      state.orbitRaanDeg === dawnDusk.raanDeg &&
      state.orbitArgumentDeg === dawnDusk.argumentDeg &&
      state.orbitPhaseDeg === dawnDusk.phaseDeg
      ? dawnDusk.id
      : null;
  });

  const setStateWithCallback: Dispatch<SetStateAction<ThermalState>> = useCallback((update) => setState(current => {
    const next = typeof update === 'function' ? (update as (s: ThermalState) => ThermalState)(current) : update;
    onStateChange?.(next); return next;
  }), [onStateChange]);

  // Fields applyOrbitPreset itself sets (including the derived Earth view
  // factor); only these should drop the orbit-preset highlight on edit.
  const ORBIT_PRESET_FIELDS = useMemo(
    () => new Set<keyof ThermalState>(['orbitAltitudeKm', 'orbitEccentricity', 'orbitInclinationDeg', 'orbitRaanDeg', 'orbitArgumentDeg', 'orbitPhaseDeg', 'earthViewFactor']),
    [],
  );

  const handleChange = useCallback((key: keyof ThermalState, value: number) => {
    // A scenario preset sets every field at once, so editing any one of
    // them by hand means the state is no longer exactly that scenario.
    setSelectedScenarioId(null);
    if (ORBIT_PRESET_FIELDS.has(key)) setSelectedOrbitPresetId(null);
    setStateWithCallback(current => ({ ...current, [key]: value }));
  }, [setStateWithCallback, ORBIT_PRESET_FIELDS]);

  const lastSyncRef = useRef(0);
  const handlePhaseChange = useCallback((nextPhaseDeg: number) => {
    // The animation drives this at up to 60 updates/sec. Update the local,
    // visual copy of state every frame (cheap, keeps motion smooth), but
    // only forward it to the host's onStateChange/onChange a few times a
    // second -- flooding the host callback at 60Hz was the root cause of
    // playback randomly stalling (whatever the host does in response --
    // re-render, persist, recompute -- was racing the animation loop).
    setState(current => {
      const next = { ...current, orbitPhaseDeg: nextPhaseDeg };
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (now - lastSyncRef.current > 350) {
        lastSyncRef.current = now;
        onStateChange?.(next);
      }
      return next;
    });
  }, [onStateChange]);

  const { playing, setPlaying, speed, setSpeed, periodSeconds, secondsPerOrbitAtSpeed } =
    useOrbitClock(state.orbitAltitudeKm, state.orbitEccentricity, state.orbitPhaseDeg, handlePhaseChange);

  // Give the host one authoritative, un-throttled update whenever playback
  // stops, so it's never left holding a stale mid-orbit phase from the
  // throttling above.
  const wasPlayingRef = useRef(playing);
  useEffect(() => {
    if (wasPlayingRef.current && !playing) onStateChange?.(state);
    wasPlayingRef.current = playing;
  }, [playing, state, onStateChange]);

  const applyOrbitPreset = useCallback((preset: OrbitPreset) => {
    setPlaying(false);
    setSelectedOrbitPresetId(preset.id);
    // An orbit preset only overwrites the orbit fields, not a whole
    // scenario, so whatever scenario was previously selected (if any) no
    // longer matches the full state and should stop being highlighted.
    setSelectedScenarioId(null);
    setStateWithCallback(current => ({
      ...current,
      orbitAltitudeKm: preset.altitudeKm,
      orbitEccentricity: preset.eccentricity,
      orbitInclinationDeg: preset.inclinationDeg,
      orbitRaanDeg: preset.raanDeg,
      orbitArgumentDeg: preset.argumentDeg,
      orbitPhaseDeg: preset.phaseDeg,
      // Seed a geometrically-consistent Earth view factor for a nadir-pointing
      // radiator at this altitude; still manually adjustable afterward.
      earthViewFactor: parseFloat(nadirEarthViewFactor(preset.altitudeKm).toFixed(2)),
    }));
  }, [setPlaying, setStateWithCallback]);

  const applyScenario = useCallback((scenario: ScenarioPreset) => {
    setPlaying(false);
    setSelectedScenarioId(scenario.id);
    const matchingOrbitPreset = ORBIT_PRESETS.find((preset) =>
      scenario.state.orbitAltitudeKm === preset.altitudeKm &&
      scenario.state.orbitEccentricity === preset.eccentricity &&
      scenario.state.orbitInclinationDeg === preset.inclinationDeg &&
      scenario.state.orbitRaanDeg === preset.raanDeg &&
      scenario.state.orbitArgumentDeg === preset.argumentDeg &&
      scenario.state.orbitPhaseDeg === preset.phaseDeg,
    );
    setSelectedOrbitPresetId(matchingOrbitPreset?.id ?? null);
    setStateWithCallback(() => ({ ...scenario.state }));
  }, [setPlaying, setStateWithCallback]);

  const handleReset = useCallback(() => {
    setPlaying(false);
    setSelectedScenarioId(null);
    const dawnDusk = ORBIT_PRESETS.find((preset) => preset.id === 'leo-dawn-dusk-sso');
    setSelectedOrbitPresetId(dawnDusk ? dawnDusk.id : null);
    setStateWithCallback({ ...INITIAL_STATE, ...initialState });
  }, [setPlaying, setStateWithCallback, initialState]);

  const derived = useMemo<ThermalDerived>(() => {
    // Single source of truth: the same kernel the headless module and the
    // host adapter use, at full precision. Nothing here recomputes physics,
    // and the status thresholds live in the kernel rather than the UI.
    const result = orbitalThermalLimits.run(state as unknown as Record<string, number>);
    const v = result.values;
    return {
      radiatorPowerW: v.radiativeRejectionW,
      radiatorFluxWm2: v.radiatorFluxWm2,
      absorbedSolarW: v.absorbedSolarW,
      absorbedAlbedoW: v.absorbedAlbedoW,
      absorbedEarthIrW: v.absorbedEarthIrW,
      externalHeatW: v.externalHeatW,
      transportCapacityW: v.transportCapacityW,
      netRadiatorCapacityW: v.netRadiatorCapacityW,
      powerCeilingW: v.generatedPowerW - result.resolvedInputs.parasiticHeatW,
      netCapacityW: v.maxComputeHeatW,
      computeWattsRequested: result.resolvedInputs.computeWattsRequested,
      computeDeficitW: v.computeDeficitW,
      computeUtilization: v.computeUtilisation,
      generatedPowerW: v.generatedPowerW,
      instantaneousGeneratedPowerW: v.instantaneousGeneratedPowerW,
      orbitSunlitFraction: v.orbitSunlitFraction,
      powerDeficitW: v.powerDeficitW,
      powerUtilization: v.powerUtilisation,
      status: result.status,
    };
  }, [state]);

  const metric = (value: number) => formatWatts(value);

  const TELEMETRY_INFO = {
    requestedCompute: 'The AI compute electrical power set with the "Requested compute power" slider. Almost all of it ultimately has to leave the spacecraft as heat.',
    heatLimit: 'The most heat the radiator and coolant loop can currently reject, given the environment and settings. This is the thermal ceiling for requested compute power.',
    thermalMargin: 'How much spare heat-rejection capacity is left (headroom), or by how much the requested compute would exceed the thermal ceiling (deficit).',
    arrayPower: 'Electrical power the solar array generates, averaged over the whole orbit including the fraction spent in Earth\u2019s shadow. This, not the instantaneous full-sun figure, is what a continuous compute load is actually checked against.',
    sunlitFraction: 'Percentage of the orbit, by time, spent in sunlight rather than Earth\u2019s shadow, computed from the orbit\u2019s altitude, eccentricity, inclination and orientation against a fixed Sun direction. Changing the orbit sliders changes this, and so changes the power budget.',
    powerMargin: 'How much spare electrical generation is left (headroom), or by how much the requested load would exceed what the array can generate on average across the orbit (deficit). No battery is modelled, so this does not mean the load can run through eclipse itself.',
    coolantCapacity: 'The maximum heat the coolant loop can physically move from the compute payload to the radiator, based on flow rate and allowed temperature rise. The lower of this and the heat limit above sets the actual ceiling.',
  };

  return <>
    <ExploreCanvas
      label="Orbital thermal explorer"
      controls={
        <ControlPanel
          state={state}
          onChange={handleChange}
          onApplyOrbitPreset={applyOrbitPreset}
          onApplyScenario={applyScenario}
          onExport={onExport}
          onReset={handleReset}
          selectedScenarioId={selectedScenarioId}
          selectedOrbitPresetId={selectedOrbitPresetId}
          viewMode={viewMode}
          setViewMode={handleViewModeChange}
          cameraFocus={cameraFocus}
          setCameraFocus={setCameraFocus}
          playing={playing}
          setPlaying={setPlaying}
          speed={speed}
          setSpeed={setSpeed}
          periodSeconds={periodSeconds}
          secondsPerOrbitAtSpeed={secondsPerOrbitAtSpeed}
        />
      }
    >
      <Canvas shadows dpr={[1, 2]} camera={{ position: [8.4, 6.4, 9.2], fov: 45, near: 0.05, far: 120 }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
        <Suspense fallback={null}><ThermalScene state={state} derived={derived} viewMode={viewMode} cameraFocus={cameraFocus} /></Suspense>
      </Canvas>

      <Overlay variant="intro" title="Orbital Thermal Balance">
        {viewMode === 'orbit'
          ? 'Earth and the orbit are drawn to scale, and the spacecraft is shown as a small marker so that it does not pass through the surface. Switch to Close-up to inspect it.'
          : 'Close-up view showing the spacecraft at full detail. Earth is a schematic backdrop and is not positioned to scale.'}
      </Overlay>

      <Overlay variant="telemetry" title="Thermal Telemetry" label="Thermal telemetry">
        <MetricGrid>
          <Metric label="Requested Compute" info={TELEMETRY_INFO.requestedCompute} value={metric(derived.computeWattsRequested)} />
          <Metric label="Compute Heat Limit" info={TELEMETRY_INFO.heatLimit} value={metric(derived.netCapacityW)} />
          <Metric label={derived.computeDeficitW > 0 ? 'Thermal Deficit' : 'Thermal Headroom'} info={TELEMETRY_INFO.thermalMargin} value={metric(Math.abs(derived.computeDeficitW))} status={derived.computeDeficitW > 0 ? 'fail' : 'safe'} />
          <Metric label="Solar Array Power" info={TELEMETRY_INFO.arrayPower} value={metric(derived.generatedPowerW)} />
          <Metric label="Orbit Sunlit Fraction" info={TELEMETRY_INFO.sunlitFraction} value={`${(derived.orbitSunlitFraction * 100).toFixed(0)}%`} />
          <Metric label={derived.powerDeficitW > 0 ? 'Power Deficit' : 'Power Headroom'} info={TELEMETRY_INFO.powerMargin} value={metric(Math.abs(derived.powerDeficitW))} status={derived.powerDeficitW > 0 ? 'fail' : 'safe'} />
          <Metric label="Coolant Capacity" info={TELEMETRY_INFO.coolantCapacity} value={metric(derived.transportCapacityW)} />
          <Metric label="Status" value={<StatusBadge status={derived.status} />} />
        </MetricGrid>
      </Overlay>
    </ExploreCanvas>
    <DetailsPanel title="Compute Ceilings" label="Compute ceilings">
      <p>The vertical marker is the requested compute. The highlighted bar is the lowest ceiling, which is the one you hit first.</p>
      <CeilingBars
        evaluation={{
          answerId: derived.netRadiatorCapacityW <= derived.transportCapacityW && derived.netRadiatorCapacityW <= derived.powerCeilingW
            ? 'radiator'
            : derived.transportCapacityW <= derived.powerCeilingW ? 'coolant' : 'power',
          values: {
            radiator: derived.netRadiatorCapacityW,
            coolant: derived.transportCapacityW,
            power: derived.powerCeilingW,
          },
          gapPct: 0,
          diagnostics: [],
          status: derived.status,
        }}
        requestedLoad={derived.computeWattsRequested}
      />
    </DetailsPanel>
  </>;
}
