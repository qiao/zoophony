import { describe, expect, it } from 'vitest';

import { decodeWav } from './wav.ts';

/** The parts of a test WAV file. */
interface TestWav {
  readonly tag: number;
  readonly channels: number;
  readonly sampleRate: number;
  readonly bits: number;
  readonly data: Uint8Array;
  /** A chunk before the data chunk, such as a LIST chunk. */
  readonly extra?: Uint8Array;
  /** Write the tag as the sub-format of WAVE_FORMAT_EXTENSIBLE. */
  readonly extensible?: boolean;
}

function chunk(id: string, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + body.length + (body.length % 2));
  out.set(new TextEncoder().encode(id), 0);
  new DataView(out.buffer).setUint32(4, body.length, true);
  out.set(body, 8);
  return out;
}

function makeWav(wav: TestWav): Uint8Array {
  const fmt = new Uint8Array(wav.extensible ? 40 : 16);
  const view = new DataView(fmt.buffer);
  view.setUint16(0, wav.extensible ? 0xfffe : wav.tag, true);
  if (wav.extensible) {
    view.setUint16(16, 22, true);
    view.setUint16(24, wav.tag, true);
  }
  view.setUint16(2, wav.channels, true);
  view.setUint32(4, wav.sampleRate, true);
  view.setUint32(8, (wav.sampleRate * wav.channels * wav.bits) / 8, true);
  view.setUint16(12, (wav.channels * wav.bits) / 8, true);
  view.setUint16(14, wav.bits, true);
  const parts = [chunk('fmt ', fmt), ...(wav.extra ? [chunk('LIST', wav.extra)] : [])];
  parts.push(chunk('data', wav.data));
  const body = new Uint8Array(4 + parts.reduce((sum, part) => sum + part.length, 0));
  body.set(new TextEncoder().encode('WAVE'), 0);
  let offset = 4;
  for (const part of parts) {
    body.set(part, offset);
    offset += part.length;
  }
  return chunk('RIFF', body);
}

describe('decodeWav', () => {
  it('decodes 16-bit stereo PCM into one array for each channel', () => {
    const data = new Uint8Array(8);
    const view = new DataView(data.buffer);
    view.setInt16(0, 16_384, true);
    view.setInt16(2, -32_768, true);
    view.setInt16(4, 0, true);
    view.setInt16(6, 8_192, true);
    const audio = decodeWav(makeWav({ tag: 1, channels: 2, sampleRate: 44_100, bits: 16, data }));

    expect(audio.sampleRate).toBe(44_100);
    expect(audio.channels.map((channel) => [...channel])).toEqual([
      [0.5, 0],
      [-1, 0.25],
    ]);
  });

  it('decodes 24-bit PCM with the sign of the top byte, after an odd-sized chunk', () => {
    // -0.5 is 0xC00000, and 0.25 is 0x200000, both little-endian.
    const data = Uint8Array.from([0x00, 0x00, 0xc0, 0x00, 0x00, 0x20]);
    const extra = Uint8Array.from([1, 2, 3]);
    const audio = decodeWav(
      makeWav({ tag: 1, channels: 1, sampleRate: 48_000, bits: 24, data, extra }),
    );

    expect([...(audio.channels[0] ?? [])]).toEqual([-0.5, 0.25]);
  });

  it('decodes 32-bit float samples, also in a WAVE_FORMAT_EXTENSIBLE file', () => {
    const data = new Uint8Array(new Float32Array([0.75, -0.125]).buffer);
    const plain = decodeWav(makeWav({ tag: 3, channels: 1, sampleRate: 48_000, bits: 32, data }));
    const extensible = decodeWav(
      makeWav({ tag: 3, channels: 1, sampleRate: 48_000, bits: 32, data, extensible: true }),
    );

    expect([...(plain.channels[0] ?? [])]).toEqual([0.75, -0.125]);
    expect([...(extensible.channels[0] ?? [])]).toEqual([0.75, -0.125]);
  });

  it('refuses a file that is not a RIFF WAVE file', () => {
    expect(() => decodeWav(new TextEncoder().encode('OggS and more bytes'))).toThrow('RIFF WAVE');
  });

  it('refuses an unsupported format', () => {
    const data = new Uint8Array(4);
    expect(() =>
      decodeWav(makeWav({ tag: 2, channels: 1, sampleRate: 8000, bits: 16, data })),
    ).toThrow('format tag 2');
  });
});
