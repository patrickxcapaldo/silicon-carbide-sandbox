import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { meanAnomalyToTrueAnomalyRad, orbitalPeriodSeconds, trueAnomalyToMeanAnomalyRad } from './orbit';

export const SPEED_OPTIONS = [1, 10, 100, 1000, 10000] as const;
export type SpeedMultiplier = typeof SPEED_OPTIONS[number];

export function formatDuration(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '--';
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/**
 * Drives orbitPhaseDeg (true anomaly) forward in time using a real Kepler
 * two-body propagation: mean anomaly advances linearly with time, and is
 * converted to true anomaly by solving Kepler's equation. This reproduces
 * the correct non-uniform orbital speed (fast at perigee, slow at apogee)
 * for eccentric orbits, not just a constant angular rate.
 */
export function useOrbitClock(altitudeKm: number, eccentricity: number, phaseDeg: number, onPhaseChange: (nextPhaseDeg: number) => void) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<SpeedMultiplier>(100);

  const meanAnomalyRef = useRef(trueAnomalyToMeanAnomalyRad(THREE.MathUtils.degToRad(phaseDeg), eccentricity));
  const lastFrameMsRef = useRef<number | null>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const onPhaseChangeRef = useRef(onPhaseChange);
  useEffect(() => { onPhaseChangeRef.current = onPhaseChange; }, [onPhaseChange]);

  // Keep the internal mean-anomaly clock synced to the displayed phase
  // whenever paused, so pressing Play always resumes smoothly from wherever
  // the slider (or a preset) left the satellite.
  useEffect(() => {
    if (!playing) {
      meanAnomalyRef.current = trueAnomalyToMeanAnomalyRad(THREE.MathUtils.degToRad(phaseDeg), eccentricity);
    }
  }, [phaseDeg, eccentricity, playing]);

  useEffect(() => {
    if (!playing) { lastFrameMsRef.current = null; return; }
    const period = orbitalPeriodSeconds(altitudeKm, eccentricity);
    const meanMotion = (2 * Math.PI) / Math.max(1, period); // rad/s

    const tick = (nowMs: number) => {
      if (lastFrameMsRef.current == null) lastFrameMsRef.current = nowMs;
      const dtSeconds = Math.min(0.25, (nowMs - lastFrameMsRef.current) / 1000);
      lastFrameMsRef.current = nowMs;
      meanAnomalyRef.current += meanMotion * speed * dtSeconds;
      const trueAnomalyRad = meanAnomalyToTrueAnomalyRad(meanAnomalyRef.current, eccentricity);
      const deg = THREE.MathUtils.radToDeg(trueAnomalyRad);
      const normalizedDeg = ((deg % 360) + 360) % 360;
      onPhaseChangeRef.current(normalizedDeg);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, [playing, speed, altitudeKm, eccentricity]);

  const periodSeconds = orbitalPeriodSeconds(altitudeKm, eccentricity);
  const secondsPerOrbitAtSpeed = periodSeconds / speed;

  return { playing, setPlaying, speed, setSpeed, periodSeconds, secondsPerOrbitAtSpeed };
}
