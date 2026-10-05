import { BasicMIDI } from 'spessasynth_core';
import { describe, expect, it } from 'vitest';

import { patchedDemos } from '../../tools/patch-demos.ts';
import { parseMidi } from './parse.ts';

/** The demo files. The tests read the source bytes, before the changes of the programs. */
const DEMOS = await patchedDemos();

describe('parseMidi with the demo files', () => {
  it.each(DEMOS)('gives the channel events of $file that spessasynth_core reads', (demo) => {
    const bytes = demo.source;
    const name = demo.file;
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
