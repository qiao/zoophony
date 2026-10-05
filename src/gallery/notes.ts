/** One note of the test note list of the gallery (design 7.1). */
export interface TestNote {
  /** The start, in seconds. */
  readonly start: number;
  /** The length, in seconds. */
  readonly length: number;
  /** The MIDI key, 0 to 127. 60 is C4. */
  readonly key: number;
}

/** The result of {@link parseTestNotes}: the notes, or the first line that is not valid. */
export type TestNotesResult =
  | { readonly ok: true; readonly notes: readonly TestNote[] }
  | { readonly ok: false; readonly line: number };

/** The test note list of a new gallery page: a C major chord, one note at a time, then a G3. */
export const DEFAULT_TEST_NOTES = [
  '0.0 0.5 C4',
  '0.5 0.5 E4',
  '1.0 0.5 G4',
  '1.5 1.0 C5',
  '3.0 1.0 G3',
].join('\n');

/** The steps of the natural notes above C, and the shift of a sharp and a flat. */
const NOTE_STEPS = new Map([
  ['C', 0],
  ['D', 2],
  ['E', 4],
  ['F', 5],
  ['G', 7],
  ['A', 9],
  ['B', 11],
  ['#', 1],
  ['b', -1],
]);

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/**
 * Reads a MIDI key from a number or a note name, such as `60`, `C4`, `F#3`, or `Bb2`.
 *
 * @param text The key. C4 is 60, and C-1 is 0.
 * @returns The key, or `null` if the text is not a key from 0 to 127.
 */
export function parseKey(text: string): number | null {
  let key = Number.NaN;
  const match = /^([A-G])([#b]?)(-?\d+)$/.exec(text);
  if (/^\d+$/.test(text)) {
    key = Number(text);
  } else if (match) {
    const step = NOTE_STEPS.get(match[1] ?? '') ?? 0;
    const shift = NOTE_STEPS.get(match[2] ?? '') ?? 0;
    key = (Number(match[3]) + 1) * 12 + step + shift;
  }
  return Number.isInteger(key) && key >= 0 && key <= 127 ? key : null;
}

/**
 * Gives the name of a MIDI key.
 *
 * @param key The key. 60 is C4.
 * @returns The name, for example `C4` or `F#3`.
 */
export function keyName(key: number): string {
  return `${NOTE_NAMES[key % 12] ?? 'C'}${Math.floor(key / 12) - 1}`;
}

/**
 * Reads the test note list. Each line holds the start and the length in seconds, and the key:
 * `1.5 0.5 C5`. Empty lines are ignored.
 *
 * @param text The list.
 * @returns The notes in the order of the lines, or the number of the first line that is not
 *   valid (1 is the first line).
 */
export function parseTestNotes(text: string): TestNotesResult {
  const notes: TestNote[] = [];
  for (const [i, line] of text.split('\n').entries()) {
    const words = line.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      continue;
    }
    const [start, length, key] = [Number(words[0]), Number(words[1]), parseKey(words[2] ?? '')];
    if (words.length !== 3 || !(start >= 0) || !(length > 0) || key === null) {
      return { ok: false, line: i + 1 };
    }
    notes.push({ start, length, key });
  }
  return { ok: true, notes };
}

/**
 * Finds the notes that sound at a time.
 *
 * @param notes The notes.
 * @param time The time, in seconds.
 * @returns The notes with `start <= time < start + length`.
 */
export function notesAt(notes: readonly TestNote[], time: number): TestNote[] {
  return notes.filter((note) => note.start <= time && time < note.start + note.length);
}
