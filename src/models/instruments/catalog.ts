import { buildHarp } from './harp.ts';
import {
  buildBassDrum,
  buildCymbals,
  buildSmallPercussion,
  buildSnareDrum,
  buildTimpani,
  buildXylophone,
} from './percussion.ts';
import type { KettleCount } from './percussion.ts';
import { buildPiano } from './piano.ts';
import { buildBaton } from './baton.ts';
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
  'timpani',
  'bass-drum',
  'snare-drum',
  'cymbals',
  'small-percussion',
  'xylophone',
  'baton',
] as const satisfies readonly InstrumentId[];

/**
 * The largest triangle count of each instrument with all its pieces (design 4.5, facets and
 * triangle budgets).
 */
export const INSTRUMENT_BUDGETS = {
  violin: 800,
  viola: 800,
  cello: 800,
  contrabass: 800,
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

/**
 * Builds the geometry and the play data of an instrument (design 4.6). The model holds no
 * Three.js object.
 *
 * @param id The instrument.
 * @param kettles The number of kettles of the timpani (design 4.6). The other instruments
 *   ignore it.
 * @returns The model.
 */
export function buildInstrument(id: InstrumentId, kettles: KettleCount = 4): InstrumentModel {
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
    case 'timpani':
      return buildTimpani(kettles);
    case 'bass-drum':
      return buildBassDrum();
    case 'snare-drum':
      return buildSnareDrum();
    case 'cymbals':
      return buildCymbals();
    case 'small-percussion':
      return buildSmallPercussion();
    case 'xylophone':
      return buildXylophone();
    case 'baton':
      return buildBaton();
    default: {
      const unhandled: never = id;
      throw new Error(`The instrument "${String(unhandled)}" is not known.`);
    }
  }
}
