import type { Quat, Vec3 } from '../math.ts';
import type { MaterialGroup, Rgb } from '../mesh.ts';
import type { BoneName, InstrumentParent } from '../rig.ts';

/**
 * The instrument models of design 4.6. A player carries one model with all its pieces, for
 * example the violin and its bow, or the kettles of the timpani and two mallets.
 */
export type InstrumentId =
  | 'violin'
  | 'viola'
  | 'cello'
  | 'contrabass'
  | 'harp'
  | 'piano'
  | 'choir-folder'
  | 'flute'
  | 'oboe'
  | 'clarinet'
  | 'bassoon'
  | 'horn'
  | 'trumpet'
  | 'trombone'
  | 'tuba';

/** The bones that carry the pieces of an instrument (design 4.7). */
export type InstrumentBone = Extract<
  BoneName,
  'instrument' | 'slide' | 'bow' | 'malletL' | 'malletR' | 'baton'
>;

/** One solid of one color, as a corner list in the axes of its piece. */
export interface InstrumentPart {
  /** 9 numbers for each triangle, counterclockwise from outside, in meters. */
  readonly corners: readonly number[];
  readonly color: Rgb;
  readonly group: MaterialGroup;
}

/**
 * The body point that the origin of a piece goes to in the bind pose. `floor` is the origin of
 * the player model: the floor under the seat, or under a standing player. `instrument` is the
 * origin of the `instrument` piece, for a piece that follows the instrument (the trombone slide).
 */
export type HoldAnchor = 'floor' | 'head' | 'mouth' | 'palmL' | 'palmR' | 'instrument';

/** The place of a piece in the bind pose (design 4.6, 4.7). */
export interface PieceHold {
  readonly anchor: HoldAnchor;
  /** The offset of the piece origin from the anchor, in head heights `H` of the player. */
  readonly offsetH: Vec3;
  /** A further offset in meters. It is in the axes of the instrument piece for `instrument`. */
  readonly offset: Vec3;
  /** The rotation of the piece axes in the model axes, or in the instrument axes for `instrument`. */
  readonly rotation: Quat;
}

/**
 * One rigid piece of an instrument. All its parts follow one bone (design 4.4). The origin of the
 * piece axes is the bind position of that bone.
 */
export interface InstrumentPiece {
  readonly bone: InstrumentBone;
  readonly parts: readonly InstrumentPart[];
  readonly hold: PieceHold;
}

/** A point on one piece, in the axes of that piece. */
export interface PiecePoint {
  readonly bone: InstrumentBone;
  readonly at: Vec3;
}

/**
 * The points where the player touches the instrument in the playing pose. `null` means that the
 * body part does not touch it.
 */
export interface InstrumentGrips {
  /** The middle of the left palm. */
  readonly palmL: PiecePoint | null;
  /** The middle of the right palm. */
  readonly palmR: PiecePoint | null;
  /** The point at the mouth: the lip plate, the reed, or the mouthpiece. */
  readonly mouth: PiecePoint | null;
  /** The point under the chin: the chin rest of the violin and the viola. */
  readonly chin: PiecePoint | null;
}

/**
 * The kind of a place that the pose of step 5 aims at (design 4.7, 5.3).
 *
 * - `bow-contact`: the point on the strings where the bow plays.
 * - `fingerboard`: the line on the strings from the nut to the end of the fingerboard.
 * - `bow-hair`: the line of the bow hair from the frog to the tip.
 * - `strings`: the line across the harp strings at their middle, from the lowest string.
 * - `keyboard`: the line over the piano keys, from the lowest key to the highest.
 */
export type PlayTargetKind =
  | 'bow-contact'
  | 'fingerboard'
  | 'bow-hair'
  | 'strings'
  | 'keyboard'
  | 'slide'
  | 'bell';

/** A point or a line on a piece that the pose of step 5 aims at. */
export interface PlayTarget {
  readonly kind: PlayTargetKind;
  readonly bone: InstrumentBone;
  /** The point, or the start of the line, in the axes of the piece. */
  readonly from: Vec3;
  /** The end of the line. It is equal to `from` for a point. */
  readonly to: Vec3;
  /** The unit direction out of the surface, toward the hand, the bow, or the mallet. */
  readonly normal: Vec3;
  /** The MIDI keys at `from` and at `to`, for a line that follows the pitch. */
  readonly keys: readonly [low: number, high: number] | null;
}

/** The geometry and the play data of one instrument, with no Three.js object. */
export interface InstrumentModel {
  readonly id: InstrumentId;
  /** The parent of the `instrument` bone (design 4.7). */
  readonly parent: InstrumentParent;
  /** The main piece is first: the `instrument` piece, or the only hand piece. */
  readonly pieces: readonly InstrumentPiece[];
  readonly grips: InstrumentGrips;
  readonly targets: readonly PlayTarget[];
  /** The size of the box around the main piece, in its own axes, in meters. */
  readonly size: Vec3;
}
