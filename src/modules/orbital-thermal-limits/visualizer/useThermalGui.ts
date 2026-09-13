import { useEffect } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import GUI from 'lil-gui';
import type { ThermalState } from './types';

type SetThermalState = Dispatch<SetStateAction<ThermalState>>;

export function useThermalGui(state: ThermalState, setState: SetThermalState, containerRef: MutableRefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    const gui = new GUI({ title: 'Thermal + Orbit Controls', autoPlace: false, container: container ?? undefined });
    const proxy = { ...state };
    const root = gui.domElement as HTMLElement;
    root.style.position = 'absolute'; root.style.top = '16px'; root.style.right = '16px'; root.style.zIndex = '40'; root.style.maxHeight = 'calc(100% - 32px)'; root.style.overflowY = 'auto'; root.style.setProperty('--background-color', '#0b1726');
    const bind = (folder: GUI, key: keyof ThermalState, min: number, max: number, step: number, label: string) => folder.add(proxy, key, min, max, step).name(label).onChange((value: number) => setState(current => ({ ...current, [key]: value })));

    const thermal = gui.addFolder('Radiator / loop');
    bind(thermal, 'radiatorArea', 0.5, 20, 0.5, 'Radiator area m²');
    bind(thermal, 'operatingTempC', 20, 180, 1, 'Radiator temp °C');
    bind(thermal, 'emissivity', 0.5, 0.99, 0.01, 'IR emissivity ε');
    bind(thermal, 'solarAbsorptivity', 0.02, 0.8, 0.01, 'Solar absorptivity α');
    bind(thermal, 'sinkTempK', 3, 250, 1, 'Space sink K');
    bind(thermal, 'earthIrTempK', 180, 320, 1, 'Earth IR K');
    bind(thermal, 'earthAlbedo', 0, 0.9, 0.01, 'Earth albedo');
    bind(thermal, 'earthViewFactor', 0, 1, 0.01, 'Earth view factor');
    bind(thermal, 'coolantDeltaT', 1, 80, 1, 'Coolant ΔT K');
    bind(thermal, 'flowRateKgS', 0.01, 1.5, 0.01, 'Coolant flow kg/s');
    bind(thermal, 'parasiticHeatW', 0, 500, 5, 'Parasitic heat W');
    const env = gui.addFolder('Solar environment');
    bind(env, 'solarLoadWm2', 0, 1600, 10, 'Solar flux W/m²');
    bind(env, 'sunIncidence', 0, 1, 0.01, 'Sun incidence');
    const orbit = gui.addFolder('Orbit');
    bind(orbit, 'orbitAltitudeKm', 160, 2000, 10, 'Perigee altitude km');
    bind(orbit, 'orbitEccentricity', 0, 0.7, 0.01, 'Eccentricity');
    bind(orbit, 'orbitInclinationDeg', 0, 98, 1, 'Inclination °');
    bind(orbit, 'orbitRaanDeg', 0, 360, 1, 'RAAN °');
    bind(orbit, 'orbitArgumentDeg', 0, 360, 1, 'Arg. perigee °');
    bind(orbit, 'orbitPhaseDeg', 0, 360, 1, 'Orbital phase °');
    const spacecraft = gui.addFolder('Spacecraft');
    bind(spacecraft, 'satelliteTempC', -20, 150, 1, 'Bus temp °C');
    spacecraft.open(); thermal.open();
    return () => gui.destroy();
    // GUI intentionally owns its proxy; state changes are pushed through callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
