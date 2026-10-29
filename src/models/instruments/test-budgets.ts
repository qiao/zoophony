import type { InstrumentId } from './types.ts';

/**
 * The largest triangle count of each instrument with all its pieces (design 4.4, source meshes).
 * Only tests read it.
 */
export const INSTRUMENT_BUDGETS = {
  violin: 1200,
  viola: 1200,
  cello: 1200,
  contrabass: 1200,
  harp: 800,
  piano: 2000,
  'choir-folder': 800,
  flute: 800,
  oboe: 800,
  clarinet: 800,
  bassoon: 800,
  horn: 800,
  trumpet: 800,
  trombone: 800,
  tuba: 800,
  timpani: 1200,
  'bass-drum': 800,
  'snare-drum': 800,
  cymbals: 800,
  'small-percussion': 800,
  xylophone: 800,
  baton: 800,
} as const satisfies Readonly<Record<InstrumentId, number>>;
