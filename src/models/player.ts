import { buildBiped, seated } from './biped.ts';
import type { BodyBones, Stance } from './biped.ts';
import type { Vec3 } from './math.ts';
import { MeshBuilder } from './mesh.ts';
import type { MeshData } from './mesh.ts';
import { CHAIR, HIGH_STOOL, STOOL } from './props.ts';
import type { Support } from './props.ts';
import { makeSkeleton } from './rig.ts';
import type { BoneName, Skeleton } from './rig.ts';
import { SPECIES } from './species.ts';
import type { SpeciesId } from './species.ts';
import { buildInstrument } from './instruments/catalog.ts';
import { attachInstrument } from './instruments/hold.ts';
import type { PlacedPiece } from './instruments/hold.ts';
import type { KettleCount } from './instruments/percussion.ts';
import { PIANO_BENCH } from './instruments/piano.ts';
import type { InstrumentBone, InstrumentId, InstrumentModel } from './instruments/types.ts';

/** The support of the player of each instrument (design 4.6, the column "Seat"). */
export const INSTRUMENT_SUPPORTS = {
  violin: 'chair',
  viola: 'chair',
  cello: 'chair',
  contrabass: 'high-stool',
  harp: 'stool',
  piano: 'bench',
  'choir-folder': 'riser',
  flute: 'chair',
  oboe: 'chair',
  clarinet: 'chair',
  bassoon: 'chair',
  horn: 'chair',
  trumpet: 'chair',
  trombone: 'chair',
  tuba: 'chair',
  timpani: 'stand',
  'bass-drum': 'stand',
  'snare-drum': 'stand',
  cymbals: 'stand',
  'small-percussion': 'stand',
  xylophone: 'stand',
  baton: 'stand',
} as const satisfies Readonly<Record<InstrumentId, Support>>;

/**
 * Gives the stance of a body on a support. A body on a seat rests its feet on the floor, or on
 * the foot ring of the high stool.
 *
 * @param support The support.
 * @returns The stance.
 */
export function stanceOn(support: Support): Stance {
  switch (support) {
    case 'chair':
      return seated(CHAIR.seatHeight);
    case 'stool':
      return seated(STOOL.seatHeight);
    case 'high-stool':
      return seated(HIGH_STOOL.seatHeight, HIGH_STOOL.footRing);
    case 'bench':
      return seated(PIANO_BENCH.seatHeight);
    case 'stand':
    case 'riser':
      return { kind: 'standing' };
    default: {
      const unhandled: never = support;
      throw new Error(`The support "${String(unhandled)}" is not known.`);
    }
  }
}

/** One player: an animal and its instrument as one skinned mesh (design 4.4). */
export interface PlayerModel {
  /** The support of the player. The origin of the model is the floor under its center. */
  readonly support: Support;
  readonly mesh: MeshData;
  readonly skeleton: Skeleton;
  readonly body: BodyBones;
  /** The instrument data, with the grips and the targets in the axes of its pieces. */
  readonly instrument: InstrumentModel;
  /** The pieces of the instrument at their places in the bind pose. */
  readonly pieces: readonly PlacedPiece[];
}

/**
 * Gives the bind positions of the instrument bones that carry no piece. A bone with no part moves
 * nothing, but each skeleton has all bones (design 4.7).
 *
 * @param body The body of the player.
 * @param placed The bind positions of the bones that carry a piece.
 * @returns The bind position of each instrument bone.
 */
function instrumentBones(body: BodyBones, placed: ReadonlyMap<InstrumentBone, Vec3>) {
  const instrument = placed.get('instrument') ?? body.positions.chest;
  return {
    instrument,
    slide: placed.get('slide') ?? instrument,
    bow: placed.get('bow') ?? body.palmR,
    malletL: placed.get('malletL') ?? body.palmL,
    malletR: placed.get('malletR') ?? body.palmR,
    baton: placed.get('baton') ?? body.palmR,
  } satisfies Readonly<Record<InstrumentBone, Vec3>>;
}

/**
 * Builds one player as one skinned mesh: the body of its species and its instrument with all its
 * pieces (design 4.4, 4.6, 4.7). The mesh is in its bind pose. The player faces -z, and the floor
 * under the seat, or under a standing player, is at y = 0. The support of the instrument
 * ({@link INSTRUMENT_SUPPORTS}) sets the stance of the body.
 *
 * @param species The species of the player.
 * @param instrument The instrument of the player.
 * @param kettles The number of kettles of the timpani (design 4.6). The other instruments ignore
 *   it.
 * @returns The mesh data, the skeleton, and the placed instrument that the pose needs.
 */
export function buildPlayer(
  species: SpeciesId,
  instrument: InstrumentId,
  kettles: KettleCount = 4,
): PlayerModel {
  const support = INSTRUMENT_SUPPORTS[instrument];
  const builder = new MeshBuilder();
  const body = buildBiped(builder, SPECIES[species], stanceOn(support));
  const model = buildInstrument(instrument, kettles);
  const placed = attachInstrument(builder, model, body);
  const positions = {
    ...body.positions,
    ...instrumentBones(body, placed.bones),
  } satisfies Readonly<Record<BoneName, Vec3>>;
  return {
    support,
    mesh: builder.build(),
    skeleton: makeSkeleton(positions, model.parent),
    body,
    instrument: model,
    pieces: placed.pieces,
  };
}
