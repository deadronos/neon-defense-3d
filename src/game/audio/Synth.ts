import { SynthArpScheduler, type ArpSchedulerOptions } from './internal/synthArp';
import { SfxBufferCache, type SfxBufferFactory } from './internal/synthBuffers';

export const DEFAULT_VOLUMES = { masterVolume: 0.5, sfxVolume: 1, musicVolume: 0.45 } as const;

const SFX_FACTORY: SfxBufferFactory = {
  shoot: (ctx) => Synth.makeShootBuffer(ctx),
  impact: (ctx) => Synth.makeImpactBuffer(ctx),
  build: (ctx) => Synth.makeBuildBuffer(ctx),
  sell: (ctx) => Synth.makeSellBuffer(ctx),
  click: (ctx) => Synth.makeClickBuffer(ctx),
  error: (ctx) => Synth.makeErrorBuffer(ctx),
  kill: (ctx) => Synth.makeCueBuffer(ctx, 0.12, 330, 495),
  wave: (ctx) => Synth.makeCueBuffer(ctx, 0.35, 392, 587),
  lifeLost: (ctx) => Synth.makeCueBuffer(ctx, 0.3, 220, 110),
};

const ARP_OPTIONS: ArpSchedulerOptions = {
  notes: [220, 277.18, 329.63, 392],
  intervalSec: 0.18,
  noteDurationSec: 0.14,
  peakGain: 0.6,
  lookaheadSec: 0.05,
  schedulerIntervalMs: 25,
};

export class Synth {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  sfxGain: GainNode | null = null;
  musicGain: GainNode | null = null;

  private sfxBuffers: SfxBufferCache | null = null;
  private masterVolume: number = DEFAULT_VOLUMES.masterVolume;
  private sfxVolume: number = DEFAULT_VOLUMES.sfxVolume;
  private musicVolume: number = DEFAULT_VOLUMES.musicVolume;
  private reverbMix = 0.12;
  private readonly voices = new Map<string, { active: number; lastStarted: number }>();

  private initialize() {
    if (this.ctx) return;
    const webkitAudioContext = (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
    const AudioContextCtor =
      typeof window.AudioContext === 'function' ? window.AudioContext : webkitAudioContext;
    if (typeof AudioContextCtor !== 'function') {
      throw new Error('AudioContext is not supported by this environment.');
    }
    this.ctx = new AudioContextCtor();

    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();

    this.sfxGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    try {
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.value = -12;
      compressor.ratio.value = 6;
      compressor.connect(this.ctx.destination);
      this.masterGain.connect(compressor);
    } catch {
      this.masterGain.connect(this.ctx.destination);
    }

    // Set initial volumes
    this.masterGain.gain.value = this.masterVolume;
    this.sfxGain.gain.value = this.sfxVolume;
    this.musicGain.gain.value = this.musicVolume;

    // prepare reverb send node (dry/wet control)
    this.reverbSend = this.ctx.createGain();
    this.reverbSend.gain.value = this.reverbMix;

    // create convolver and load a procedural impulse
    try {
      this.convolver = this.ctx.createConvolver();
      const impulse = this.createImpulseResponse(2.5, 2.0); // 2.5s impulse, longish decay for synthwave
      this.convolver.buffer = impulse;
      this.convolver.connect(this.musicGain); // wet goes to music bus
      this.reverbSend.connect(this.convolver);
    } catch (err) {
      console.warn('[AUDIO] Failed to create convolver/reverb:', err);
      this.convolver = null;
    }

    this.sfxBuffers = new SfxBufferCache(this.ctx, SFX_FACTORY);
  }

  resume() {
    this.initialize();
    if (this.ctx?.state === 'suspended') {
      void this.ctx.resume().catch((err: unknown) => console.warn('[AUDIO] Resume failed:', err));
    }
  }

  setMasterVolume(val: number) {
    this.masterVolume = val;
    if (this.masterGain) this.masterGain.gain.value = val;
  }
  setSFXVolume(val: number) {
    this.sfxVolume = val;
    if (this.sfxGain) this.sfxGain.gain.value = val;
  }
  setMusicVolume(val: number) {
    this.musicVolume = val;
    if (this.musicGain) this.musicGain.gain.value = val;
  }

  private static createBuffer(
    ctx: AudioContext,
    duration: number,
    signalFn: (t: number) => number,
  ): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = signalFn(i / sampleRate);
    }
    return buffer;
  }

  static makeShootBuffer(ctx: AudioContext): AudioBuffer {
    return this.createBuffer(ctx, 0.1, (t) => {
      const freq = 880 * Math.exp(-t * 10);
      return Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 20);
    });
  }

  static makeImpactBuffer(ctx: AudioContext): AudioBuffer {
    return this.createBuffer(ctx, 0.1, (t) => (Math.random() * 2 - 1) * Math.exp(-t * 30));
  }

  static makeBuildBuffer(ctx: AudioContext): AudioBuffer {
    return this.createBuffer(ctx, 0.3, (t) => {
      const freq = 220 + t * 1000;
      return Math.sin(2 * Math.PI * freq * t) * (1 - t / 0.3);
    });
  }

  static makeSellBuffer(ctx: AudioContext): AudioBuffer {
    return this.createBuffer(ctx, 0.3, (t) => {
      const freq = 600 - t * 1000;
      return Math.sin(2 * Math.PI * freq * t) * (1 - t / 0.3);
    });
  }

  static makeClickBuffer(ctx: AudioContext): AudioBuffer {
    return this.createBuffer(
      ctx,
      0.05,
      (t) => Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 50),
    );
  }

  static makeErrorBuffer(ctx: AudioContext): AudioBuffer {
    return this.createBuffer(
      ctx,
      0.2,
      (t) => (Math.random() > 0.5 ? 1 : -1) * Math.exp(-t * 10) * 0.5,
    );
  }

  // Procedurally generate an impulse response using filtered noise with exponential decay
  createImpulseResponse(durationSec = 2.0, decay = 1.5): AudioBuffer {
    if (!this.ctx)
      throw new Error('Audio must be initialized before creating an impulse response.');
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * durationSec);
    const impulse = this.ctx.createBuffer(2, length, rate);

    for (let ch = 0; ch < 2; ch++) {
      const channelData = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        // white noise * envelope
        const t = i / rate;
        const env = Math.pow(1 - t / durationSec, decay);
        // simple filtered noise approximation by scaling and random
        channelData[i] = (Math.random() * 2 - 1) * env * 0.6;
      }
    }
    return impulse;
  }

  static makeCueBuffer(ctx: AudioContext, duration: number, first: number, second: number) {
    const noteDuration = duration / 2;
    return this.createBuffer(ctx, duration, (t) => {
      const noteTime = t % noteDuration;
      const frequency = t < noteDuration ? first : second;
      const envelope = Math.min(1, noteTime / 0.005) * (1 - noteTime / noteDuration);
      return Math.sin(2 * Math.PI * frequency * noteTime) * envelope * 0.45;
    });
  }

  setReverbMix(value: number) {
    this.reverbMix = Math.max(0, Math.min(1, value));
    if (this.reverbSend) this.reverbSend.gain.value = this.reverbMix;
  }

  playSFX(name: string) {
    if (!Object.hasOwn(SFX_FACTORY, name)) return;
    try {
      this.resume();
    } catch (err) {
      console.warn('[AUDIO] Could not initialize sound effects:', err);
      return;
    }
    const { ctx, sfxGain, sfxBuffers } = this;
    if (!ctx || !sfxGain || !sfxBuffers) return;

    const combat = name === 'shoot' || name === 'impact' || name === 'kill';
    const now = ctx.currentTime;
    const voice = this.voices.get(name) ?? { active: 0, lastStarted: -Infinity };
    if (voice.active >= (combat ? 3 : 2) || now - voice.lastStarted < (combat ? 0.025 : 0.06)) {
      return;
    }

    const buffer = sfxBuffers.get(name);
    if (!buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    if (combat) source.playbackRate.value = 0.94 + Math.random() * 0.12;
    source.connect(sfxGain);
    source.onended = () => {
      voice.active--;
      source.disconnect();
    };
    source.start();
    voice.active++;
    voice.lastStarted = now;
    this.voices.set(name, voice);
  }

  // Simple procedural music sequencer could go here,
  // but for simplicity let's just create a loop or an oscillator drone for now.
  // A full music track via buffers is large. Let's do a simple looped drone/arpeggio.
  bgmNodes: OscillatorNode[] = [];
  bgmGain: GainNode | null = null;
  // Extra nodes for richer sound
  bgmFilter: BiquadFilterNode | null = null;
  delayNode: DelayNode | null = null;
  delayFeedback: GainNode | null = null;
  lfo: OscillatorNode | null = null;
  lfoGain: GainNode | null = null;
  arpScheduler: SynthArpScheduler | null = null;

  // Convolver (impulse) reverb
  convolver: ConvolverNode | null = null;
  reverbSend: GainNode | null = null;

  isPlayingMusic = false;

  startMusic() {
    if (this.isPlayingMusic) return;
    this.resume();
    const { ctx, musicGain } = this;
    if (!ctx || !musicGain) return;
    this.isPlayingMusic = true;

    // Create a sub-mix for music to easily stop it
    const bgmGain = ctx.createGain();
    this.bgmGain = bgmGain;
    // Create a mild lowpass to warm the mix
    try {
      this.bgmFilter = ctx.createBiquadFilter();
      this.bgmFilter.type = 'lowpass';
      this.bgmFilter.frequency.value = 1200;
      this.bgmFilter.Q.value = 0.8;
      bgmGain.connect(this.bgmFilter);
      // Feed both dry and wet
      this.bgmFilter.connect(musicGain);
    } catch (err) {
      console.warn('[AUDIO] Failed to create lowpass filter, using direct connection:', err);
      bgmGain.connect(musicGain);
    }

    // Gentle delay-based reverb (feedback loop)
    try {
      this.delayNode = ctx.createDelay();
      this.delayNode.delayTime.value = 0.28;
      this.delayFeedback = ctx.createGain();
      this.delayFeedback.gain.value = 0.36;

      if (this.bgmFilter) {
        this.bgmFilter.connect(this.delayNode);
      } else {
        bgmGain.connect(this.delayNode);
      }
      this.delayNode.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      // Send delay output to main music bus (wet)
      this.delayNode.connect(musicGain);
    } catch (err) {
      console.warn('[AUDIO] Failed to create delay node:', err);
    }

    // subtle LFO for gentle detune/chorus movement
    try {
      this.lfo = ctx.createOscillator();
      this.lfo.type = 'sine';
      this.lfo.frequency.value = 0.18; // slow
      this.lfoGain = ctx.createGain();
      this.lfoGain.gain.value = 8; // detune amount in cents
      this.lfo.connect(this.lfoGain);
      this.lfo.start();
    } catch (err) {
      console.warn('[AUDIO] Failed to create LFO:', err);
      this.lfo = null;
      this.lfoGain = null;
    }

    // Bass drone
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 55; // A1
    osc1.connect(bgmGain);
    osc1.start();
    this.bgmNodes.push(osc1);

    // Pad / chorus layer
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 110; // A2
    osc2.detune.value = 6;
    if (this.lfoGain !== null) {
      // connect LFO to detune for slow motion
      this.lfoGain.connect(osc2.detune);
    }
    osc2.connect(bgmGain);
    osc2.start();
    this.bgmNodes.push(osc2);

    // Additional detuned saw for thickness
    const osc3 = ctx.createOscillator();
    osc3.type = 'sawtooth';
    osc3.frequency.value = 110;
    osc3.detune.value = -8;
    if (this.lfoGain !== null) {
      this.lfoGain.connect(osc3.detune);
    }
    osc3.connect(bgmGain);
    osc3.start();
    this.bgmNodes.push(osc3);

    // Small arpeggio to add movement
    try {
      // Arpeggio on the audio clock (sample-accurate, no per-note JS task).
      this.arpScheduler = new SynthArpScheduler(ctx, bgmGain, ARP_OPTIONS);
      this.arpScheduler.start();
    } catch (err) {
      console.warn('[AUDIO] Failed to create arpeggiator:', err);
      this.arpScheduler = null;
    }

    // finally connect the submix to the music bus if not connected earlier
    // connect dry
    if (!this.bgmFilter) {
      // already connected in filter branch, otherwise connect now
      bgmGain.connect(musicGain);
    }

    // connect wet via reverb send -> convolver
    if (this.reverbSend && this.convolver) {
      bgmGain.connect(this.reverbSend);
    }

    bgmGain.gain.value = 0.6;
  }

  private safeStop(node: OscillatorNode | null) {
    if (node === null) return;
    try {
      node.stop();
    } catch {
      /* silent */
    }
  }

  private safeDisconnect(node: AudioNode | null) {
    if (node === null) return;
    try {
      node.disconnect();
    } catch {
      /* silent */
    }
  }

  stopMusic() {
    for (const n of this.bgmNodes) this.safeStop(n);
    this.bgmNodes = [];

    this.arpScheduler?.stop();
    this.arpScheduler = null;

    this.safeStop(this.lfo);
    this.lfo = null;
    this.lfoGain = null;

    this.safeDisconnect(this.delayFeedback);
    this.delayFeedback = null;

    this.safeDisconnect(this.delayNode);
    this.delayNode = null;

    this.safeDisconnect(this.bgmFilter);
    this.bgmFilter = null;

    this.safeDisconnect(this.bgmGain);
    this.bgmGain = null;

    this.isPlayingMusic = false;
  }
}

export const synth = new Synth();
