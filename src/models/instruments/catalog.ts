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
import type { BowGrip } from './strings.ts';
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
 * Builds the geometry and the play data of an instrument (design 4.6). The model holds no
 * Three.js object.
 *
 * @param id The instrument.
 * @param kettles The number of kettles of the timpani (design 4.6). The other instruments
 *   ignore it.
 * @param scale The scale of the violin, the cello, or the contrabass and its bow for the species of
 *   the player (`instrumentScale()` of `models/species.ts`). The other instruments ignore it.
 * @param bowGrip The grip of the bow in the right paw of the species of the player
 *   (`SpeciesParams.bowGrip`), or `undefined` for the grip of the bind pose of the bow. The
 *   instruments with no bow ignore it.
 * @returns The model.
 */
export function buildInstrument(
  id: InstrumentId,
  kettles: KettleCount = 4,
  scale = 1,
  bowGrip?: BowGrip,
): InstrumentModel {
  switch (id) {
    case 'violin':
    case 'cello':
    case 'contrabass':
      return buildBowedString(id, scale, bowGrip);
    case 'viola':
      return buildBowedString(id, 1, bowGrip);
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
