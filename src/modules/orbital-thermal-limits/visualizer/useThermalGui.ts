import { useEffect } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import GUI from 'lil-gui';
import type { ThermalState } from './types';

type SetThermalState = Dispatch<SetStateAction<ThermalState>>;

export function useThermalGui(
  state: ThermalState,
  setState: SetThermalState,
  containerRef: MutableRefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const container = containerRef.current;
    const gui = new GUI({
      title: 'Thermal Simulation',
      autoPlace: false,
      container: container ?? undefined,
    });
    const proxy = { ...state };

    const guiRoot = gui.domElement as HTMLElement;
    guiRoot.style.position = 'absolute';
    guiRoot.style.top = '16px';
    guiRoot.style.right = '16px';
    guiRoot.style.zIndex = '40';
    guiRoot.style.maxHeight = 'calc(100% - 32px)';
    guiRoot.style.overflowY = 'auto';

    const bind = (
      key: keyof ThermalState,
      min: number,
      max: number,
      step: number,
      label: string,
    ) => {
      gui.add(proxy, key, min, max, step)
        .name(label)
        .onChange((value: number) => {
          setState((current) => ({ ...current, [key]: value }));
        });
    };

    bind('satelliteTempC', -20, 150, 1, 'Satellite Temp °C');
    bind('operatingTempC', 20, 120, 1, 'Fluid Temp °C');
    bind('radiatorArea', 0.5, 20, 0.5, 'Radiator Area m²');
    bind('solarLoadWm2', 0, 1600, 10, 'Solar Load W/m²');

    const advanced = gui.addFolder('Advanced');
    advanced.add(proxy, 'emissivity', 0.5, 0.98, 0.01)
      .name('Emissivity ε')
      .onChange((value: number) => setState((s) => ({ ...s, emissivity: value })));
    advanced.add(proxy, 'sinkTempK', 3, 250, 1)
      .name('Sink Temp K')
      .onChange((value: number) => setState((s) => ({ ...s, sinkTempK: value })));
    advanced.add(proxy, 'flowRateKgS', 0.02, 1.5, 0.01)
      .name('Flow Rate kg/s')
      .onChange((value: number) => setState((s) => ({ ...s, flowRateKgS: value })));

    return () => gui.destroy();
    // GUI owns its proxy state after mount; React state updates are triggered from GUI.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
