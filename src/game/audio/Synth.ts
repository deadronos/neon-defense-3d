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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();

    this.sfxGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Set initial volumes
    this.masterGain.gain.value = 0.5;
    this.sfxGain.gain.value = 1.0;
    this.musicGain.gain.value = 0.3; // Music softer by default

    this.generateBuffers();
  }

  resume() {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
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
  isPlayingMusic = false;

  startMusic() {
    if (this.isPlayingMusic) return;
    this.resume();
    this.isPlayingMusic = true;

    // Create a sub-mix for music to easily stop it
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.connect(this.musicGain);
    this.bgmGain.gain.value = 0.5;

    // Bass drone
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 55; // A1
    osc1.connect(this.bgmGain);
    osc1.start();
    this.bgmNodes.push(osc1);

    // Arpeggio LFO (simulated by modulating gain of another osc? No, that's AM)
    // Let's just add a simple detuned pad
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 110; // A2
    osc2.detune.value = 5;
    osc2.connect(this.bgmGain);
    osc2.start();
    this.bgmNodes.push(osc2);
  }

  stopMusic() {
    this.bgmNodes.forEach((n) => n.stop());
    this.bgmNodes = [];
    if (this.bgmGain) {
      this.bgmGain.disconnect();
      this.bgmGain = null;
    }
    this.isPlayingMusic = false;
  }
}

export const synth = new Synth();
