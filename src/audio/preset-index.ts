import { DRUM_KIT_BANK } from '../score/synth.ts';
import type { ScorePreset } from '../score/types.ts';

/** The path of the preset index from the site root (design 6.2). */
export const INDEX_FILE = 'sf/index.json';

/** One entry of `sf/index.json`, which the SF3 split script writes (design 6.2). */
export interface PresetFileEntry extends ScorePreset {
  /** The path of the SF3 file, relative to the site root, such as `sf/0/40.sf3`. */
  readonly file: string;
  /** The size of the file in bytes. */
  readonly size: number;
}

/**
 * Finds the files of the presets of a score in the index (design 6.2). A preset with no file
 * falls back to its program in bank 0. A drum kit with no file falls back to kit 0.
 *
 * @param index The entries of `sf/index.json`.
 * @param presets The presets of the score.
 * @returns The entries to load, each one time, in the order of the presets.
 * @throws Error if the index has neither the preset nor its fallback.
 */
export function resolvePresetFiles(
  index: readonly PresetFileEntry[],
  presets: readonly ScorePreset[],
): PresetFileEntry[] {
  const find = (bank: number, program: number): PresetFileEntry | undefined =>
    index.find((entry) => entry.bank === bank && entry.program === program);
  const files = new Map<string, PresetFileEntry>();
  for (const preset of presets) {
    const entry =
      find(preset.bank, preset.program) ??
      (preset.drumKit ? find(DRUM_KIT_BANK, 0) : find(0, preset.program));
    if (!entry) {
      throw new Error(
        `sf/index.json has no file for bank ${preset.bank}, program ${preset.program}.`,
      );
    }
    files.set(entry.file, entry);
  }
  return [...files.values()];
}
