import { useEffect, useRef } from 'react';

/**
 * Returns a `reset()` that restores every input that differs from its default.
 *
 * Inputs are restored one per tick, always through the latest `onChange`.
 * Firing every onChange synchronously is unsafe: a parent that writes
 * `setInputs({ ...inputs, [id]: v })` would apply each call to the same stale
 * snapshot, so only the last one would survive and the rest of the reset would
 * be lost.
 */
export function useResetInputs(
  specs: readonly { key: string; defaultValue: number }[],
  current: Record<string, number>,
  onChange: (key: string, value: number) => void,
): () => void {
  const latestOnChange = useRef(onChange);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    latestOnChange.current = onChange;
  });
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return () => {
    window.clearTimeout(timer.current);
    const pending = specs.filter((s) => current[s.key] !== s.defaultValue);
    const step = (i: number) => {
      if (i >= pending.length) return;
      latestOnChange.current(pending[i].key, pending[i].defaultValue);
      timer.current = window.setTimeout(() => step(i + 1), 30);
    };
    step(0);
  };
}
