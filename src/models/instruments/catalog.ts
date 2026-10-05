import { buildBowedString } from './strings.ts';
import type { InstrumentId, InstrumentModel } from './types.ts';

/** All instruments of design 4.6, in the order of the inventory. */
export const INSTRUMENT_IDS = [
  'violin',
  'viola',
  'cello',
  'contrabass',
] as const satisfies readonly InstrumentId[];

/**
 * The largest triangle count of each instrument with all its pieces (design 4.5, facets and
 * triangle budgets).
 */
export const INSTRUMENT_BUDGETS = {
  violin: 500,
  viola: 500,
  cello: 500,
  contrabass: 500,
} as const satisfies Readonly<Record<InstrumentId, number>>;

/**
 * Builds the geometry and the play data of an instrument (design 4.6). The model holds no
 * Three.js object.
 *
 * @param id The instrument.
 * @returns The model.
 */
export function buildInstrument(id: InstrumentId): InstrumentModel {
  switch (id) {
    case 'violin':
    case 'viola':
    case 'cello':
    case 'contrabass':
      return buildBowedString(id);
    default: {
      const unhandled: never = id;
      throw new Error(`The instrument "${String(unhandled)}" is not known.`);
    }
  }
}
