import { SCENARIO_PRESETS } from './visualizer/scenarioPresets';
import { createRunRecord } from './runRecord';

export function createPresetResultsBundle(createdAt = new Date()) {
  return {
    schemaVersion: 1 as const,
    createdAt: createdAt.toISOString(),
    presets: SCENARIO_PRESETS.map((preset) => ({
      id: preset.id,
      label: preset.label,
      summary: preset.summary,
      explanation: preset.explanation,
      configuration: { ...preset.state },
      run: createRunRecord(preset.state, createdAt),
    })),
  };
}