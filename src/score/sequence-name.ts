/**
 * The generic sequence names of design 8.2, in any case: "control track" (LilyPond writes it),
 * "conductor" (MuseScore writes it), "untitled", "sequence", and "track" with a number.
 */
const GENERIC_NAME = /^(?:control track|conductor|untitled|sequence|track ?\d+)$/i;

/** Any letter of any script. */
const LETTER = /\p{L}/u;

/**
 * Keeps a sequence name that can be the title of a dropped file (design 8.2). A name with no
 * letter and a generic name give ''. The title is then the file name.
 *
 * @param name The name of the first track (FF 03), with no space at its start or end.
 * @returns The name, or '' for a name that is not a title.
 */
export function titleSequenceName(name: string): string {
  return LETTER.test(name) && !GENERIC_NAME.test(name) ? name : '';
}
