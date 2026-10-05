/** One entry of `sf/index.json`, which the SF3 split script writes (design 6.2). */
export interface PresetFileEntry {
  /** The bank of the preset. Drum kits use bank 128. */
  readonly bank: number;
  readonly program: number;
  readonly drumKit: boolean;
  /** The path of the SF3 file, relative to the site root, such as `sf/0/40.sf3`. */
  readonly file: string;
  /** The size of the file in bytes. */
  readonly size: number;
}
