import { DetailsPanel, ExploreCanvas, ExploreMain, Group, Metric, MetricGrid, ControlsPanel, ParamSlider, PresetList, PresetRow, Section, ValueBars, useResetInputs } from '../../../core/ui';
import { manifest } from '../manifest';
import { run } from '../model';
import { PARAM_META } from './paramMeta';

const SCENARIOS = [
  { id: 'small', label: 'Small Radiator', description: 'A 2 m² radiator at 300 K with a 500 W load. Comfortable.', values: { areaM2: 2, temperatureK: 300, emissivity: 0.9, loadW: 500 } },
  { id: 'hot-load', label: 'Hot Load', description: 'The same radiator asked to reject 2,000 W. It cannot, which is the point.', values: { areaM2: 2, temperatureK: 300, emissivity: 0.9, loadW: 2000 } },
];

const fmtW = (w: number) => `${Math.round(w).toLocaleString('en-GB')} W`;

type Props = { inputs: Record<string, number>; onChange: (id: string, value: number) => void; onExport: () => void };

/**
 * Explore mode, 2D variant: a main region (readouts and any chart) left of the
 * Controls panel, plus a below-canvas breakdown. For a 3D scene, put a React
 * Three Fiber <Canvas> and <Overlay>s inside <ExploreCanvas> instead of
 * <ExploreMain>; see orbital-thermal-limits/visualizer for the reference.
 */
export function ExploreView({ inputs, onChange, onExport }: Props) {
  const v = run(inputs);
  const value = (id: string) => inputs[id] ?? manifest.parameters.find((p) => p.id === id)!.defaultValue;
  const reset = useResetInputs(manifest.parameters.map((p) => ({ key: p.id, defaultValue: p.defaultValue })), inputs, onChange);
  const matches = (values: Record<string, number>) => Object.entries(values).every(([k, x]) => value(k) === x);

  return (
    <>
      <ExploreCanvas
        label="Example explorer"
        controls={
          <ControlsPanel onExport={onExport} onReset={reset}>
            <Group label="Scenario Presets" info="Each preset sets every parameter at once to a complete, worked configuration.">
              <PresetList>
                {SCENARIOS.map((s) => (
                  <PresetRow key={s.id} active={matches(s.values)} info={s.description} onClick={() => Object.entries(s.values).forEach(([k, x]) => onChange(k, x))}>
                    {s.label}
                  </PresetRow>
                ))}
              </PresetList>
            </Group>
            <Section title="Radiator" defaultOpen>
              {(['areaM2', 'temperatureK', 'emissivity'] as const).map((id) => (
                <ParamSlider key={id} meta={PARAM_META[id]} value={value(id)} onChange={(x) => onChange(id, x)} />
              ))}
            </Section>
            <Section title="Load" defaultOpen>
              <ParamSlider meta={PARAM_META.loadW} value={value('loadW')} onChange={(x) => onChange('loadW', x)} />
            </Section>
          </ControlsPanel>
        }
      >
        <ExploreMain>
          <div className="sci-view">
            <MetricGrid variant="readouts">
              <Metric label="Radiated Power" info="Power the surface can reject at this temperature." value={fmtW(v.radiatedW)} />
              <Metric label={v.marginW >= 0 ? 'Headroom' : 'Deficit'} info="Radiated power minus the heat load." value={fmtW(Math.abs(v.marginW))} status={v.marginW >= 0 ? 'safe' : 'fail'} />
              <Metric label="Load Utilisation" value={`${(v.utilisation * 100).toFixed(0)}%`} note="Above 100% the load cannot be rejected." />
            </MetricGrid>
            <p className="sci-note">Put this module&rsquo;s chart, diagram or table here. Anything drawn on this dark surface should use the --viz-* and --series-* tokens, with Orchid reserved for the single highlighted item.</p>
          </div>
        </ExploreMain>
      </ExploreCanvas>

      <DetailsPanel title="Power Balance" label="Power balance">
        <p>The vertical marker is the heat load. The highlighted bar is the smaller of the two, which is the one you hit first.</p>
        <ValueBars
          ariaLabel="Radiated power against heat load"
          bars={[
            { id: 'radiated', label: 'Radiated', value: v.radiatedW, display: fmtW(v.radiatedW) },
            { id: 'load', label: 'Load', value: v.loadW, display: fmtW(v.loadW) },
          ]}
          bindingId={v.radiatedW <= v.loadW ? 'radiated' : 'load'}
          bindingLabel="limiting"
          marker={{ value: v.loadW, legend: `heat load (${fmtW(v.loadW)})` }}
        />
      </DetailsPanel>
    </>
  );
}
