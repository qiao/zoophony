import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { controlChange, noteOff, noteOn, programChange } from '../midi/test-smf.ts';
import { PAN_CONTROLLER, REVERB_SEND_CONTROLLER } from '../score/stage-mix.ts';
import { scoreOf } from '../score/test-score.ts';
import type { Score } from '../score/types.ts';
import type { DecodeReply, DecodeRequest } from './decode-messages.ts';
import { DRY_GAIN, LIMITER, LIMITER_TRIM_DB, WET_GAIN } from './output-chain.ts';
import { LoadReplacedError, WorkletPlayer } from './player.ts';
import type { PlayerScore } from './player.ts';
import type { PresetFileEntry } from './preset-index.ts';
import type { ProcessorCommand, ProcessorReply } from './processor-messages.ts';

/** The site root of the tests. */
const BASE_URL = new URL('https://zoophony.test/');

/** The content of `sf/index.json` in the tests. */
const INDEX: readonly PresetFileEntry[] = [
  { bank: 0, program: 0, drumKit: false, file: 'sf/0/0.sf3', size: 100 },
  { bank: 0, program: 40, drumKit: false, file: 'sf/0/40.sf3', size: 100 },
];

/**
 * Makes a score with one note of a program, from 0.5 s to 1.5 s.
 *
 * @param program The GM program, which must be in {@link INDEX}.
 * @returns The score.
 */
function scoreWith(program: number): Score {
  return scoreOf({
    tracks: [[programChange(0, 0, program), noteOn(480, 0, 60), noteOff(1440, 0, 60)]],
  });
}

/** The port of a fake worklet node. It records the commands of the Player. */
class FakePort {
  readonly commands: ProcessorCommand[] = [];
  started = false;
  #listener: ((event: { data: ProcessorReply }) => void) | undefined;

  /** Records a copy of the command, and detaches the transferred buffers, as a real port does. */
  postMessage(command: ProcessorCommand, transfer: Transferable[] = []): void {
    this.commands.push(structuredClone(command, { transfer }));
  }

  addEventListener(
    ...[, listener]: readonly ['message', (event: { data: ProcessorReply }) => void]
  ): void {
    this.#listener = listener;
  }

  start(): void {
    this.started = true;
  }

  /** Sends a reply of the processor to the Player. */
  reply(message: ProcessorReply): void {
    this.#listener?.({ data: message });
  }
}

/** The fake worklet nodes that the Player made, the newest last. */
const nodes: FakeNode[] = [];

/** A node that a fake node can connect to. */
type FakeTarget = FakeGain | FakeConvolver | FakeCompressor | FakeDestination;

/** The fake `destination` of a fake audio context. */
class FakeDestination {
  readonly maxChannelCount = 2;
}

/** A fake Web Audio node of the output chain. It records its connections. */
class FakeAudioNode {
  readonly targets: FakeTarget[] = [];

  connect(target: FakeTarget): void {
    this.targets.push(target);
  }
}

/** The fake `AudioBuffer` of `decodeAudioData()`: the size of the file. */
interface FakeBuffer {
  readonly bytes: number;
}

/** A fake `GainNode`. */
class FakeGain extends FakeAudioNode {
  readonly gain = { value: 1 };
}

/** A fake `ConvolverNode`, with the defaults of Web Audio. */
class FakeConvolver extends FakeAudioNode {
  normalize = true;
  buffer: FakeBuffer | null = null;
}

/** A fake `DynamicsCompressorNode`, with the defaults of Web Audio. */
class FakeCompressor extends FakeAudioNode {
  readonly threshold = { value: -24 };
  readonly knee = { value: 30 };
  readonly ratio = { value: 12 };
  readonly attack = { value: 0.003 };
  readonly release = { value: 0.25 };
}

/** A fake `AudioWorkletNode`. */
class FakeNode {
  readonly port = new FakePort();
  connected = false;
  /** The node that gets the output. */
  target: FakeTarget | undefined;

  constructor() {
    nodes.push(this);
  }

  connect(target: FakeTarget): void {
    this.connected = true;
    this.target = target;
  }

  disconnect(): void {
    this.connected = false;
  }

  addEventListener(): void {
    // The tests send processor errors through the port.
  }
}

/** The fake decode Workers that the Player made, the newest last. */
const workers: FakeWorker[] = [];

/** The fields of a Worker event that the Player reads. */
interface FakeWorkerEvent {
  readonly data?: DecodeReply;
  readonly message?: string;
}

/** A fake decode Worker. The test sends its replies. */
class FakeWorker {
  readonly requests: DecodeRequest[] = [];
  terminated = false;
  readonly #listeners = new Map<string, (event: FakeWorkerEvent) => void>();

  constructor() {
    workers.push(this);
  }

  postMessage(request: DecodeRequest): void {
    this.requests.push(request);
  }

  addEventListener(type: string, listener: (event: FakeWorkerEvent) => void): void {
    this.#listeners.set(type, listener);
  }

  terminate(): void {
    this.terminated = true;
  }

  /** Sends the progress of a request. */
  progress(request: DecodeRequest, done: number): void {
    this.#listeners.get('message')?.({
      data: { type: 'progress', id: request.id, done, total: request.urls.length },
    });
  }

  /** Sends the error event of a Worker script that did not load. */
  fail(): void {
    this.#listeners.get('error')?.({ message: '' });
  }

  /** Sends the decoded banks of a request, with 8 bytes for each file. */
  decode(request: DecodeRequest): void {
    const banks = request.urls.map((url) => ({ id: url, data: new ArrayBuffer(8) }));
    this.#listeners.get('message')?.({
      data: { type: 'decoded', id: request.id, banks },
    });
  }
}

/** The fake audio contexts of the players, the newest last. */
const contexts: FakeContext[] = [];

/** A fake `AudioContext` with the members that the Player reads. */
class FakeContext {
  readonly audioWorklet = { addModule: async (): Promise<void> => undefined };
  readonly destination = new FakeDestination();
  /** The tests move this time. `now()` reads it, because the timestamp is 0. */
  currentTime = 0;
  readonly outputLatency = 0;
  readonly baseLatency = 0;

  /** The number of calls of `decodeAudioData()`. */
  decodes = 0;

  getOutputTimestamp(): AudioTimestamp {
    return { contextTime: 0, performanceTime: 0 };
  }

  createGain(): FakeGain {
    return new FakeGain();
  }

  createConvolver(): FakeConvolver {
    return new FakeConvolver();
  }

  createDynamicsCompressor(): FakeCompressor {
    return new FakeCompressor();
  }

  /** Gives a fake buffer that holds the size of the file. */
  async decodeAudioData(data: ArrayBuffer): Promise<FakeBuffer> {
    this.decodes += 1;
    return { bytes: data.byteLength };
  }

  constructor() {
    contexts.push(this);
  }

  /** The error of the next `resume()`, or undefined for a resume that succeeds. */
  resumeError: Error | undefined;

  async resume(): Promise<void> {
    if (this.resumeError) {
      throw this.resumeError;
    }
  }
}

/** The HTTP status of `sf/index.json` in the tests. */
let indexStatus = 200;

/** The size of the hall impulse response in the tests, in bytes. */
const IMPULSE_BYTES = 12;

/** The state of a promise. */
type PromiseState = 'pending' | 'resolved' | 'rejected';

/**
 * Finds the state of a promise after the pending callbacks have run.
 *
 * @param promise The promise.
 * @returns Its state.
 */
async function stateOf(promise: Promise<void>): Promise<PromiseState> {
  let state: PromiseState = 'pending';
  void promise.then(
    () => {
      state = 'resolved';
    },
    () => {
      state = 'rejected';
    },
  );
  await flush();
  return state;
}

/** Waits until the pending promise callbacks and messages of the Player have run. */
async function flush(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/** Gives the last element of a list, and fails the test if the list is empty. */
function last<T>(items: readonly T[]): T {
  const item = items.at(-1);
  if (item === undefined) {
    throw new Error('The list is empty.');
  }
  return item;
}

/**
 * Loads a score, and sends the replies of the Worker and of the processor.
 *
 * @param player The player.
 * @param score The score.
 */
async function loadFully(player: WorkletPlayer, score: PlayerScore): Promise<void> {
  const loading = player.load(score, () => undefined);
  await flush();
  const worker = last(workers);
  worker.decode(last(worker.requests));
  await flush();
  last(nodes).port.reply({ type: 'ready', banks: 1 });
  await loading;
}

beforeEach(() => {
  nodes.length = 0;
  workers.length = 0;
  contexts.length = 0;
  indexStatus = 200;
  vi.stubGlobal('AudioContext', FakeContext);
  vi.stubGlobal('AudioWorkletNode', FakeNode);
  vi.stubGlobal('Worker', FakeWorker);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: URL) =>
      url.pathname.endsWith('.wav')
        ? new Response(new Uint8Array(IMPULSE_BYTES))
        : new Response(JSON.stringify(INDEX), { status: indexStatus }),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('WorkletPlayer commands before the first load', () => {
  it('sends the last rate and volume after the score', async () => {
    const player = new WorkletPlayer(BASE_URL, () => undefined);
    player.setRate(1.25);
    player.setVolume(0.5);
    await loadFully(player, scoreWith(0));
    const types = last(nodes).port.commands.map((command) => command.type);
    expect(types).toEqual(['score', 'rate', 'volume', 'banks']);
    expect(last(nodes).port.commands).toContainEqual({ type: 'rate', rate: 1.25 });
    expect(last(nodes).port.commands).toContainEqual({ type: 'volume', gain: 0.5 });
  });
});

describe('WorkletPlayer commands during a load (design 6.8)', () => {
  it('sends a command before the score post to the old score, and a later one to the new', async () => {
    const player = new WorkletPlayer(BASE_URL, () => undefined);
    await loadFully(player, scoreWith(0));
    const loading = player.load(scoreWith(40), () => undefined);
    await flush();
    // The Worker decodes the new preset, so the processor still holds the old score.
    player.setSeatAudible(1, false);
    const worker = last(workers);
    worker.decode(last(worker.requests));
    await flush();
    // The score and its banks are posted, and the load waits for the ready reply.
    player.setSeatAudible(2, false);
    expect(await stateOf(loading)).toBe('pending');
    const node = last(nodes);
    expect(node.port.commands.map((command) => command.type)).toEqual([
      'score',
      'banks',
      'seat',
      'score',
      'banks',
      'seat',
    ]);
    node.port.reply({ type: 'ready', banks: 1 });
    await loading;
  });
});

describe('WorkletPlayer clock after a new load', () => {
  it('ignores an anchor of the old score that arrives after the new load (review F3)', async () => {
    const player = new WorkletPlayer(BASE_URL, () => undefined);
    await loadFully(player, scoreWith(0));
    player.play(0);
    const node = last(nodes);
    const context = last(contexts);
    node.port.reply({ type: 'anchor', anchor: { contextTime: 1, songTime: 0, rate: 1, load: 1 } });
    context.currentTime = 1.5;
    expect(player.now()).toBeCloseTo(0.5);

    await loadFully(player, scoreWith(40));
    // The old score posted this anchor before the processor got the new score.
    node.port.reply({ type: 'anchor', anchor: { contextTime: 2, songTime: 1, rate: 1, load: 1 } });
    context.currentTime = 2.5;
    expect(player.now()).toBe(0);

    node.port.reply({
      type: 'anchor',
      anchor: { contextTime: 2.6, songTime: 0, rate: 0, load: 2 },
    });
    context.currentTime = 3;
    expect(player.now()).toBe(0);
    expect(player.anchors).toHaveLength(1);
  });
});

describe('WorkletPlayer count-in', () => {
  it('sends the count-in with the play, and runs now() from below 0 (design 6.5)', async () => {
    const player = new WorkletPlayer(BASE_URL, () => undefined);
    await loadFully(player, scoreWith(0));
    player.play(0.9);
    const node = last(nodes);
    expect(last(node.port.commands)).toEqual({ type: 'play', countInSec: 0.9 });
    node.port.reply({
      type: 'anchor',
      anchor: { contextTime: 1, songTime: -0.9, rate: 1, load: 1 },
    });
    last(contexts).currentTime = 1.4;
    expect(player.now()).toBeCloseTo(-0.5);
  });
});

describe('WorkletPlayer seat flags', () => {
  it('sends the audibility flag of a seat to the processor (design 6.6)', async () => {
    const player = new WorkletPlayer(BASE_URL, () => undefined);
    await loadFully(player, scoreWith(0));
    player.setSeatAudible(2, false);
    expect(last(last(nodes).port.commands)).toEqual({ type: 'seat', seatIndex: 2, audible: false });
  });
});

describe('WorkletPlayer failures', () => {
  it('starts the engine again on the next load after a failed start', async () => {
    indexStatus = 404;
    const player = new WorkletPlayer(BASE_URL, () => undefined);
    await expect(player.load(scoreWith(0), () => undefined)).rejects.toThrow('HTTP 404');
    indexStatus = 200;
    await loadFully(player, scoreWith(0));
    expect(nodes).toHaveLength(1);
  });

  it('drops the commands after a failed start', async () => {
    indexStatus = 404;
    const player = new WorkletPlayer(BASE_URL, () => undefined);
    await expect(player.load(scoreWith(0), () => undefined)).rejects.toThrow('HTTP 404');
    let rejections = 0;
    const count = (): void => {
      rejections += 1;
    };
    process.on('unhandledRejection', count);
    player.play(0);
    player.seek(1);
    player.setVolume(0.5);
    await flush();
    process.off('unhandledRejection', count);
    expect(rejections).toBe(0);
    expect(nodes).toHaveLength(0);
  });

  it('rejects the pending load when the Worker script does not load', async () => {
    const player = new WorkletPlayer(BASE_URL, () => undefined);
    const loading = player.load(scoreWith(0), () => undefined);
    await flush();
    last(workers).fail();
    expect(await stateOf(loading)).toBe('rejected');
    await expect(loading).rejects.toThrow('The decode Worker failed.');
    expect(last(workers).terminated).toBe(true);
    await loadFully(player, scoreWith(0));
    expect(workers).toHaveLength(2);
    expect(nodes).toHaveLength(2);
  });

  it('stops the clock and reports a processor failure during play', async () => {
    const errors: string[] = [];
    const player = new WorkletPlayer(BASE_URL, (error) => {
      errors.push(error.message);
    });
    await loadFully(player, scoreWith(0));
    player.play(0);
    const node = last(nodes);
    const context = last(contexts);
    node.port.reply({ type: 'anchor', anchor: { contextTime: 1, songTime: 0, rate: 1, load: 1 } });
    context.currentTime = 1.5;
    expect(player.now()).toBeCloseTo(0.5);

    node.port.reply({ type: 'error', message: 'RangeError' });
    expect(errors).toEqual(['The audio processor failed: RangeError']);
    expect(node.connected).toBe(false);
    context.currentTime = 1.8;
    expect(player.now()).toBeCloseTo(0.5);
    const sent = node.port.commands.length;
    player.pause();
    expect(node.port.commands).toHaveLength(sent);

    await loadFully(player, scoreWith(0));
    expect(nodes).toHaveLength(2);
    expect(errors).toHaveLength(1);
  });
});

describe('WorkletPlayer resume', () => {
  it('reports a rejected resume to the error listener', async () => {
    const errors: string[] = [];
    const player = new WorkletPlayer(BASE_URL, (error) => {
      errors.push(error.message);
    });
    await loadFully(player, scoreWith(0));
    last(contexts).resumeError = new Error('NotAllowedError');
    let rejections = 0;
    const count = (): void => {
      rejections += 1;
    };
    process.on('unhandledRejection', count);
    player.play(0);
    await flush();
    process.off('unhandledRejection', count);
    expect(rejections).toBe(0);
    expect(errors).toEqual(['The audio context did not start: Error: NotAllowedError']);
  });
});

describe('WorkletPlayer loads at the same time', () => {
  it('rejects the earlier load, and resolves the later one after its own banks', async () => {
    const player = new WorkletPlayer(BASE_URL, () => undefined);
    const progress: number[] = [];
    const first = player.load(scoreWith(0), (done) => {
      progress.push(done);
    });
    await flush();
    const worker = last(workers);
    const node = last(nodes);
    const [firstRequest] = worker.requests;
    if (!firstRequest) {
      throw new Error('The first load sent no decode request.');
    }
    worker.decode(firstRequest);
    await flush();

    const second = player.load(scoreWith(40), () => undefined);
    expect(await stateOf(first)).toBe('rejected');
    await expect(first).rejects.toBeInstanceOf(LoadReplacedError);
    worker.progress(firstRequest, 1);
    expect(progress).toEqual([]);
    const secondRequest = last(worker.requests);
    expect(secondRequest.urls).toEqual(['https://zoophony.test/sf/0/40.sf3']);
    worker.decode(secondRequest);
    await flush();
    expect(node.port.commands.map((command) => command.type)).toEqual([
      'score',
      'banks',
      'score',
      'banks',
    ]);

    // The first ready reply belongs to the banks of the first load.
    node.port.reply({ type: 'ready', banks: 1 });
    expect(await stateOf(second)).toBe('pending');
    node.port.reply({ type: 'ready', banks: 1 });
    expect(await stateOf(second)).toBe('resolved');
  });
});

describe('WorkletPlayer session banks (design 6.3)', () => {
  it('asks the Worker only for the presets that the synth does not have', async () => {
    const player = new WorkletPlayer(BASE_URL, () => undefined);
    await loadFully(player, scoreWith(0));
    await loadFully(player, scoreWith(0));
    await loadFully(player, scoreWith(40));
    const urls = last(workers).requests.map((request) => request.urls);
    const banks = last(nodes).port.commands.flatMap((command) =>
      command.type === 'banks' ? [command.banks.map((bank) => bank.id)] : [],
    );

    expect(urls).toEqual([
      ['https://zoophony.test/sf/0/0.sf3'],
      [],
      ['https://zoophony.test/sf/0/40.sf3'],
    ]);
    expect(banks).toEqual(urls);
    expect(player.pcmBytes).toBe(16);
  });

  it('asks the Worker for all presets again after a failure', async () => {
    const player = new WorkletPlayer(BASE_URL, () => undefined);
    await loadFully(player, scoreWith(0));
    last(nodes).port.reply({ type: 'error', message: 'RangeError' });
    await loadFully(player, scoreWith(0));

    expect(last(workers).requests.map((request) => request.urls)).toEqual([
      ['https://zoophony.test/sf/0/0.sf3'],
    ]);
    expect(player.pcmBytes).toBe(8);
  });
});

describe('WorkletPlayer output chain (design 6.8)', () => {
  /**
   * Gives the one target of a fake node.
   *
   * @throws Error if the node has not exactly one target.
   */
  function onlyTarget(node: FakeAudioNode): FakeTarget | undefined {
    expect(node.targets).toHaveLength(1);
    return node.targets[0];
  }

  /**
   * Gives a value as a fake node of a class.
   *
   * @throws Error if the value is not an instance of the class.
   */
  function as<T extends FakeTarget>(value: FakeTarget | undefined, type: new () => T): T {
    if (!(value instanceof type)) {
      throw new Error(`The node is not a ${type.name}.`);
    }
    return value;
  }

  it('sends the synth through a dry path and the hall reverb to the limiter', async () => {
    const player = new WorkletPlayer(BASE_URL, () => undefined);
    await loadFully(player, scoreWith(0));
    const context = last(contexts);
    const input = as(last(nodes).target, FakeGain);
    const [dryNode, convolverNode] = input.targets;
    const dry = as(dryNode, FakeGain);
    const convolver = as(convolverNode, FakeConvolver);
    const wet = as(onlyTarget(convolver), FakeGain);
    const limiter = as(onlyTarget(dry), FakeCompressor);
    expect(onlyTarget(wet)).toBe(limiter);
    const trim = as(onlyTarget(limiter), FakeGain);
    expect(onlyTarget(trim)).toBe(context.destination);

    expect(dry.gain.value).toBe(DRY_GAIN);
    expect(wet.gain.value).toBe(WET_GAIN);
    expect(trim.gain.value).toBeCloseTo(10 ** (LIMITER_TRIM_DB / 20), 12);
    expect(convolver.normalize).toBe(false);
    expect(convolver.buffer).toEqual({ bytes: IMPULSE_BYTES });
    expect({
      threshold: limiter.threshold.value,
      knee: limiter.knee.value,
      ratio: limiter.ratio.value,
      attack: limiter.attack.value,
      release: limiter.release.value,
    }).toEqual(LIMITER);
  });

  it('limits the peaks above -2 dBFS hard, with a short attack', () => {
    expect(LIMITER.threshold).toBe(-2);
    expect(LIMITER.knee).toBe(0);
    expect(LIMITER.ratio).toBe(20);
    expect(LIMITER.attack).toBeLessThanOrEqual(0.003);
  });

  it('removes the makeup gain of the compressor, which Chromium measures as +1.14 dB', () => {
    // An OfflineAudioContext of Chromium 153 gave -28.86 dBFS for a sine at -30 dBFS with the
    // settings of LIMITER (design 6.8).
    expect(LIMITER_TRIM_DB).toBeCloseTo(-1.14, 2);
  });

  it('decodes the impulse response one time for the player, also after a failure', async () => {
    const player = new WorkletPlayer(BASE_URL, () => undefined);
    await loadFully(player, scoreWith(0));
    last(nodes).port.reply({ type: 'error', message: 'RangeError' });
    await loadFully(player, scoreWith(40));
    expect(nodes).toHaveLength(2);
    expect(last(contexts).decodes).toBe(1);
    expect(last(nodes).target).toBe(nodes[0]?.target);
  });

  it('sets the gain of the piece with its score, and 0 dB with no gain', async () => {
    const player = new WorkletPlayer(BASE_URL, () => undefined);
    await loadFully(player, { ...scoreWith(0), gainDb: -6 });
    const input = as(last(nodes).target, FakeGain);
    expect(input.gain.value).toBeCloseTo(0.501, 3);
    await loadFully(player, scoreWith(0));
    expect(input.gain.value).toBe(1);
  });

  it('replaces the pan and the reverb send of the file with the mix (design 6.1)', async () => {
    const score = scoreOf({
      tracks: [
        [
          programChange(0, 0, 0),
          controlChange(0, 0, PAN_CONTROLLER, 0),
          noteOn(480, 0, 60),
          noteOff(1440, 0, 60),
        ],
      ],
    });
    const player = new WorkletPlayer(BASE_URL, () => undefined);
    await loadFully(player, { ...score, mix: [{ channel: 0, pan: 100, reverbSend: 70 }] });
    const sent = last(nodes).port.commands.find((command) => command.type === 'score');
    if (sent?.type !== 'score') {
      throw new Error('The player sent no score.');
    }
    const { table } = sent;
    const controls = [...table.kind.keys()]
      .filter((i) => table.kind[i] === 0xb0)
      .map((i) => [table.timeSec[i], table.data1[i], table.data2[i]]);
    expect(controls).toEqual([
      [0, PAN_CONTROLLER, 100],
      [0, REVERB_SEND_CONTROLLER, 70],
    ]);
  });
});
