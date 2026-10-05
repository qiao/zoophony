import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { parseMidi } from '../src/midi/parse.ts';
import {
  controlChange,
  noteOff,
  noteOn,
  programChange,
  sysEx,
  trackName,
  writeSmf,
} from '../src/midi/test-smf.ts';
import {
  applyPatch,
  checkDemo,
  DEMOS_DIR,
  parsePatches,
  patchedDemos,
  programOffsets,
  readChecksums,
  sha256,
} from './patch-demos.ts';
import type { DemoFile } from './patch-demos.ts';

/** Lists the programs of the program changes of each track, with `parseMidi()`. */
function trackPrograms(bytes: Uint8Array): number[][] {
  const result = parseMidi(bytes);
  if (!result.ok) {
    throw new Error(`The file was refused: ${result.error}.`);
  }
  return result.file.tracks.map((track) =>
    track.events.flatMap((event) =>
      event.type === 'channel' && event.kind === 0xc0 ? [event.data1] : [],
    ),
  );
}

describe('applyPatch', () => {
  const file = writeSmf({
    runningStatus: true,
    tracks: [
      [trackName('control track')],
      [programChange(0, 0, 68), noteOn(0, 0, 60), noteOff(480, 0, 60)],
      [
        programChange(0, 1, 70),
        // Running status: the second program change has no status byte.
        programChange(0, 1, 71),
        sysEx(10, [0x41, 0x10]),
        controlChange(20, 1, 7, 100),
        programChange(30, 1, 69),
        noteOn(30, 1, 50),
        noteOff(500, 1, 50),
      ],
    ],
  });

  it('sets the program of all program changes in one track (design 8.3)', () => {
    const result = applyPatch(file, { file: 'test.mid', setProgram: [{ track: 2, program: 52 }] });

    expect(trackPrograms(result)).toEqual([[], [68], [52, 52, 52]]);
    expect(result).toHaveLength(file.length);
  });

  it('finds the program bytes after running status, SysEx, and a control change', () => {
    const offsets = programOffsets(file, 2);

    expect(offsets).toHaveLength(3);
    expect(offsets.map((offset) => file[offset])).toEqual([70, 71, 69]);
  });

  it('does not change the input bytes', () => {
    const copy = Uint8Array.from(file);
    applyPatch(file, { file: 'test.mid', setProgram: [{ track: 1, program: 60 }] });

    expect(file).toEqual(copy);
  });

  it.each<readonly [string, number, number, string]>([
    ['a track that does not exist', 3, 52, 'no track 3'],
    ['a track with no program change', 0, 52, 'track 0 has no program change'],
    ['a program above 127', 1, 128, 'program 128'],
  ])('refuses %s', (_name, track, program, message) => {
    expect(() => applyPatch(file, { file: 'test.mid', setProgram: [{ track, program }] })).toThrow(
      message,
    );
  });
});

describe('the checksums of demos/README.md', () => {
  it('gives a SHA-256 for each demo input', async () => {
    const checksums = readChecksums(await readFile(join(DEMOS_DIR, 'README.md'), 'utf8'));

    expect([...checksums.keys()].toSorted()).toEqual([
      'beethoven-5.mid',
      'boulanger-matin.mid',
      'grieg-ase.mid',
      'handel-hallelujah.mid',
      'mozart-k315.mid',
      'mozart-k488.mid',
    ]);
  });

  it('refuses a file with a different SHA-256', () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const checksums = new Map([['a.mid', sha256(new Uint8Array([1, 2, 4]))]]);

    expect(() => checkDemo('a.mid', bytes, checksums)).toThrow('demos/README.md gives');
    expect(() => checkDemo('b.mid', bytes, checksums)).toThrow('has no SHA-256');
    expect(() => checkDemo('a.mid', new Uint8Array([1, 2, 4]), checksums)).not.toThrow();
  });
});

describe('parsePatches', () => {
  it('refuses an entry with no integer track', () => {
    const text = JSON.stringify([{ file: 'a.mid', setProgram: [{ track: '5', program: 60 }] }]);

    expect(() => parsePatches(text)).toThrow('not valid');
  });
});

describe('the demo files after demos/patches.json (design 8.3)', () => {
  let demos: DemoFile[];
  let sources: Map<string, Uint8Array>;

  beforeAll(async () => {
    demos = await patchedDemos();
    sources = new Map(
      await Promise.all(
        demos.map(
          async (demo) =>
            [demo.file, new Uint8Array(await readFile(join(DEMOS_DIR, 'src', demo.file)))] as const,
        ),
      ),
    );
  });

  /** The tracks and the new program of each change of demos/README.md. */
  const CHANGES = new Map<string, ReadonlyMap<number, number>>([
    [
      'beethoven-5.mid',
      new Map([
        [5, 60],
        [6, 56],
      ]),
    ],
    [
      'handel-hallelujah.mid',
      new Map([
        [9, 52],
        [10, 52],
        [11, 52],
        [12, 52],
      ]),
    ],
  ]);

  it('gives all six demo files', () => {
    expect(demos.map((demo) => demo.file)).toEqual([
      'beethoven-5.mid',
      'boulanger-matin.mid',
      'grieg-ase.mid',
      'handel-hallelujah.mid',
      'mozart-k315.mid',
      'mozart-k488.mid',
    ]);
  });

  it('gives the new programs to the changed tracks, and keeps all other programs', () => {
    for (const demo of demos) {
      const before = trackPrograms(sources.get(demo.file) ?? new Uint8Array());
      const changes = CHANGES.get(demo.file) ?? new Map<number, number>();
      const expected = before.map((programs, track) => {
        const program = changes.get(track);
        return program === undefined ? programs : programs.map(() => program);
      });

      expect(trackPrograms(demo.bytes), demo.file).toEqual(expected);
    }
  });

  it('changes only the program bytes', () => {
    for (const demo of demos) {
      const source = sources.get(demo.file) ?? new Uint8Array();
      const changed = [...demo.bytes.keys()].filter((i) => demo.bytes[i] !== source[i]);
      const changes = CHANGES.get(demo.file) ?? new Map<number, number>();
      const allowed = new Set(
        [...changes.keys()].flatMap((track) => programOffsets(source, track)),
      );

      expect(demo.bytes, demo.file).toHaveLength(source.length);
      expect(
        changed.every((i) => allowed.has(i)),
        demo.file,
      ).toBe(true);
    }
  });

  it('changes the woodwind programs of demo 1 and demo 5', () => {
    const programs = new Map(
      demos.map((demo) => [demo.file, trackPrograms(demo.bytes).map((list) => [...new Set(list)])]),
    );

    expect(programs.get('beethoven-5.mid')?.slice(5, 7)).toEqual([[60], [56]]);
    expect(programs.get('handel-hallelujah.mid')?.slice(9, 13)).toEqual([[52], [52], [52], [52]]);
  });
});
