import { runSolarKernel, type SolarKernelInputs, type SolarKernelOutputs } from '../sandbox/kernel';
import { formatWatts, formatPercent } from '../visualizer/format';

export type LossCategory = 'eclipse' | 'thermal' | 'radiation';

export type SolarLossBreakdown = {
  /** Unconstrained STC generation in direct sunlight before temp, radiation and eclipse (W) */
  unconstrainedBolW: number;
  /** Power loss due to cell equilibrium temperature above 28 °C (W) */
  thermalLossW: number;
  /** Power loss due to cumulative mission radiation fluence and aging (W) */
  radiationLossW: number;
  /** Power loss due to time spent in Earth shadow (W) */
  eclipseLossW: number;
  /** Final orbit-averaged bus power (W) */
  orbitAveragePowerW: number;
  /** Which loss mechanism is the largest */
  dominantLoss: LossCategory;
  /** Relative percentage gap between largest and second largest loss */
  gapPct: number;
  /** Full kernel outputs */
  kernelOutputs: SolarKernelOutputs;
};

export function computeLosses(inputs: SolarKernelInputs): SolarLossBreakdown {
  const o = runSolarKernel(inputs);

  // Unconstrained BOL power at STC 28 °C with declared BOS and pointing factors
  const unconstrainedBolW = o.beginningOfLifePowerW;

  // 1. Thermal loss: power lost because cells run at T_cell rather than STC 28 °C
  // o.temperatureDerateFactor = 1 + gamma * (T - 28)
  const thermalLossW = Math.max(0, unconstrainedBolW * (1 - o.temperatureDerateFactor));
  const postThermalPowerW = unconstrainedBolW - thermalLossW;

  // 2. Radiation loss: power lost from cumulative radiation aging over mission duration
  const radiationLossW = Math.max(0, postThermalPowerW * (1 - o.radiationDerateFactor));

  // 3. Eclipse loss: difference between full-sunlight generation and orbit average
  const eclipseLossW = Math.max(0, o.instantaneousSunlitPowerW * (1 - o.orbitSunlitFraction));

  const losses: Record<LossCategory, number> = {
    eclipse: eclipseLossW,
    thermal: thermalLossW,
    radiation: radiationLossW,
  };

  const sorted = (Object.entries(losses) as [LossCategory, number][]).sort((a, b) => b[1] - a[1]);
  const dominantLoss = sorted[0][0];
  const largestVal = sorted[0][1];
  const secondVal = sorted[1][1];

  const gapPct = secondVal > 0 ? ((largestVal - secondVal) / secondVal) * 100 : (largestVal > 0 ? 100 : 0);

  return {
    unconstrainedBolW,
    thermalLossW,
    radiationLossW,
    eclipseLossW,
    orbitAveragePowerW: o.orbitAveragePowerW,
    dominantLoss,
    gapPct,
    kernelOutputs: o,
  };
}

export function formatLoss(lossW: number, baseW: number): string {
  const pct = baseW > 0 ? formatPercent(lossW / baseW) : '0%';
  return `${formatWatts(lossW)} (-${pct})`;
}
