export type SeededRandom = (() => number) & { seed: string };

export function normaliseSeed(seed: string): string {
  const cleaned = seed.trim().toUpperCase();
  if (!cleaned || !/^[0-9A-Z]{1,12}$/.test(cleaned)) {
    throw new Error('Seed must contain one to twelve letters or digits.');
  }
  return cleaned;
}

export function createSeededRng(seed: string): SeededRandom {
  const normalised = normaliseSeed(seed);
  let state = 2166136261;
  for (const character of normalised) {
    state ^= character.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }

  const rng = (() => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }) as SeededRandom;
  rng.seed = normalised;
  return rng;
}

export function createRandomSeed(): string {
  return Math.floor(Math.random() * 36 ** 6).toString(36).toUpperCase().padStart(6, '0');
}

export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}
