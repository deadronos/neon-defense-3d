export interface ArpSchedulerOptions {
  notes: readonly number[];
  intervalSec: number;
  noteDurationSec: number;
  peakGain: number;
  lookaheadSec: number;
  schedulerIntervalMs: number;
}

interface OscLike {
  start(): void;
  stop(): void;
  connect(node: unknown): void;
  disconnect(): void;
  frequency: { value: number };
  type: string;
}

interface EnvLike {
  gain: { value: number };
  connect(node: unknown): void;
  disconnect(): void;
}

/** Web-Audio-clock-driven arpeggio scheduler. Replaces a JS `setInterval`
 *  loop with the standard "lookahead scheduler" pattern: a single
 *  `setTimeout` polls `ctx.currentTime` and schedules notes ahead
 *  of the audio clock. Sample-accurate, low JS-task overhead. */
export class SynthArpScheduler {
  private readonly ctx: AudioContext;
  private readonly destination: AudioNode;
  private readonly options: ArpSchedulerOptions;
  private readonly osc: OscLike;
  private readonly env: EnvLike;

  private isRunning = false;
  private noteIndex = 0;
  private nextNoteTime = 0;
  private timerId: ReturnType<typeof setTimeout> | null = null;

  constructor(ctx: AudioContext, destination: AudioNode, options: ArpSchedulerOptions) {
    this.ctx = ctx;
    this.destination = destination;
    this.options = options;
    this.osc = ctx.createOscillator();
    this.osc.type = 'triangle';
    this.osc.frequency.value = options.notes[0] ?? 0;
    this.env = ctx.createGain();
    this.env.gain.value = 0;
    this.osc.connect(this.env);
    this.env.connect(this.destination);
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.noteIndex = 0;
    this.nextNoteTime = this.ctx.currentTime;
    try {
      this.osc.start();
    } catch {
      /* osc may have been started in a prior, lost call; ignore */
    }
    this.scheduleAhead();
    this.timerId = setTimeout(() => this.tick(), this.options.schedulerIntervalMs);
  }

  stop(): void {
    this.isRunning = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    try {
      this.osc.stop();
    } catch {
      /* may already be stopped */
    }
    try {
      this.osc.disconnect();
    } catch {
      /* may already be disconnected */
    }
    try {
      this.env.disconnect();
    } catch {
      /* may already be disconnected */
    }
  }

  private tick(): void {
    if (!this.isRunning) return;
    this.scheduleAhead();
    if (this.isRunning) {
      this.timerId = setTimeout(() => this.tick(), this.options.schedulerIntervalMs);
    }
  }

  private scheduleAhead(): void {
    const { lookaheadSec, intervalSec, notes, peakGain } = this.options;
    const horizon = this.ctx.currentTime + lookaheadSec;
    while (this.nextNoteTime < horizon) {
      const note = notes[this.noteIndex % notes.length] ?? 0;
      this.osc.frequency.value = note;
      this.env.gain.value = peakGain;
      this.nextNoteTime += intervalSec;
      this.noteIndex += 1;
    }
  }
}
