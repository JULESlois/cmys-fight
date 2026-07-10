export type RandomSource = () => number;

const UINT32_MAX = 0xFFFFFFFF;

export function normalizeSeed(value: number): number {
  const normalized = Number.isFinite(value) ? Math.floor(value) >>> 0 : 1;
  return normalized === 0 ? 1 : normalized;
}

export function createRandomSeed(random: RandomSource = Math.random): number {
  return normalizeSeed(Math.floor(random() * UINT32_MAX));
}

export function hashSeed(seed: number, value: string | number): number {
  let hash = normalizeSeed(seed) ^ 0x9E3779B9;
  const text = String(value);
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return normalizeSeed(hash);
}

export function createSeededRandom(seed: number): RandomSource {
  let state = normalizeSeed(seed);
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
