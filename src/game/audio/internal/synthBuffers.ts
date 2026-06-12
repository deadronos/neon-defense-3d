export type SfxBufferFactory = Record<string, (ctx: AudioContext) => AudioBuffer>;

/** Lazily builds and caches SFX AudioBuffers. First call to a name
 *  generates the buffer; subsequent calls reuse it. The factory is
 *  not invoked during construction. */
export class SfxBufferCache {
  private readonly ctx: AudioContext;
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly factory: SfxBufferFactory;

  constructor(ctx: AudioContext, factory: SfxBufferFactory) {
    this.ctx = ctx;
    this.factory = factory;
  }

  get(name: string): AudioBuffer | undefined {
    const existing = this.buffers.get(name);
    if (existing !== undefined) return existing;
    const build = this.factory[name];
    if (build === undefined) return undefined;
    const built = build(this.ctx);
    this.buffers.set(name, built);
    return built;
  }
}
