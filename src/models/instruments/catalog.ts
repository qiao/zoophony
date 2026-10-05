import { buildHarp } from './harp.ts';
import { buildPiano } from './piano.ts';
import { buildBrass } from './brass.ts';
import { buildChoirFolder } from './folder.ts';
import { buildBowedString } from './strings.ts';
import { buildWoodwind } from './woodwinds.ts';
import type { InstrumentId, InstrumentModel } from './types.ts';

/** All instruments of design 4.6, in the order of the inventory. */
export const INSTRUMENT_IDS = [
  'violin',
  'viola',
  'cello',
  'contrabass',
  'harp',
  'piano',
  'choir-folder',
  'flute',
  'oboe',
  'clarinet',
  'bassoon',
  'horn',
  'trumpet',
  'trombone',
  'tuba',
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
  harp: 800,
  piano: 1500,
  'choir-folder': 500,
  flute: 500,
  oboe: 500,
  clarinet: 500,
  bassoon: 500,
  horn: 500,
  trumpet: 500,
  trombone: 500,
  tuba: 500,
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
    case 'harp':
      return buildHarp();
    case 'piano':
      return buildPiano();
    case 'choir-folder':
      return buildChoirFolder();
    case 'flute':
    case 'oboe':
    case 'clarinet':
    case 'bassoon':
      return buildWoodwind(id);
    case 'horn':
    case 'trumpet':
    case 'trombone':
    case 'tuba':
      return buildBrass(id);
    default: {
      const unhandled: never = id;
      throw new Error(`The instrument "${String(unhandled)}" is not known.`);
    }
  }
}
