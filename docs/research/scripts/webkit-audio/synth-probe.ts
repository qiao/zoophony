// A worklet processor with SynthEngine and the statistics of probe-processor.js. It posts no
// clock anchor. With processorOptions.idle > 0, it does that many square roots in place of the
// synth, and writes a quiet tone. Build: vite.probe.config.mjs writes page/synth-probe.js.

import { BLOCK_FRAMES, SynthEngine } from '../../../../src/audio/engine.ts';
import { packSynthEvents } from '../../../../src/audio/synth-events.ts';
import type { SynthEvent } from '../../../../src/score/types.ts';

declare const sampleRate: number;
declare const currentTime: number;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}
declare function registerProcessor(name: string, processor: new (options: ProbeInit) => object): void;

interface ProbeInit {
  readonly processorOptions?: { effects?: boolean; interpolation?: number; idle?: number };
}

interface ProbeLoad {
  readonly events: readonly SynthEvent[];
  readonly durationSec: number;
  readonly banks: readonly { id: string; data: ArrayBuffer }[];
}

class SynthProbe extends AudioWorkletProcessor {
  readonly engine = new SynthEngine(sampleRate, () => undefined);
  readonly idle: number;
  playing = false;
  last = 0;
  n = 0;
  slowWork = 0;
  maxWork = 0;
  sumWork = 0;
  maxGap = 0;
  lateGaps = 0;
  sink = 0;

  constructor(options: ProbeInit) {
    super();
    const settings = options.processorOptions ?? {};
    this.idle = settings.idle ?? 0;
    // SAFETY: research script. The engine keeps the synth private, and only this script reads it.
    const synth = (
      this.engine as unknown as { synth: { setSystemParameter(k: string, v: unknown): void } }
    ).synth;
    if (settings.effects === false) {
      synth.setSystemParameter('effectsEnabled', false);
    }
    if (settings.interpolation !== undefined) {
      synth.setSystemParameter('interpolationType', settings.interpolation);
    }
    this.port.onmessage = (event: MessageEvent<ProbeLoad>) => {
      this.engine.loadScore(packSynthEvents(event.data.events), event.data.durationSec);
      this.engine.addBanks(event.data.banks);
      this.engine.enqueue({ type: 'play' });
      this.playing = true;
      this.port.postMessage({ ready: true });
    };
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const left = outputs[0]?.[0];
    const right = outputs[0]?.[1] ?? left;
    if (!left || !right) {
      return true;
    }
    const start = Date.now();
    if (this.playing && this.last) {
      const gap = start - this.last;
      this.maxGap = Math.max(this.maxGap, gap);
      if (gap >= 8) {
        this.lateGaps++;
      }
    }
    this.last = start;
    if (this.idle) {
      let x = 0;
      for (let i = 0; i < this.idle; i++) {
        x += Math.sqrt(i + x * 1e-9);
      }
      this.sink += x;
      for (let i = 0; i < left.length; i++) {
        left[i] = 1e-4 * Math.sin((this.n * 128 + i) * 0.0575);
        right[i] = left[i] ?? 0;
      }
    } else {
      this.engine.render(currentTime, left, right);
    }
    const work = Date.now() - start;
    if (!this.playing) {
      return true;
    }
    this.n++;
    this.sumWork += work;
    if (work > (BLOCK_FRAMES * 1000) / sampleRate) {
      this.slowWork++;
    }
    this.maxWork = Math.max(this.maxWork, work);
    if (this.n % 375 === 0) {
      this.port.postMessage({
        n: this.n,
        slowWork: this.slowWork,
        maxWork: this.maxWork,
        meanWork: this.sumWork / this.n,
        maxGap: this.maxGap,
        lateGaps: this.lateGaps,
      });
    }
    return true;
  }
}

registerProcessor('synth-probe', SynthProbe);
