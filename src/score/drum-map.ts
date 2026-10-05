/**
 * The player of a key on a rhythm channel (design 3.6). The timpanist sits in the section
 * `timpani`. The other players form the percussion seat of the channel.
 */
export type DrumPart = 'timpani' | PercussionPart;

/** A player of the percussion seat of a rhythm channel (design 3.6, 3.8). */
export type PercussionPart = 'bass-drum' | 'snare-drum' | 'cymbals' | 'small-percussion';

/** The players of a percussion seat, in the order of design 3.8. */
export const PERCUSSION_PARTS: readonly PercussionPart[] = [
  'bass-drum',
  'snare-drum',
  'cymbals',
  'small-percussion',
];

/** The GS and GM2 Orchestra kit. Its keys 41 to 53 are timpani. */
const ORCHESTRA_KIT = 48;

/** The keys of the Orchestra kit that are not small percussion. */
const ORCHESTRA_KEYS: ReadonlyMap<number, DrumPart> = new Map<number, DrumPart>([
  [35, 'bass-drum'],
  [36, 'bass-drum'],
  [38, 'snare-drum'],
  [40, 'snare-drum'],
  [57, 'cymbals'],
  [59, 'cymbals'],
]);

/** The keys of the GM1 map that are not small percussion. */
const GM1_KEYS: ReadonlyMap<number, DrumPart> = new Map<number, DrumPart>([
  [41, 'timpani'],
  [43, 'timpani'],
  [45, 'timpani'],
  [47, 'timpani'],
  [48, 'timpani'],
  [50, 'timpani'],
  [35, 'bass-drum'],
  [36, 'bass-drum'],
  [37, 'snare-drum'],
  [38, 'snare-drum'],
  [40, 'snare-drum'],
  [42, 'cymbals'],
  [44, 'cymbals'],
  [46, 'cymbals'],
  [49, 'cymbals'],
  [51, 'cymbals'],
  [52, 'cymbals'],
  [55, 'cymbals'],
  [57, 'cymbals'],
  [59, 'cymbals'],
]);

/**
 * Finds the player of a key on a rhythm channel (design 3.6). The Orchestra kit (48) has its own
 * map. All other kits use the GM1 map, where the toms go to the timpanist.
 *
 * @param kit The drum kit: the program of the rhythm channel.
 * @param key The MIDI key, 0 to 127.
 * @returns The player of the key.
 */
export function drumPart(kit: number, key: number): DrumPart {
  if (kit === ORCHESTRA_KIT) {
    return key >= 41 && key <= 53 ? 'timpani' : (ORCHESTRA_KEYS.get(key) ?? 'small-percussion');
  }
  return GM1_KEYS.get(key) ?? 'small-percussion';
}
