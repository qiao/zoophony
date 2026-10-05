import type {
  ChannelKind,
  MidiError,
  MidiEvent,
  MidiFile,
  MidiParseResult,
  MidiTrack,
} from './types.ts';

/** An error inside the parser. `parseMidi()` returns its reason. */
class Refusal extends Error {
  readonly reason: MidiError;

  constructor(reason: MidiError, message: string) {
    super(message);
    this.reason = reason;
  }
}

/**
 * Parses the bytes of a Standard MIDI File into tracks of events in ticks (design 3.1, 3.3).
 *
 * The parser reads running status, also after a meta event or a SysEx event. It removes SysEx
 * and the meta events that the app does not use. It skips chunks that are not MTrk, and the
 * bytes of a track after its end of track event.
 *
 * @param bytes The bytes of the file.
 * @returns The file, or the reason to refuse it: `format-2` for a valid file of format 2, and
 *   `not-midi` for a file that is not a valid Standard MIDI File or that uses SMPTE time
 *   division.
 */
export function parseMidi(bytes: Uint8Array): MidiParseResult {
  try {
    return { ok: true, file: readFile(bytes) };
  } catch (error) {
    if (error instanceof Refusal) {
      return { ok: false, error: error.reason };
    }
    throw error;
  }
}

function readFile(bytes: Uint8Array): MidiFile {
  if (bytes.length < 14 || chunkId(bytes, 0) !== 'MThd') {
    throw new Refusal('not-midi', 'The file does not start with an MThd chunk.');
  }
  const headerLength = uint32(bytes, 4);
  const format = uint16(bytes, 8);
  const trackCount = uint16(bytes, 10);
  const division = uint16(bytes, 12);
  if (headerLength < 6 || format > 2 || trackCount === 0) {
    throw new Refusal('not-midi', 'The MThd chunk is not valid.');
  }
  if (division === 0 || division >= 0x8000) {
    throw new Refusal('not-midi', 'The time division is 0 or SMPTE.');
  }
  if (format === 2) {
    throw new Refusal('format-2', 'The file uses format 2.');
  }
  const tracks: MidiTrack[] = [];
  let pos = 8 + headerLength;
  while (tracks.length < trackCount && pos + 8 <= bytes.length) {
    const start = pos + 8;
    const length = uint32(bytes, pos + 4);
    if (chunkId(bytes, pos) === 'MTrk') {
      tracks.push(readTrack(bytes, start, Math.min(start + length, bytes.length)));
    }
    pos = start + length;
  }
  if (tracks.length === 0) {
    throw new Refusal('not-midi', 'The file has no MTrk chunk.');
  }
  return { format: format === 0 ? 0 : 1, ticksPerQuarter: division, tracks };
}

function readTrack(bytes: Uint8Array, start: number, end: number): MidiTrack {
  const reader = new TrackReader(bytes, start, end);
  const events: MidiEvent[] = [];
  let tick = 0;
  let status = 0;
  let endTick: number | undefined;
  while (endTick === undefined && !reader.done) {
    tick += reader.variableLength();
    const first = reader.peek();
    if (first === 0xff) {
      reader.skip(2);
      const type = bytes[reader.pos - 1];
      reader.skip(reader.variableLength());
      if (type === 0x2f) {
        endTick = tick;
      }
    } else if (first === 0xf0 || first === 0xf7) {
      reader.skip(1);
      reader.skip(reader.variableLength());
    } else {
      if (first >= 0x80) {
        status = first;
        reader.skip(1);
      }
      events.push(readChannelEvent(reader, status, tick));
    }
  }
  return { name: '', port: 0, endTick: endTick ?? tick, events };
}

function readChannelEvent(reader: TrackReader, status: number, tick: number): MidiEvent {
  const kind = status & 0xf0;
  if (!isChannelKind(kind)) {
    throw new Refusal('not-midi', `Track byte ${reader.pos} has no valid status.`);
  }
  const data1 = reader.dataByte();
  const data2 = kind === 0xc0 || kind === 0xd0 ? 0 : reader.dataByte();
  return { type: 'channel', tick, kind, channel: status & 0x0f, data1, data2 };
}

function isChannelKind(kind: number): kind is ChannelKind {
  return kind >= 0x80 && kind <= 0xe0;
}

/** A cursor over the bytes of one track chunk. Each read past the chunk refuses the file. */
class TrackReader {
  readonly #bytes: Uint8Array;
  readonly #end: number;
  #pos: number;

  constructor(bytes: Uint8Array, start: number, end: number) {
    this.#bytes = bytes;
    this.#pos = start;
    this.#end = end;
  }

  get pos(): number {
    return this.#pos;
  }

  get done(): boolean {
    return this.#pos >= this.#end;
  }

  peek(): number {
    if (this.done) {
      throw new Refusal('not-midi', 'A track event goes past the end of its chunk.');
    }
    return this.#bytes[this.#pos] ?? 0;
  }

  skip(count: number): void {
    if (this.#pos + count > this.#end) {
      throw new Refusal('not-midi', 'A track event goes past the end of its chunk.');
    }
    this.#pos += count;
  }

  dataByte(): number {
    const value = this.peek();
    if (value >= 0x80) {
      throw new Refusal('not-midi', `Track byte ${this.#pos} is not a data byte.`);
    }
    this.#pos += 1;
    return value;
  }

  /** Reads a variable-length quantity of at most 4 bytes. */
  variableLength(): number {
    let value = 0;
    for (let i = 0; i < 4; i += 1) {
      const byte = this.peek();
      this.#pos += 1;
      value = (value << 7) | (byte & 0x7f);
      if (byte < 0x80) {
        return value;
      }
    }
    throw new Refusal('not-midi', 'A variable-length number has more than 4 bytes.');
  }
}

function chunkId(bytes: Uint8Array, pos: number): string {
  return String.fromCodePoint(...bytes.subarray(pos, pos + 4));
}

function uint16(bytes: Uint8Array, pos: number): number {
  return ((bytes[pos] ?? 0) << 8) | (bytes[pos + 1] ?? 0);
}

function uint32(bytes: Uint8Array, pos: number): number {
  return uint16(bytes, pos) * 0x10000 + uint16(bytes, pos + 2);
}
