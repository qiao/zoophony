import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DecodeReply, DecodeRequest } from './decode-messages.ts';
import { WorkletPlayer } from './player.ts';
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
 * Makes a score with one note of a program.
 *
 * @param program The GM program, which must be in {@link INDEX}.
 * @returns The score.
 */
function scoreOf(program: number): PlayerScore {
  return {
    durationSec: 2,
    synthEvents: [
      { timeSec: 0, channel: 0, kind: 0xc0, data1: program, data2: 0, seatIndex: -1 },
      { timeSec: 0.5, channel: 0, kind: 0x90, data1: 60, data2: 100, seatIndex: 0 },
      { timeSec: 1.5, channel: 0, kind: 0x80, data1: 60, data2: 0, seatIndex: 0 },
    ],
    presets: [{ bank: 0, program, drumKit: false }],
  };
}

/** The port of a fake worklet node. It records the commands of the Player. */
class FakePort {
  readonly commands: ProcessorCommand[] = [];
  started = false;
  #listener: ((event: { data: ProcessorReply }) => void) | undefined;

  postMessage(command: ProcessorCommand): void {
    this.commands.push(command);
  }

  addEventListener(_type: 'message', listener: (event: { data: ProcessorReply }) => void): void {
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

/** A fake `AudioWorkletNode`. */
class FakeNode {
  readonly port = new FakePort();
  connected = false;

  constructor() {
    nodes.push(this);
  }

  connect(): void {
    this.connected = true;
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

  /** Sends the error event of a Worker script that did not load. */
  fail(): void {
    this.#listeners.get('error')?.({ message: '' });
  }

  /** Sends the decoded banks of a request, with 8 bytes for each file. */
  decode(request: DecodeRequest): void {
    const banks = request.urls.map((url) => ({ url, data: new ArrayBuffer(8) }));
    this.#listeners.get('message')?.({
      data: { type: 'decoded', id: request.id, banks, pcmBytes: banks.length * 8 },
    });
  }
}

/** The fake audio contexts of the players, the newest last. */
const contexts: FakeContext[] = [];

/** A fake `AudioContext` with the members that the Player reads. */
class FakeContext {
  readonly audioWorklet = { addModule: async (): Promise<void> => undefined };
  readonly destination = {};
  /** The tests move this time. `now()` reads it, because the timestamp is 0. */
  currentTime = 0;
  readonly outputLatency = 0;
  readonly baseLatency = 0;

  getOutputTimestamp(): AudioTimestamp {
    return { contextTime: 0, performanceTime: 0 };
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
    vi.fn(async () => new Response(JSON.stringify(INDEX), { status: indexStatus })),
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
    await loadFully(player, scoreOf(0));
    const types = last(nodes).port.commands.map((command) => command.type);
    expect(types).toEqual(['score', 'rate', 'volume', 'banks']);
    expect(last(nodes).port.commands).toContainEqual({ type: 'rate', rate: 1.25 });
    expect(last(nodes).port.commands).toContainEqual({ type: 'volume', gain: 0.5 });
  });
});

describe('WorkletPlayer failures', () => {
  it('starts the engine again on the next load after a failed start', async () => {
    indexStatus = 404;
    const player = new WorkletPlayer(BASE_URL, () => undefined);
    await expect(player.load(scoreOf(0), () => undefined)).rejects.toThrow('HTTP 404');
    indexStatus = 200;
    await loadFully(player, scoreOf(0));
    expect(nodes).toHaveLength(1);
  });

  it('drops the commands after a failed start', async () => {
    indexStatus = 404;
    const player = new WorkletPlayer(BASE_URL, () => undefined);
    await expect(player.load(scoreOf(0), () => undefined)).rejects.toThrow('HTTP 404');
    let rejections = 0;
    const count = (): void => {
      rejections += 1;
    };
    process.on('unhandledRejection', count);
    player.play();
    player.seek(1);
    player.setVolume(0.5);
    await flush();
    process.off('unhandledRejection', count);
    expect(rejections).toBe(0);
    expect(nodes).toHaveLength(0);
  });

  it('rejects the pending load when the Worker script does not load', async () => {
    const player = new WorkletPlayer(BASE_URL, () => undefined);
    const loading = player.load(scoreOf(0), () => undefined);
    await flush();
    last(workers).fail();
    expect(await stateOf(loading)).toBe('rejected');
    await expect(loading).rejects.toThrow('The decode Worker failed.');
    expect(last(workers).terminated).toBe(true);
    await loadFully(player, scoreOf(0));
    expect(workers).toHaveLength(2);
    expect(nodes).toHaveLength(2);
  });

  it('stops the clock and reports a processor failure during play', async () => {
    const errors: string[] = [];
    const player = new WorkletPlayer(BASE_URL, (error) => {
      errors.push(error.message);
    });
    await loadFully(player, scoreOf(0));
    player.play();
    const node = last(nodes);
    const context = last(contexts);
    node.port.reply({ type: 'anchor', anchor: { contextTime: 1, songTime: 0, rate: 1 } });
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

    await loadFully(player, scoreOf(0));
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
    await loadFully(player, scoreOf(0));
    last(contexts).resumeError = new Error('NotAllowedError');
    let rejections = 0;
    const count = (): void => {
      rejections += 1;
    };
    process.on('unhandledRejection', count);
    player.play();
    await flush();
    process.off('unhandledRejection', count);
    expect(rejections).toBe(0);
    expect(errors).toEqual(['The audio context did not start: Error: NotAllowedError']);
  });
});
