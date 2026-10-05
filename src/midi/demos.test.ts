import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { BasicMIDI } from 'spessasynth_core';
import { describe, expect, it } from 'vitest';

import { parseMidi } from './parse.ts';

const DEMOS = join(import.meta.dirname, '..', '..', 'demos', 'src');

const FILES = [
  'beethoven-5.mid',
  'grieg-ase.mid',
  'mozart-k488.mid',
  'mozart-k315.mid',
  'handel-hallelujah.mid',
  'boulanger-matin.mid',
];

describe('parseMidi with the demo files', () => {
  it.each(FILES)('gives the channel events of %s that spessasynth_core reads', async (name) => {
    const bytes = new Uint8Array(await readFile(join(DEMOS, name)));
    const result = parseMidi(bytes);
    if (!result.ok) {
      throw new Error(`${name} was refused: ${result.error}.`);
    }
    const reference = BasicMIDI.fromArrayBuffer(bytes.slice().buffer);

    expect(result.file.format).toBe(1);
    expect(result.file.tracks).toHaveLength(reference.tracks.length);
    result.file.tracks.forEach((track, i) => {
      const ours = track.events.flatMap((event) =>
        event.type === 'channel'
          ? [[event.tick, event.kind | event.channel, event.data1, event.data2]]
          : [],
      );
      const theirs = (reference.tracks[i]?.events ?? [])
        .filter((event) => event.statusByte >= 0x80 && event.statusByte < 0xf0)
        .map((event) => [event.ticks, event.statusByte, event.data[0] ?? 0, event.data[1] ?? 0]);
      expect(ours).toEqual(theirs);
    });
  });
});
