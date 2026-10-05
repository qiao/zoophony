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

/** A fake decode Worker. The test sends its replies. */
class FakeWorker {
  readonly requests: DecodeRequest[] = [];
  #onMessage: ((event: { data: DecodeReply }) => void) | undefined;

  constructor() {
    workers.push(this);
  }

  postMessage(request: DecodeRequest): void {
    this.requests.push(request);
  }

  addEventListener(type: string, listener: (event: { data: DecodeReply }) => void): void {
    if (type === 'message') {
      this.#onMessage = listener;
    }
  }

  /** Sends the decoded banks of a request, with 8 bytes for each file. */
  decode(request: DecodeRequest): void {
    const banks = request.urls.map((url) => ({ url, data: new ArrayBuffer(8) }));
    this.#onMessage?.({
      data: { type: 'decoded', id: request.id, banks, pcmBytes: banks.length * 8 },
    });
  }
}

/** A fake `AudioContext` with the members that the Player reads. */
class FakeContext {
  readonly audioWorklet = { addModule: async (): Promise<void> => undefined };
  readonly destination = {};
  readonly currentTime = 0;
  readonly outputLatency = 0;
  readonly baseLatency = 0;

  getOutputTimestamp(): AudioTimestamp {
    return { contextTime: 0, performanceTime: 0 };
  }

  async resume(): Promise<void> {
    return undefined;
  }
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
  vi.stubGlobal('AudioContext', FakeContext);
  vi.stubGlobal('AudioWorkletNode', FakeNode);
  vi.stubGlobal('Worker', FakeWorker);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(INDEX), { status: 200 })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('WorkletPlayer commands before the first load', () => {
  it('sends the last rate and volume after the score', async () => {
    const player = new WorkletPlayer(BASE_URL);
    player.setRate(1.25);
    player.setVolume(0.5);
    await loadFully(player, scoreOf(0));
    const types = last(nodes).port.commands.map((command) => command.type);
    expect(types).toEqual(['score', 'rate', 'volume', 'banks']);
    expect(last(nodes).port.commands).toContainEqual({ type: 'rate', rate: 1.25 });
    expect(last(nodes).port.commands).toContainEqual({ type: 'volume', gain: 0.5 });
  });
});
