import type { InstrumentId } from '../models/instruments/types.ts';

/**
 * The kind of motion of a player (design 5.3). Each family has its own note layer. The
 * conductor has the patterns of design 5.4.
 */
export type MotionFamily =
  | 'bowed'
  | 'woodwind'
  | 'brass'
  | 'keyboard'
  | 'harp'
  | 'percussion'
  | 'choir'
  | 'conductor';

/** The motion family of each instrument model (design 4.6, 5.3). */
export const MOTION_FAMILIES = {
  violin: 'bowed',
  viola: 'bowed',
  cello: 'bowed',
  contrabass: 'bowed',
  harp: 'harp',
  piano: 'keyboard',
  'choir-folder': 'choir',
  flute: 'woodwind',
  oboe: 'woodwind',
  clarinet: 'woodwind',
  bassoon: 'woodwind',
  horn: 'brass',
  trumpet: 'brass',
  trombone: 'brass',
  tuba: 'brass',
  timpani: 'percussion',
  'bass-drum': 'percussion',
  'snare-drum': 'percussion',
  cymbals: 'percussion',
  'small-percussion': 'percussion',
  xylophone: 'percussion',
  baton: 'conductor',
} as const satisfies Readonly<Record<InstrumentId, MotionFamily>>;

/** The instruments of one or more motion families. */
export type InstrumentOf<F extends MotionFamily> = {
  [K in InstrumentId]: (typeof MOTION_FAMILIES)[K] extends F ? K : never;
}[InstrumentId];

/**
 * Tells whether an instrument belongs to one of some motion families.
 *
 * @param id The instrument.
 * @param families The motion families.
 * @returns Whether the family of the instrument is one of them.
 */
export function isInFamily<F extends MotionFamily>(
  id: InstrumentId,
  families: readonly F[],
): id is InstrumentOf<F> {
  const family = MOTION_FAMILIES[id];
  return families.some((f) => f === family);
}
