import type { SolarState } from './types';
import type { CameraFocus, ViewMode } from './SolarScene';
import { PARAM_META } from './paramMeta';
import { ControlsPanel, Group, OrbitPlayback, PresetList, PresetRow, Section, SegButton, SegRow } from '../../../core/ui';
import { ParamSlider } from './ParamSlider';
import { SCENARIO_PRESETS, type ScenarioPreset } from './scenarioPresets';
import { ORBIT_PRESETS, type OrbitPreset } from './orbitPresets';
import { SPEED_OPTIONS, formatDuration, type SpeedMultiplier } from './useOrbitClock';

type Props = {
  state: SolarState;
  onChange: <K extends keyof SolarState>(key: K, value: SolarState[K]) => void;
  onApplyScenario: (preset: ScenarioPreset) => void;
  onApplyOrbitPreset: (preset: OrbitPreset) => void;
  onReset: () => void;
  selectedScenarioId: string | null;
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
  onExport?: () => void;
};

const ORBIT_KEYS: (keyof SolarState)[] = [
  'orbitAltitudeKm',
  'orbitEccentricity',
  'orbitInclinationDeg',
  'orbitRaanDeg',
  'orbitArgumentDeg',
  'orbitPhaseDeg',
];

export function SolarControlPanel({
  state, onChange, onApplyScenario, onApplyOrbitPreset, onReset,
  selectedScenarioId, selectedOrbitPresetId,
  viewMode, setViewMode, cameraFocus, setCameraFocus,
  playing, setPlaying, speed, setSpeed, periodSeconds, secondsPerOrbitAtSpeed,
  onExport,
}: Props) {
  const orbitProgress = (((state.orbitPhaseDeg % 360) + 360) % 360) / 360;
  const slider = (key: keyof SolarState) => <ParamSlider key={key} meta={PARAM_META[key]} value={state[key]} onChange={(v) => onChange(key, v)} />;

  return (
    <ControlsPanel onExport={onExport} onReset={onReset}>
      <Group label="Scenario Presets" info="Predefined mission scenarios setting array sizing, cell technology, operational conditions, and orbit parameters.">
        <PresetList>
          {SCENARIO_PRESETS.map((scenario) => (
            <PresetRow key={scenario.id} active={selectedScenarioId === scenario.id} onClick={() => onApplyScenario(scenario)} info={scenario.blurb} infoWidth={260}>
              {scenario.name}
            </PresetRow>
          ))}
        </PresetList>
      </Group>

      <Group label="View" info="Orbit view shows the orbit and Earth to scale with eclipse shadow geometry. Close-up view shows the detailed solar array wing with cell thermal colour rendering.">
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

      <Section title="Photovoltaic Array" defaultOpen>
        {(['solarArrayAreaM2', 'baseCellEfficiency', 'cellOperatingTempC', 'tempCoefficientPwr'] as const).map(slider)}
      </Section>
      <Section title="Mission Radiation & Aging">
        {(['missionDurationYears', 'annualDegradationRate'] as const).map(slider)}
      </Section>
      <Section title="Pointing & System Efficiency">
        {(['pointingEfficiency', 'bosEfficiency', 'solarFluxWm2'] as const).map(slider)}
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
    </ControlsPanel>
  );
}
