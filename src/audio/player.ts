import type { ScorePreset, SynthEvent } from '../score/types.ts';
import {
  addAnchor,
  chooseHeardTime,
  heardTimeFromLatency,
  heardTimeFromTimestamp,
  songTimeAt,
} from './clock.ts';
import type { ClockAnchor } from './clock.ts';
import type { DecodeReply, DecodeRequest, DecodedBank } from './decode-messages.ts';
import { resolvePresetFiles } from './preset-index.ts';
import type { PresetFileEntry } from './preset-index.ts';
import { PROCESSOR_NAME } from './processor-messages.ts';
import type { ProcessorCommand, ProcessorReply, RenderStats } from './processor-messages.ts';
import processorUrl from './processor.ts?worker&url';
import { packSynthEvents, tableBuffers } from './synth-events.ts';

/**
 * The fields of the `Score` that the audio needs (design 3.2). Step 2 passes its `Score`, which
 * has these fields.
 */
export interface PlayerScore {
  /** The time of the last note-off. */
  readonly durationSec: number;
  /** Sorted by timeSec. */
  readonly synthEvents: readonly SynthEvent[];
  /** Presets that must load before play. Drum kits use bank 128. */
  readonly presets: readonly ScorePreset[];
}

/** The audio interface of the app (design 6.8). Step 2 adds `setSeatAudible()`. */
export interface Player {
  /** Loads the engine on the first call, then the presets of the score. */
  load(score: PlayerScore, onProgress: (done: number, total: number) => void): Promise<void>;
  play(): void;
  pause(): void;
  seek(songSec: number): void;
  setRate(rate: number): void;
  setVolume(gain: number): void;
  /** Song seconds of the sound that the listener hears now (6.7). Smooth between blocks. */
  now(): number;
}

/** The engine parts that the first `load()` makes. */
interface Engine {
  readonly node: AudioWorkletNode;
  readonly worker: Worker;
  readonly index: readonly PresetFileEntry[];
}

/** The resolve and reject functions of a pending promise. */
interface Pending<T> {
  readonly resolve: (value: T) => void;
  readonly reject: (error: Error) => void;
}

/** The result of one decode request. */
interface DecodeResult {
  readonly banks: readonly DecodedBank[];
  readonly pcmBytes: number;
}

/** The {@link Player} with spessasynth_core in an AudioWorklet (design 6). */
export class WorkletPlayer implements Player {
  readonly #context: AudioContext;
  readonly #baseUrl: URL;
  #engine: Promise<Engine> | undefined;
  #anchors: ClockAnchor[] = [];
  #durationSec = 0;
  #stats: RenderStats | undefined;
  #pcmBytes = 0;
  #requestId = 0;
  readonly #loadedBanks = new Set<string>();
  readonly #decodes = new Map<number, Pending<DecodeResult>>();
  readonly #progress = new Map<number, (done: number, total: number) => void>();
  #ready: Pending<void> | undefined;

  /**
   * Creates the player with a new AudioContext. Before a user gesture, the context starts in the
   * suspended state (design 2.4).
   *
   * @param baseUrl The URL of the site root, which holds `sf/`.
   */
  constructor(baseUrl: URL) {
    this.#context = new AudioContext({ latencyHint: 'interactive' });
    this.#baseUrl = baseUrl;
  }

  /** The AudioContext of the player, for the clock values of the spike page. */
  get context(): AudioContext {
    return this.#context;
  }

  /** The clock anchors that `now()` uses, the last one at the end. */
  get anchors(): readonly ClockAnchor[] {
    return this.#anchors;
  }

  /** The last render time statistics of the processor, or undefined before the first. */
  get renderStats(): RenderStats | undefined {
    return this.#stats;
  }

  /** The PCM SF2 size of the last load, in bytes (design 9.7, "Memory"). */
  get pcmBytes(): number {
    return this.#pcmBytes;
  }

  async load(score: PlayerScore, onProgress: (done: number, total: number) => void): Promise<void> {
    const engine = await this.#startEngine();
    const files = resolvePresetFiles(engine.index, score.presets);
    const urls = files.map((file) => new URL(file.file, this.#baseUrl).href);
    const decoded = await this.#decode(engine.worker, urls, onProgress);
    this.#pcmBytes = decoded.pcmBytes;
    const table = packSynthEvents(score.synthEvents);
    this.#durationSec = score.durationSec;
    this.#anchors = [];
    this.#send(
      engine.node,
      { type: 'score', table, durationSec: score.durationSec },
      tableBuffers(table),
    );
    const banks = decoded.banks
      .filter((bank) => !this.#loadedBanks.has(bank.url))
      .map((bank) => ({ id: bank.url, data: bank.data }));
    const ready = new Promise<void>((resolve, reject) => {
      this.#ready = { resolve, reject };
    });
    this.#send(
      engine.node,
      { type: 'banks', banks },
      banks.map((bank) => bank.data),
    );
    await ready;
    for (const bank of banks) {
      this.#loadedBanks.add(bank.id);
    }
  }

  play(): void {
    // The first click resumes the suspended context (design 2.4).
    void this.#context.resume();
    this.#command({ type: 'play' });
  }

  pause(): void {
    this.#command({ type: 'pause' });
  }

  seek(songSec: number): void {
    this.#command({ type: 'seek', songSec });
  }

  setRate(rate: number): void {
    this.#command({ type: 'rate', rate });
  }

  setVolume(gain: number): void {
    this.#command({ type: 'volume', gain });
  }

  now(): number {
    const heard = chooseHeardTime(this.heardTime(), this.latencyHeardTime(), this.#outputLatency());
    return songTimeAt(this.#anchors, heard, this.#durationSec);
  }

  /**
   * Calculates the context time that the listener hears now, with `getOutputTimestamp()`
   * (design 6.7). Before the context runs, the timestamp is 0, so the latency method applies.
   * In Firefox, this value has no output latency, so `now()` uses {@link latencyHeardTime}.
   *
   * @returns Context seconds.
   */
  heardTime(): number {
    const stamp = this.#context.getOutputTimestamp();
    if (stamp.contextTime && stamp.performanceTime) {
      return heardTimeFromTimestamp(
        { contextTime: stamp.contextTime, performanceTime: stamp.performanceTime },
        performance.now(),
      );
    }
    return this.latencyHeardTime();
  }

  /**
   * Calculates the heard context time with the second method of design 6.7, from the latency
   * values. The spike page compares it with {@link heardTime}.
   *
   * @returns Context seconds.
   */
  latencyHeardTime(): number {
    const context = this.#context;
    return heardTimeFromLatency(context.currentTime, this.#outputLatency(), context.baseLatency);
  }

  #outputLatency(): number {
    // Safari before 18.4 has no outputLatency.
    return Number(this.#context.outputLatency) || 0;
  }

  #command(command: ProcessorCommand): void {
    if (!this.#engine) {
      return;
    }
    void this.#engine.then((engine) => {
      this.#send(engine.node, command, []);
    });
  }

  #send(node: AudioWorkletNode, command: ProcessorCommand, transfer: Transferable[]): void {
    node.port.postMessage(command, transfer);
  }

  #startEngine(): Promise<Engine> {
    this.#engine ??= this.#makeEngine();
    return this.#engine;
  }

  async #makeEngine(): Promise<Engine> {
    const indexUrl = new URL('sf/index.json', this.#baseUrl);
    const [index] = await Promise.all([
      fetch(indexUrl).then(async (response): Promise<PresetFileEntry[]> => {
        if (!response.ok) {
          throw new Error(`Cannot load ${indexUrl.href}: HTTP ${response.status}.`);
        }
        // SAFETY: tools/split-soundfont.ts writes this file as an array of PresetFileEntry.
        return (await response.json()) as PresetFileEntry[];
      }),
      this.#context.audioWorklet.addModule(processorUrl),
    ]);
    const node = new AudioWorkletNode(this.#context, PROCESSOR_NAME, {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });
    node.connect(this.#context.destination);
    node.port.addEventListener('message', (event: MessageEvent<ProcessorReply>) => {
      this.#receive(event.data);
    });
    node.port.start();
    node.addEventListener('processorerror', () => {
      this.#fail(new Error('The audio processor stopped.'));
    });
    const worker = new Worker(new URL('./decode-worker.ts', import.meta.url), { type: 'module' });
    worker.addEventListener('message', (event: MessageEvent<DecodeReply>) => {
      this.#receiveDecode(event.data);
    });
    return { node, worker, index };
  }

  #decode(
    worker: Worker,
    urls: readonly string[],
    onProgress: (done: number, total: number) => void,
  ): Promise<DecodeResult> {
    this.#requestId += 1;
    const id = this.#requestId;
    const request: DecodeRequest = { type: 'decode', id, urls };
    return new Promise<DecodeResult>((resolve, reject) => {
      this.#decodes.set(id, { resolve, reject });
      this.#progress.set(id, onProgress);
      // A Worker has no target origin. The second argument is the empty transfer list.
      worker.postMessage(request, []);
    });
  }

  #receiveDecode(reply: DecodeReply): void {
    if (reply.type === 'progress') {
      this.#progress.get(reply.id)?.(reply.done, reply.total);
      return;
    }
    const pending = this.#decodes.get(reply.id);
    this.#decodes.delete(reply.id);
    this.#progress.delete(reply.id);
    if (reply.type === 'decoded') {
      pending?.resolve({ banks: reply.banks, pcmBytes: reply.pcmBytes });
    } else {
      pending?.reject(new Error(reply.message));
    }
  }

  #receive(reply: ProcessorReply): void {
    switch (reply.type) {
      case 'anchor':
        this.#anchors = addAnchor(this.#anchors, reply.anchor);
        break;
      case 'stats':
        this.#stats = reply.stats;
        break;
      case 'ready':
        this.#ready?.resolve();
        this.#ready = undefined;
        break;
      case 'error':
        this.#fail(new Error(reply.message));
        break;
    }
  }

  #fail(error: Error): void {
    console.error(error);
    this.#ready?.reject(error);
    this.#ready = undefined;
  }
}
