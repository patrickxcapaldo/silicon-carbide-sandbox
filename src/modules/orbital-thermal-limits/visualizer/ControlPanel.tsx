import type { ThermalState } from './types';
import type { CameraFocus, ViewMode } from './ThermalScene';
import { ControlsPanel, Group, OrbitPlayback, PresetList, PresetRow, Section, SegButton, SegRow } from '../../../core/ui';
import { ParamSlider } from './ParamSlider';
import { PARAM_META } from './paramMeta';
import { ORBIT_PRESETS, type OrbitPreset } from './orbitPresets';
import { SCENARIO_PRESETS, type ScenarioPreset } from './scenarioPresets';
import { COMPUTE_REFERENCES } from './computeReference';
import { SPEED_OPTIONS, formatDuration, type SpeedMultiplier } from './useOrbitClock';

type Props = {
  state: ThermalState;
  onChange: (key: keyof ThermalState, value: number) => void;
  onApplyOrbitPreset: (preset: OrbitPreset) => void;
  onApplyScenario: (scenario: ScenarioPreset) => void;
  onExport?: () => void;
  onReset?: () => void;
  /** Id of the scenario preset that produced the current state exactly, or null if none does (including after any manual edit). */
  selectedScenarioId: string | null;
  /** Id of the orbit preset whose fields the current state still matches exactly, or null if none does. */
  selectedOrbitPresetId: string | null;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  cameraFocus: CameraFocus;
  setCameraFocus: (f: CameraFocus) => void;
  playing: boolean;
  setPlaying: (p: boolean) => void;
  speed: SpeedMultiplier;
  setSpeed: (s: SpeedMultiplier) => void;
  periodSeconds: number;
  secondsPerOrbitAtSpeed: number;
};

const ORBIT_KEYS: (keyof ThermalState)[] = ['orbitAltitudeKm', 'orbitEccentricity', 'orbitInclinationDeg', 'orbitRaanDeg', 'orbitArgumentDeg', 'orbitPhaseDeg'];
const RADIATOR_KEYS: (keyof ThermalState)[] = ['radiatorArea', 'operatingTempC', 'emissivity', 'solarAbsorptivity', 'sinkTempK', 'earthIrTempK', 'earthAlbedo', 'earthViewFactor', 'coolantDeltaT', 'flowRateKgS', 'parasiticHeatW'];
const SOLAR_KEYS: (keyof ThermalState)[] = ['solarPanelAreaM2', 'solarPanelEfficiency', 'solarPanelPointingFactor'];
const ENV_KEYS: (keyof ThermalState)[] = ['solarLoadWm2', 'sunIncidence'];
const SPACECRAFT_KEYS: (keyof ThermalState)[] = ['satelliteTempC'];

export function ControlPanel({
  state, onChange, onApplyOrbitPreset, onApplyScenario, onExport, onReset,
  selectedScenarioId, selectedOrbitPresetId,
  viewMode, setViewMode, cameraFocus, setCameraFocus,
  playing, setPlaying, speed, setSpeed, periodSeconds, secondsPerOrbitAtSpeed,
}: Props) {
  const orbitProgress = ((state.orbitPhaseDeg % 360) + 360) % 360 / 360;
  const slider = (key: keyof ThermalState) => <ParamSlider key={key} meta={PARAM_META[key]} value={state[key]} onChange={(v) => onChange(key, v)} />;

  return (
    <ControlsPanel onExport={onExport} onReset={onReset}>
      <Group label="Scenario Presets" info="Each one sets every parameter at once to a complete, verified configuration that illustrates a specific outcome. The explainer above the simulation describes each of them in more detail.">
        <PresetList>
          {SCENARIO_PRESETS.map((scenario) => (
            <PresetRow key={scenario.id} active={selectedScenarioId === scenario.id} onClick={() => onApplyScenario(scenario)} info={scenario.explanation} infoWidth={260}>
              {scenario.label}
            </PresetRow>
          ))}
        </PresetList>
      </Group>

      <Group label="View" info="Orbit view shows the altitude and orbital path to scale, with the spacecraft drawn as a small marker. An accurately scaled satellite would either be an invisible speck or, if enlarged enough to see, would pass straight through the Earth. Close-up view shows the spacecraft at full component detail, with Earth as a schematic backdrop that is not to scale.">
        <SegRow>
          <SegButton active={viewMode === 'orbit'} onClick={() => setViewMode('orbit')}>Orbit</SegButton>
          <SegButton active={viewMode === 'closeup'} onClick={() => setViewMode('closeup')}>Close-up</SegButton>
        </SegRow>
      </Group>

      <Group label="Camera Focus">
        <SegRow>
          {viewMode === 'orbit' && <SegButton active={cameraFocus === 'earth'} onClick={() => setCameraFocus('earth')}>Earth</SegButton>}
          <SegButton active={viewMode === 'closeup' || cameraFocus === 'satellite'} onClick={() => setCameraFocus('satellite')}>Satellite</SegButton>
        </SegRow>
      </Group>

      <OrbitPlayback
        playing={playing}
        setPlaying={setPlaying}
        speed={speed}
        setSpeed={(s) => setSpeed(s as SpeedMultiplier)}
        speedOptions={SPEED_OPTIONS}
        period={formatDuration(periodSeconds)}
        progress={orbitProgress}
        secondsPerOrbit={formatDuration(secondsPerOrbitAtSpeed)}
      />

      <Section title="AI Compute Load" defaultOpen>
        {slider('computeWattsRequested')}
        <PresetList>
          {COMPUTE_REFERENCES.map((ref) => (
            <PresetRow key={ref.id} active={state.computeWattsRequested === ref.watts} onClick={() => onChange('computeWattsRequested', ref.watts)} info={ref.note} infoWidth={240}>
              {ref.label} {'\u2014'} {ref.watts.toLocaleString('en-GB')} W
            </PresetRow>
          ))}
        </PresetList>
      </Section>

      <Section title="Orbit">
        <Group label="Orbit Presets">
          <PresetList>
            {ORBIT_PRESETS.map((preset) => (
              <PresetRow key={preset.id} active={selectedOrbitPresetId === preset.id} onClick={() => onApplyOrbitPreset(preset)} info={preset.blurb}>
                {preset.label}
              </PresetRow>
            ))}
          </PresetList>
        </Group>
        {ORBIT_KEYS.map((key) => (
          <ParamSlider
            key={key}
            meta={PARAM_META[key]}
            value={state[key]}
            onChange={(v) => onChange(key, v)}
            disabled={key === 'orbitPhaseDeg' && playing}
            disabledHint="Playing. Pause to set the orbital phase manually."
          />
        ))}
      </Section>

      <Section title="Solar Array / Power">{SOLAR_KEYS.map(slider)}</Section>
      <Section title="Radiator / Coolant Loop">{RADIATOR_KEYS.map(slider)}</Section>
      <Section title="Solar Environment">{ENV_KEYS.map(slider)}</Section>
      <Section title="Spacecraft">{SPACECRAFT_KEYS.map(slider)}</Section>
    </ControlsPanel>
  );
}
