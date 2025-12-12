/**
 * Simple deterministic RNG for engine tests. Uses a linear congruential generator.
 */
export const createDeterministicRng = (seed: number) => {
  let current = seed >>> 0;
  return () => {
    current = (current * 1664525 + 1013904223) % 4294967296;
    return current / 4294967296;
  };
};
