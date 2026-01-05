export class Synth {
  ctx: AudioContext;
  masterGain: GainNode;
  sfxGain: GainNode;
  musicGain: GainNode;

  // Buffers
  buffers: Map<string, AudioBuffer> = new Map();

  constructor() {
    // We defer initialization until first interaction if possible, but for now we create the context
    // It might be 'suspended' initially.
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
    this.masterGain.connect(this.ctx.destination);

    // Set initial volumes
    this.masterGain.gain.value = 0.5;
    this.sfxGain.gain.value = 1.0;
    this.musicGain.gain.value = 0.45; // Music louder by default so effects are audible

    // prepare reverb send node (dry/wet control)
    this.reverbSend = this.ctx.createGain();
    this.reverbSend.gain.value = 0.12;

    // create convolver and load a procedural impulse
    try {
      this.convolver = this.ctx.createConvolver();
      const impulse = this.createImpulseResponse(2.5, 2.0); // 2.5s impulse, longish decay for synthwave
      this.convolver.buffer = impulse;
      this.convolver.connect(this.musicGain); // wet goes to music bus
    } catch (err) {
      console.warn('[AUDIO] Failed to create convolver/reverb:', err);
      this.convolver = null;
    }

    this.generateBuffers();
  }

  resume() {
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  setMasterVolume(val: number) {
    this.masterGain.gain.value = val;
  }
  setSFXVolume(val: number) {
    this.sfxGain.gain.value = val;
  }
  setMusicVolume(val: number) {
    this.musicGain.gain.value = val;
  }

  generateBuffers() {
    // SHOOT: High pitch short decay
    this.buffers.set(
      'shoot',
      this.createBuffer(0.1, (t) => {
        const freq = 880 * Math.exp(-t * 10);
        return Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 20);
      }),
    );

    // IMPACT: Noise burst
    this.buffers.set(
      'impact',
      this.createBuffer(0.1, (t) => {
        return (Math.random() * 2 - 1) * Math.exp(-t * 30);
      }),
    );

    // BUILD: Rising tone
    this.buffers.set(
      'build',
      this.createBuffer(0.3, (t) => {
        const freq = 220 + t * 1000;
        return Math.sin(2 * Math.PI * freq * t) * (1 - t / 0.3);
      }),
    );

    // SELL: Falling tone
    this.buffers.set(
      'sell',
      this.createBuffer(0.3, (t) => {
        const freq = 600 - t * 1000;
        return Math.sin(2 * Math.PI * freq * t) * (1 - t / 0.3);
      }),
    );

    // UI CLICK: Short high blip
    this.buffers.set(
      'click',
      this.createBuffer(0.05, (t) => {
        return Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 50);
      }),
    );

    // ERROR: Low buzz
    this.buffers.set(
      'error',
      this.createBuffer(0.2, (t) => {
        return (Math.random() > 0.5 ? 1 : -1) * Math.exp(-t * 10) * 0.5;
      }),
    );
  }

  createBuffer(duration: number, signalFn: (t: number) => number): AudioBuffer {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = signalFn(i / sampleRate);
    }
    return buffer;
  }

  // Procedurally generate an impulse response using filtered noise with exponential decay
  createImpulseResponse(durationSec = 2.0, decay = 1.5): AudioBuffer {
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

  setReverbMix(value: number) {
    // value: 0..1 wet mix
    if (!this.reverbSend) return;
    const wet = Math.max(0, Math.min(1, value));
    this.reverbSend.gain.value = wet;
  }

  playSFX(name: string) {
    this.resume();
    const buffer = this.buffers.get(name);
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.sfxGain);
    source.start();
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
  arpOsc: OscillatorNode | null = null;
  arpGain: GainNode | null = null;
  arpInterval: number | null = null;

  // Convolver (impulse) reverb
  convolver: ConvolverNode | null = null;
  reverbSend: GainNode | null = null;

  isPlayingMusic = false;

  startMusic() {
    if (this.isPlayingMusic) return;
    this.resume();
    this.isPlayingMusic = true;

    // Create a sub-mix for music to easily stop it
    const bgmGain = this.ctx.createGain();
    this.bgmGain = bgmGain;
    // Create a mild lowpass to warm the mix
    try {
      this.bgmFilter = this.ctx.createBiquadFilter();
      this.bgmFilter.type = 'lowpass';
      this.bgmFilter.frequency.value = 1200;
      this.bgmFilter.Q.value = 0.8;
      bgmGain.connect(this.bgmFilter);
      // Feed both dry and wet
      this.bgmFilter.connect(this.musicGain);
    } catch (err) {
      console.warn('[AUDIO] Failed to create lowpass filter, using direct connection:', err);
      bgmGain.connect(this.musicGain);
    }

    // Gentle delay-based reverb (feedback loop)
    try {
      this.delayNode = this.ctx.createDelay();
      this.delayNode.delayTime.value = 0.28;
      this.delayFeedback = this.ctx.createGain();
      this.delayFeedback.gain.value = 0.36;

      if (this.bgmFilter) {
        this.bgmFilter.connect(this.delayNode);
      } else {
        bgmGain.connect(this.delayNode);
      }
      this.delayNode.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      // Send delay output to main music bus (wet)
      this.delayNode.connect(this.musicGain);
    } catch (err) {
      console.warn('[AUDIO] Failed to create delay node:', err);
    }

    // subtle LFO for gentle detune/chorus movement
    try {
      this.lfo = this.ctx.createOscillator();
      this.lfo.type = 'sine';
      this.lfo.frequency.value = 0.18; // slow
      this.lfoGain = this.ctx.createGain();
      this.lfoGain.gain.value = 8; // detune amount in cents
      this.lfo.connect(this.lfoGain);
      this.lfo.start();
    } catch (err) {
      console.warn('[AUDIO] Failed to create LFO:', err);
      this.lfo = null;
      this.lfoGain = null;
    }

    // Bass drone
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 55; // A1
    osc1.connect(bgmGain);
    osc1.start();
    this.bgmNodes.push(osc1);

    // Pad / chorus layer
    const osc2 = this.ctx.createOscillator();
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
    const osc3 = this.ctx.createOscillator();
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
      this.arpOsc = this.ctx.createOscillator();
      this.arpOsc.type = 'triangle';
      this.arpGain = this.ctx.createGain();
      this.arpGain.gain.value = 0.0; // start silent
      this.arpOsc.connect(this.arpGain);
      this.arpGain.connect(bgmGain);
      this.arpOsc.start();

      const notes = [220, 277.18, 329.63, 392]; // A minor-ish arpeggio
      let idx = 0;
      this.arpInterval = window.setInterval(() => {
        if (!this.arpOsc || !this.arpGain) return;
        const note = notes[idx % notes.length];
        // quick per-note envelope
        this.arpOsc.frequency.value = note;
        this.arpGain.gain.value = 0.6;
        setTimeout(() => {
          if (this.arpGain) this.arpGain.gain.value = 0.0;
        }, 140);
        idx++;
      }, 180);
    } catch (err) {
      console.warn('[AUDIO] Failed to create arpeggiator:', err);
    }

    // finally connect the submix to the music bus if not connected earlier
    // connect dry
    if (!this.bgmFilter) {
      // already connected in filter branch, otherwise connect now
      bgmGain.connect(this.musicGain);
    }

    // connect wet via reverb send -> convolver
    if (this.reverbSend && this.convolver) {
      bgmGain.connect(this.reverbSend);
      this.reverbSend.connect(this.convolver);
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

  private safeClearInterval(id: number | null) {
    if (id === null) return;
    clearInterval(id);
  }

  stopMusic() {
    for (const n of this.bgmNodes) this.safeStop(n);
    this.bgmNodes = [];

    this.safeStop(this.arpOsc);
    this.arpOsc = null;

    this.safeClearInterval(this.arpInterval);
    this.arpInterval = null;

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
