import type { Score } from '../score/types.ts';
import {
  addAnchor,
  chooseHeardTime,
  heardTimeFromLatency,
  heardTimeFromTimestamp,
  songTimeAt,
} from './clock.ts';
import type { ClockAnchor } from './clock.ts';
import type { DecodeReply, DecodeRequest } from './decode-messages.ts';
import type { EngineBank } from './engine.ts';
import { fetchOk } from './fetch-ok.ts';
import { INDEX_FILE, resolvePresetFiles } from './preset-index.ts';
import type { PresetFileEntry } from './preset-index.ts';
import { PROCESSOR_NAME } from './processor-messages.ts';
import type { ProcessorCommand, ProcessorReply, RenderStats } from './processor-messages.ts';
import processorUrl from './processor.ts?worker&url';
import { packSynthEvents, tableBuffers } from './synth-events.ts';

/** The fields of the `Score` that the audio needs (design 3.2, 6.8). */
export type PlayerScore = Pick<Score, 'durationSec' | 'synthEvents' | 'presets'>;

/**
 * The audio interface of the app (design 6.8). Step 2 adds `setSeatAudible()`.
 *
 * The player keeps the last rate and the last volume, and sends them with each score. A play,
 * a pause, or a seek before `load()` resolves has no effect on the new score.
 */
export interface Player {
  /**
   * Loads the engine on the first call, then the presets of the score. After a failure, the next
   * call starts a new engine. A later call replaces a pending call, and the promise of the earlier
   * call rejects with a {@link LoadReplacedError}.
   */
  load(score: PlayerScore, onProgress: (done: number, total: number) => void): Promise<void>;
  play(): void;
  pause(): void;
  seek(songSec: number): void;
  setRate(rate: number): void;
  setVolume(gain: number): void;
  /** Song seconds of the sound that the listener hears now (6.7). Smooth between blocks. */
  now(): number;
}

/**
 * The function that gets an audio failure that no pending `load()` reports, for example a render
 * error of the processor during play (design 6.8).
 */
export type ErrorListener = (error: Error) => void;

/** The error of a `load()` that a later `load()` replaced (design 6.8). */
export class LoadReplacedError extends Error {
  /** Creates the error. */
  constructor() {
    super('A later load replaced this load.');
    this.name = 'LoadReplacedError';
  }
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

/** The {@link Player} with spessasynth_core in an AudioWorklet (design 6). */
export class WorkletPlayer implements Player {
  readonly #context: AudioContext;
  readonly #baseUrl: URL;
  readonly #onError: ErrorListener;
  /** The start of the engine, while it runs or after it succeeds. */
  #engine: Promise<Engine> | undefined;
  /** The engine that gets the commands, after its start. */
  #live: Engine | undefined;
  #anchors: ClockAnchor[] = [];
  #durationSec = 0;
  #stats: RenderStats | undefined;
  #pcmBytes = 0;
  #rate: number | undefined;
  #volume: number | undefined;
  #requestId = 0;
  /** The URLs of the banks that the synth of the live engine holds for the session (6.3). */
  readonly #loadedBanks = new Set<string>();
  readonly #decodes = new Map<number, Pending<readonly EngineBank[]>>();
  readonly #progress = new Map<number, (done: number, total: number) => void>();
  /** One entry for each `banks` message. The processor answers each one with `ready`, in order. */
  readonly #readyQueue: Pending<void>[] = [];
  /** The function that rejects the pending load, or undefined with no pending load. */
  #replaceLoad: (() => void) | undefined;

  /**
   * Creates the player with a new AudioContext. Before a user gesture, the context starts in the
   * suspended state (design 2.4).
   *
   * @param baseUrl The URL of the site root, which holds `sf/`.
   * @param onError The function that gets an audio failure that no pending `load()` reports.
   */
  constructor(baseUrl: URL, onError: ErrorListener) {
    this.#context = new AudioContext({ latencyHint: 'interactive' });
    this.#baseUrl = baseUrl;
    this.#onError = onError;
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

  /** The PCM SF2 size of all banks that the synth holds, in bytes (design 6.3, 9.7). */
  get pcmBytes(): number {
    return this.#pcmBytes;
  }

  async load(score: PlayerScore, onProgress: (done: number, total: number) => void): Promise<void> {
    this.#replaceLoad?.();
    let replace = (): void => undefined;
    const replaced = new Promise<never>((...[, reject]) => {
      replace = () => {
        reject(new LoadReplacedError());
      };
    });
    this.#replaceLoad = replace;
    try {
      await this.#runLoad(score, onProgress, replaced);
    } finally {
      if (this.#replaceLoad === replace) {
        this.#replaceLoad = undefined;
      }
    }
  }

  /**
   * Does the work of {@link load}. Each wait also ends when a later load replaces this one.
   *
   * @param score The score.
   * @param onProgress The progress function of the load.
   * @param replaced A promise that rejects when a later load replaces this one.
   */
  async #runLoad(
    score: PlayerScore,
    onProgress: (done: number, total: number) => void,
    replaced: Promise<never>,
  ): Promise<void> {
    const replace = this.#replaceLoad;
    const engine = await Promise.race([this.#startEngine(), replaced]);
    const files = resolvePresetFiles(engine.index, score.presets);
    // The synth keeps each bank for the session, so the Worker decodes only the new presets.
    const urls = files
      .map((file) => new URL(file.file, this.#baseUrl).href)
      .filter((url) => !this.#loadedBanks.has(url));
    const decoding = this.#decode(engine.worker, urls, (done, total) => {
      if (this.#replaceLoad === replace) {
        onProgress(done, total);
      }
    });
    const banks = await Promise.race([decoding, replaced]);
    const table = packSynthEvents(score.synthEvents);
    this.#durationSec = score.durationSec;
    this.#anchors = [];
    this.#send(
      engine.node,
      { type: 'score', table, durationSec: score.durationSec },
      tableBuffers(table),
    );
    // The score resets the transport and keeps the rate of the synth, so these come after it.
    if (this.#rate !== undefined) {
      this.#send(engine.node, { type: 'rate', rate: this.#rate }, []);
    }
    if (this.#volume !== undefined) {
      this.#send(engine.node, { type: 'volume', gain: this.#volume }, []);
    }
    // The transfer to the worklet detaches the buffers, so the sizes are read before it.
    const pcmBytes = banks.reduce((sum, bank) => sum + bank.data.byteLength, 0);
    const ready = new Promise<void>((resolve, reject) => {
      this.#readyQueue.push({ resolve, reject });
    });
    this.#send(
      engine.node,
      { type: 'banks', banks },
      banks.map((bank) => bank.data),
    );
    // The processor adds the banks also when a later load replaces this one.
    for (const bank of banks) {
      this.#loadedBanks.add(bank.id);
    }
    this.#pcmBytes += pcmBytes;
    await Promise.race([ready, replaced]);
  }

  play(): void {
    // The first click resumes the suspended context (design 2.4). Safari and iOS can reject the
    // resume outside a user gesture.
    void this.#context.resume().catch((error: Error) => {
      this.#onError(new Error(`The audio context did not start: ${String(error)}`));
    });
    this.#command({ type: 'play' });
  }

  pause(): void {
    this.#command({ type: 'pause' });
  }

  seek(songSec: number): void {
    this.#command({ type: 'seek', songSec });
  }

  setRate(rate: number): void {
    this.#rate = rate;
    this.#command({ type: 'rate', rate });
  }

  setVolume(gain: number): void {
    this.#volume = gain;
    this.#command({ type: 'volume', gain });
  }

  now(): number {
    const context = this.#context;
    // Safari before 18.4 has no outputLatency.
    const outputLatency = Number(context.outputLatency) || 0;
    const fromLatency = heardTimeFromLatency(
      context.currentTime,
      outputLatency,
      context.baseLatency,
    );
    // Before the context runs, the timestamp is 0, so the latency method applies (design 6.7).
    const stamp = context.getOutputTimestamp();
    const fromTimestamp =
      stamp.contextTime && stamp.performanceTime
        ? heardTimeFromTimestamp(
            { contextTime: stamp.contextTime, performanceTime: stamp.performanceTime },
            performance.now(),
          )
        : fromLatency;
    const heard = chooseHeardTime(fromTimestamp, fromLatency, outputLatency);
    return songTimeAt(this.#anchors, heard, this.#durationSec);
  }

  #command(command: ProcessorCommand): void {
    if (this.#live) {
      this.#send(this.#live.node, command, []);
    }
  }

  #send(node: AudioWorkletNode, command: ProcessorCommand, transfer: Transferable[]): void {
    node.port.postMessage(command, transfer);
  }

  #startEngine(): Promise<Engine> {
    if (!this.#engine) {
      const engine = this.#makeEngine();
      this.#engine = engine;
      // A failed start does not stay: the next load starts the engine again.
      void engine.catch(() => {
        if (this.#engine === engine) {
          this.#engine = undefined;
        }
      });
    }
    return this.#engine;
  }

  async #makeEngine(): Promise<Engine> {
    const indexUrl = new URL(INDEX_FILE, this.#baseUrl);
    const [index] = await Promise.all([
      fetchOk(indexUrl).then(async (response): Promise<PresetFileEntry[]> => {
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
    const worker = new Worker(new URL('./decode-worker.ts', import.meta.url), { type: 'module' });
    const engine: Engine = { node, worker, index };
    node.port.addEventListener('message', (event: MessageEvent<ProcessorReply>) => {
      this.#receive(engine, event.data);
    });
    node.port.start();
    node.addEventListener('processorerror', () => {
      this.#fail(engine, new Error('The audio processor stopped.'));
    });
    worker.addEventListener('message', (event: MessageEvent<DecodeReply>) => {
      this.#receiveDecode(event.data);
    });
    // A Worker script that does not load (for example a 404) gives an error event.
    worker.addEventListener('error', (event: ErrorEvent) => {
      const detail = event.message ? `: ${event.message}` : '.';
      this.#fail(engine, new Error(`The decode Worker failed${detail}`));
    });
    worker.addEventListener('messageerror', () => {
      this.#fail(engine, new Error('The decode Worker sent a message that cannot be read.'));
    });
    this.#live = engine;
    return engine;
  }

  #decode(
    worker: Worker,
    urls: readonly string[],
    onProgress: (done: number, total: number) => void,
  ): Promise<readonly EngineBank[]> {
    this.#requestId += 1;
    const id = this.#requestId;
    const request: DecodeRequest = { type: 'decode', id, urls };
    return new Promise<readonly EngineBank[]>((resolve, reject) => {
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
      pending?.resolve(reply.banks);
    } else {
      pending?.reject(new Error(reply.message));
    }
  }

  #receive(engine: Engine, reply: ProcessorReply): void {
    switch (reply.type) {
      case 'anchor':
        this.#anchors = addAnchor(this.#anchors, reply.anchor);
        break;
      case 'stats':
        this.#stats = reply.stats;
        break;
      case 'ready':
        this.#readyQueue.shift()?.resolve();
        break;
      case 'error':
        this.#fail(engine, new Error(`The audio processor failed: ${reply.message}`));
        break;
    }
  }

  /**
   * Ends an engine after a failure (design 6.8). The clock stops at its song time, and the next
   * load starts a new engine. A pending load gets the error. Else the error listener gets it.
   */
  #fail(engine: Engine, error: Error): void {
    if (this.#live !== engine) {
      return;
    }
    this.#anchors = [{ contextTime: 0, songTime: this.now(), rate: 0 }];
    this.#live = undefined;
    this.#engine = undefined;
    this.#loadedBanks.clear();
    this.#pcmBytes = 0;
    engine.node.disconnect();
    engine.worker.terminate();
    // A pending load waits for a decode or a ready reply, so these rejections reach it.
    const rejects = [...this.#decodes.values(), ...this.#readyQueue].map(
      (pending) => pending.reject,
    );
    this.#decodes.clear();
    this.#progress.clear();
    this.#readyQueue.length = 0;
    for (const reject of rejects) {
      reject(error);
    }
    if (!this.#replaceLoad) {
      this.#onError(error);
    }
  }
}
