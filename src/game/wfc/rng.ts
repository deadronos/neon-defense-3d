/**
 * Simple Mulberry32 seeded random number generator.
 * Fast and adequate for game procedural generation.
 */
export const createRNG = (seedStr: string) => {
  // Hash the seed string to get a starting numeric seed
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed + seedStr.charCodeAt(i)) | 0; // Force 32-bit integer
    seed = Math.imul(seed ^ (seed >>> 15), 0x1acb72cc); // Mix
  }

  return {
    /**
     * Returns a float between 0 (inclusive) and 1 (exclusive).
     */
    next: (): number => {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },

    /**
     * Returns an integer between min (inclusive) and max (exclusive).
     */
    range: (min: number, max: number): number => {
      return Math.floor(createRNG(seedStr).next() * (max - min)) + min;
    },
    
    /**
     * Re-seed the generator (if needed for chained generation).
     * NOTE: The closure captures 'seed', so this mutator is local.
     */
    // eslint-disable-next-line no-return-assign
    fork: (suffix: string) => createRNG(seedStr + suffix),
  };
};

export type RNG = ReturnType<typeof createRNG>;
