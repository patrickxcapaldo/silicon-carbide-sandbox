/**
 * Silicon Carbide Imperative Sandbox UI kit.
 *
 * Import everything a module needs from here:
 *   import { ExploreCanvas, ControlsPanel, Section, ParamSlider, ... } from '../../core/ui';
 * See module-style-guide.md for the standard these components enforce.
 */
export { ExploreCanvas, ExploreMain, useExploreControls } from './ExploreCanvas';
export { ControlsPanel } from './ControlsPanel';
export { Section, Group, SegRow, SegButton, PresetButton, PresetRow, PresetList, PanelCard } from './controls';
export { ParamSlider, SliderField, ToggleField, type ParamMeta, type SliderFieldProps } from './ParamSlider';
export { InfoTip, PanelBoundsProvider } from './InfoTip';
export { Overlay, MetricGrid, Metric, StatusBadge, type StatusTone } from './Overlay';
export { DetailsPanel } from './DetailsPanel';
export { ValueBars, type ValueBar } from './ValueBars';
export { StackedBar, type StackSegment } from './StackedBar';
export { OrbitPlayback } from './OrbitPlayback';
export { Chapter, Equation, Working, Facts, CardGrid, Callout } from './Chapter';
export { downloadRunRecord, type DownloadableRunRecord } from './downloadRunRecord';
export { useResetInputs } from './useResetInputs';
export { SCENE } from './sceneTheme';
