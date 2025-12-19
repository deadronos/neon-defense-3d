/**
 * Manages a Structure of Arrays (SOA) for high-performance particle systems.
 * Handles the storage and recycling of particle data.
 */
export class ParticlePool {
  public count: number;
  public active: Uint8Array;
  /** Dense list of currently-active particle indices (for fast iteration). */
  public activeList: Uint32Array;
  /** Current number of active particles (prefix length of `activeList`). */
  public activeListSize: number;
  /** Maps particle index -> position in `activeList`, or -1 if inactive. */
  public activeIndex: Int32Array;
  public life: Float32Array;
  public maxLife: Float32Array;
  public position: Float32Array;
  public velocity: Float32Array;
  public scale: Float32Array;
  public color: Float32Array;
  public associatedEffectId: Array<string | null>;
  public curIndex: number;

  /**
   * Creates a new ParticlePool.
   * @param count - The maximum number of particles in the pool.
   */
  constructor(count: number) {
    this.count = count;
    this.active = new Uint8Array(count);
    this.activeList = new Uint32Array(count);
    this.activeListSize = 0;
    this.activeIndex = new Int32Array(count);
    this.activeIndex.fill(-1);
    this.life = new Float32Array(count);
    this.maxLife = new Float32Array(count);
    this.position = new Float32Array(count * 3);
    this.velocity = new Float32Array(count * 3);
    this.scale = new Float32Array(count);
    this.color = new Float32Array(count * 3);
    this.associatedEffectId = new Array(count).fill(null);
    this.curIndex = 0;
  }

  /**
   * Activates a new particle in the pool, overwriting the oldest one if full.
   * @param x - Initial X position.
   * @param y - Initial Y position.
   * @param z - Initial Z position.
   * @param vx - X velocity component.
   * @param vy - Y velocity component.
   * @param vz - Z velocity component.
   * @param r - Red color component (0-1).
   * @param g - Green color component (0-1).
   * @param b - Blue color component (0-1).
   * @param scale - Base scale of the particle.
   * @param life - Lifetime duration in seconds.
   * @param effectId - ID of the effect this particle belongs to.
   */
  activateParticle(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    r: number,
    g: number,
    b: number,
    scale: number,
    life: number,
    effectId: string,
  ) {
    const idx = this.curIndex;
    this.active[idx] = 1;

    // Ensure the particle is present in the dense active list.
    // Note: The ring buffer may overwrite an already-active particle.
    if (this.activeIndex[idx] === -1) {
      const pos = this.activeListSize;
      this.activeList[pos] = idx;
      this.activeIndex[idx] = pos;
      this.activeListSize++;
    }

    this.life[idx] = life;
    this.maxLife[idx] = life;

    this.position[idx * 3] = x;
    this.position[idx * 3 + 1] = y;
    this.position[idx * 3 + 2] = z;

    this.velocity[idx * 3] = vx;
    this.velocity[idx * 3 + 1] = vy;
    this.velocity[idx * 3 + 2] = vz;

    this.color[idx * 3] = r;
    this.color[idx * 3 + 1] = g;
    this.color[idx * 3 + 2] = b;

    this.scale[idx] = scale;
    this.associatedEffectId[idx] = effectId;

    this.curIndex = (this.curIndex + 1) % this.count;
  }

  /**
   * Deactivates a particle and removes it from the dense active list in O(1).
   */
  deactivateParticle(idx: number) {
    if (!this.active[idx]) return;

    this.active[idx] = 0;
    this.life[idx] = 0;
    this.maxLife[idx] = 0;
    this.associatedEffectId[idx] = null;

    const pos = this.activeIndex[idx];
    if (pos === -1) return;

    const lastPos = this.activeListSize - 1;
    const lastIdx = this.activeList[lastPos];

    // Swap-remove.
    this.activeList[pos] = lastIdx;
    this.activeIndex[lastIdx] = pos;

    this.activeIndex[idx] = -1;
    this.activeListSize = lastPos;
  }
}
