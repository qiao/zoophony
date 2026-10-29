import { describe, expect, it } from 'vitest';

import { note, programChange, trackName, writeSmf } from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';
import { FILE_ERROR_TEXTS, dragHasFiles, fileTitle, readScoreFile } from './file-rules.ts';
import type { FileSource } from './file-rules.ts';

/** A file of one track with one violin note and a sequence name. */
const VIOLIN: TestFile = {
  tracks: [[trackName('Spring'), programChange(0, 0, 40), ...note(0, 0, 76)]],
};

/**
 * Gives a fake file that holds bytes.
 *
 * @param bytes The bytes of the file.
 * @returns The file.
 */
function fileOf(bytes: Uint8Array<ArrayBuffer>): FileSource {
  return new Blob([bytes]);
}

describe('readScoreFile (design 3.3)', () => {
  it('builds the score of a valid file and keeps its bytes', async () => {
    const bytes = writeSmf(VIOLIN);
    const result = await readScoreFile(fileOf(bytes), 'auto');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.score.seats.map((seat) => seat.section)).toEqual(['violin']);
      expect(result.score.sequenceName).toBe('Spring');
      expect(result.bytes).toEqual(bytes);
    }
  });

  it('refuses a file that is not MIDI, a file of format 2, and a file with no notes', async () => {
    const text = new TextEncoder().encode('This is not a MIDI file.');
    expect(await readScoreFile(fileOf(text), 'auto')).toEqual({ ok: false, error: 'not-midi' });
    const format2 = writeSmf({ format: 2, tracks: VIOLIN.tracks });
    expect(await readScoreFile(fileOf(format2), 'auto')).toEqual({
      ok: false,
      error: 'format-2',
    });
    const silent = writeSmf({ tracks: [[trackName('Silence')]] });
    expect(await readScoreFile(fileOf(silent), 'auto')).toEqual({ ok: false, error: 'no-notes' });
  });

  it('refuses a file of more than 4,000,000 bytes before it reads the file', async () => {
    let reads = 0;
    const large: FileSource = {
      size: 4_000_001,
      arrayBuffer: async () => {
        reads++;
        return new ArrayBuffer(0);
      },
    };
    expect(await readScoreFile(large, 'auto')).toEqual({ ok: false, error: 'too-large' });
    expect(reads).toBe(0);
  });

  it('refuses a file that the page cannot read', async () => {
    const folder: FileSource = {
      size: 0,
      arrayBuffer: async () => {
        throw new Error('NotReadableError');
      },
    };
    expect(await readScoreFile(folder, 'auto')).toEqual({ ok: false, error: 'not-midi' });
  });

  it('builds the players of the section size', async () => {
    const bytes = writeSmf(VIOLIN);
    const one = await readScoreFile(fileOf(bytes), 'one-per-part');
    const full = await readScoreFile(fileOf(bytes), 'full');
    expect(one.ok && one.score.seats[0]?.playerCount).toBe(1);
    expect(full.ok && full.score.seats[0]?.playerCount).toBe(4);
  });
});

describe('FILE_ERROR_TEXTS (design 2.8)', () => {
  it('holds the message texts of the design', () => {
    expect(FILE_ERROR_TEXTS).toEqual({
      'not-midi': 'This file is not a valid MIDI file.',
      'format-2': 'This MIDI file uses format 2. The player supports format 0 and format 1 only.',
      'too-large': 'This file is larger than 4 MB. Select a smaller file.',
      'no-notes': 'This MIDI file has no notes.',
    });
  });
});

describe('fileTitle (design 8.2)', () => {
  it('uses the sequence name, and shows the file name on the second line', () => {
    expect(fileTitle('Bolero', 'ravel.mid')).toEqual({ title: 'Bolero', composer: 'ravel.mid' });
  });

  it('uses the file name with no extension when the file has no usable name', () => {
    // The second line stays empty, so that the page does not show the name two times.
    expect(fileTitle('', 'ravel-bolero.mid')).toEqual({ title: 'ravel-bolero', composer: '' });
    expect(fileTitle('', 'suite.no.2.midi').title).toBe('suite.no.2');
    expect(fileTitle('', 'song').title).toBe('song');
    expect(fileTitle('', '.mid').title).toBe('.mid');
  });
});

describe('dragHasFiles (design 2.8)', () => {
  it('shows the drop overlay only for a drag of files', () => {
    expect(dragHasFiles(['Files'])).toBe(true);
    expect(dragHasFiles(['text/plain', 'text/uri-list'])).toBe(false);
  });
});
