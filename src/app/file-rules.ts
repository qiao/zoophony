import { MAX_FILE_BYTES } from '../midi/parse.ts';
import { buildScore } from '../score/score.ts';
import type { FileError, Score, SectionSize } from '../score/types.ts';

/** The message text of each reason to refuse a file (design 2.8, 3.3). */
export const FILE_ERROR_TEXTS = {
  'not-midi': 'This file is not a valid MIDI file.',
  'format-2': 'This MIDI file uses format 2. The player supports format 0 and format 1 only.',
  'too-large': 'This file is larger than 4 MB. Select a smaller file.',
  'no-notes': 'This MIDI file has no notes.',
} as const satisfies Readonly<Record<FileError, string>>;

/** The text of the drop overlay (design 2.8). */
export const DROP_TEXT = 'Drop the MIDI file to play it.';

/**
 * The file types of the file dialog: the extensions and the media types of a Standard MIDI File.
 * The dialog offers these files first. A file of another type still goes through the file rules.
 */
export const MIDI_FILE_TYPES = '.mid,.midi,audio/midi,audio/x-midi';

/** The part of a `File` that {@link readScoreFile} reads. A test can give a fake file. */
export interface FileSource {
  /** The size of the file, in bytes. */
  readonly size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/** The result of a file read: the score and the bytes, or the reason to refuse the file. */
export type FileReadResult =
  | {
      readonly ok: true;
      readonly score: Score;
      /** The bytes of the file. A change of the section size builds the score again from them. */
      readonly bytes: Uint8Array;
    }
  | { readonly ok: false; readonly error: FileError };

/**
 * Reads a file that the user selected or dropped, and builds its score (design 2.1, 3.3). A file
 * of more than 4 MB gets its refusal before the read, so that the page does not read a large
 * file into the memory.
 *
 * @param file The file.
 * @param sectionSize The value of the setting "Section size".
 * @returns The score and the bytes, or the reason to refuse the file.
 */
export async function readScoreFile(
  file: FileSource,
  sectionSize: SectionSize,
): Promise<FileReadResult> {
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: 'too-large' };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = buildScore(bytes, sectionSize);
  return result.ok ? { ok: true, score: result.score, bytes } : result;
}

/** The two lines of the title at the top left of the page (design 2.8). */
export interface TitleLines {
  readonly title: string;
  /** The second line: the composer of a demo, or the name of a file of the user. */
  readonly composer: string;
}

/**
 * Gives the title lines of a file that the user selected or dropped (design 8.2). The title is
 * the sequence name of the file, else the file name with no extension. The second line shows the
 * file name.
 *
 * @param sequenceName `Score.sequenceName`: '' for no name or a generic name.
 * @param fileName The name of the file, for example `bolero.mid`.
 * @returns The title and the second line.
 */
export function fileTitle(sequenceName: string, fileName: string): TitleLines {
  if (sequenceName) {
    return { title: sequenceName, composer: fileName };
  }
  const stem = fileName.replace(/\.[^.]*$/u, '');
  return { title: stem || fileName, composer: fileName };
}

/**
 * Tells if a drag carries files. The drop overlay shows only for files, so that a drag of a text
 * or a link does not show it.
 *
 * @param types The `DataTransfer.types` of the drag.
 * @returns True if the drag carries one or more files.
 */
export function dragHasFiles(types: readonly string[]): boolean {
  return types.includes('Files');
}
