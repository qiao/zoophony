import type { SectionId, Technique } from './types.ts';

/**
 * The place of a melodic program in the orchestra (design 3.5). A program has a fixed section,
 * or it divides its notes by pitch across the string sections or the brass sections. The
 * programs 44 and 45 take the section of their channel (`channel`).
 */
export type ProgramPlace =
  | { readonly kind: 'section'; readonly section: SectionId }
  | { readonly kind: 'divided'; readonly bands: PitchBands }
  | { readonly kind: 'channel' };

/** The pitch bands of a program that divides its notes by pitch (design 3.5). */
export type PitchBands = 'strings' | 'brass';

/** A pitch band: the lowest key of the band and its section. */
type Band = readonly [lowestKey: number, section: SectionId];

/**
 * The bands of the string sections, from the highest section down. Each boundary is the lowest
 * note of the higher instrument.
 */
const STRING_BANDS: readonly Band[] = [
  [55, 'violin'],
  [48, 'viola'],
  [36, 'cello'],
  [0, 'contrabass'],
];

/** The bands of the brass sections, from the highest section down. */
const BRASS_BANDS: readonly Band[] = [
  [65, 'trumpet'],
  [53, 'horn'],
  [40, 'trombone'],
  [0, 'tuba'],
];

/** The ranges of GM programs, as `[first, last, section]`, from the table of design 3.5. */
const SECTIONS: readonly (readonly [first: number, last: number, section: SectionId])[] = [
  [0, 8, 'piano'],
  [16, 23, 'piano'],
  [9, 15, 'percussion'],
  [112, 119, 'percussion'],
  [24, 31, 'harp'],
  [46, 46, 'harp'],
  [104, 108, 'harp'],
  [32, 39, 'contrabass'],
  [43, 43, 'contrabass'],
  [40, 40, 'violin'],
  [110, 110, 'violin'],
  [41, 41, 'viola'],
  [42, 42, 'cello'],
  [47, 47, 'timpani'],
  [52, 54, 'choir'],
  [56, 56, 'trumpet'],
  [59, 59, 'trumpet'],
  [57, 57, 'trombone'],
  [58, 58, 'tuba'],
  [60, 60, 'horn'],
  [64, 67, 'clarinet'],
  [71, 71, 'clarinet'],
  [68, 69, 'oboe'],
  [109, 109, 'oboe'],
  [111, 111, 'oboe'],
  [70, 70, 'bassoon'],
  [72, 79, 'flute'],
  [55, 55, 'sound-only'],
  [80, 87, 'sound-only'],
  [96, 103, 'sound-only'],
  [120, 127, 'sound-only'],
];

/**
 * Finds the place of a melodic program in the orchestra (design 3.5).
 *
 * @param program The GM program, 0 to 127.
 * @returns The fixed section, the pitch bands of a program that divides by pitch, or `channel`
 *   for the programs 44 and 45.
 */
export function programPlace(program: number): ProgramPlace {
  if (program === 44 || program === 45) {
    return { kind: 'channel' };
  }
  if ((program >= 48 && program <= 51) || (program >= 88 && program <= 95)) {
    return { kind: 'divided', bands: 'strings' };
  }
  if (program >= 61 && program <= 63) {
    return { kind: 'divided', bands: 'brass' };
  }
  const range = SECTIONS.find(([first, last]) => program >= first && program <= last);
  return { kind: 'section', section: range?.[2] ?? 'sound-only' };
}

/**
 * Finds the section of a note of a program that divides by pitch (design 3.5).
 *
 * @param bands The pitch bands of the program.
 * @param pitch The MIDI key, 0 to 127.
 * @returns The section of the band that holds the key.
 */
export function sectionByPitch(bands: PitchBands, pitch: number): SectionId {
  const list = bands === 'strings' ? STRING_BANDS : BRASS_BANDS;
  const band = list.find(([lowestKey]) => pitch >= lowestKey) ?? list.at(-1);
  return band?.[1] ?? 'sound-only';
}

/**
 * Finds the technique of a melodic program (design 3.5). Program 44 is tremolo. Programs 45 and
 * 32 to 39 are pizzicato, because a bass guitar is plucked, and MuseScore plays contrabass
 * pizzicato with program 32.
 *
 * @param program The GM program, 0 to 127.
 * @returns The technique.
 */
export function techniqueOf(program: number): Technique {
  if (program === 44) {
    return 'tremolo';
  }
  if (program === 45 || (program >= 32 && program <= 39)) {
    return 'pizzicato';
  }
  return 'normal';
}

/**
 * Tells if a GM program has a long sound, so that its held notes start again after a seek, a
 * pause, or an unmute (design 6.5). These programs have a long sound: organs, bowed strings,
 * string ensembles, choirs, brass, reeds, pipes, synth leads, synth pads, the bagpipe, the
 * fiddle, and the shanai. Pizzicato
 * (45), harp (46), timpani (47), the orchestra hit (55), and the synth effects (96 to 103)
 * decay. A rhythm channel never starts held notes again, whatever its program.
 *
 * @param program The GM program, 0 to 127.
 * @returns True for a long sound.
 */
export function sustainsAfterSeek(program: number): boolean {
  return (
    (program >= 16 && program <= 23) ||
    (program >= 40 && program <= 44) ||
    (program >= 48 && program <= 54) ||
    (program >= 56 && program <= 95) ||
    (program >= 109 && program <= 111)
  );
}
