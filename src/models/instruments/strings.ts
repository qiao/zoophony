import { INSTRUMENT_COLORS } from '../colors.ts';
import {
  DEG,
  IDENTITY,
  add,
  applyTransform,
  basisRotation,
  cross,
  multiply,
  normalize,
  reject,
  rotate,
  scale,
  transform,
} from '../math.ts';
import type { Quat, Transform, Vec3 } from '../math.ts';
import type { MeshBuilder } from '../mesh.ts';
import { box, cylinder, icosphere, prism } from '../primitives.ts';
import type { OutlinePoint } from '../primitives.ts';
import { RABBIT_HEAD_HEIGHT } from '../species.ts';
import { PieceBuilder, hold, pieceSize } from './piece.ts';
import type { InstrumentModel, InstrumentPiece, PlayTarget } from './types.ts';

/**
 * The scale of the instrument models (design 4.6). The sizes of {@link VIOLIN} and {@link BOW} fit
 * a rabbit with a head height of 0.30 m, so the scale is the head height of the rabbit divided by
 * 0.30. With H 0.38 m, it is 1.27. The hold of each instrument applies it.
 */
export const INSTRUMENT_SCALE = RABBIT_HEAD_HEIGHT / 0.3;

/**
 * The sizes of the violin model, in meters before the {@link INSTRUMENT_SCALE}. The viola is this
 * model at 1.15 scale (4.6).
 */
export const VIOLIN = {
  length: 0.4,
  bodyLength: 0.24,
  bodyThickness: 0.04,
  /** The distance of the bridge from the tail end. */
  bridge: 0.095,
  /** The height of the strings above the bottom of the body at the bridge. */
  stringHeight: 0.068,
  /** The distance of the bow contact point from the tail end, between the bridge and the fingerboard. */
  bowContact: 0.11,
  /** The distance of the hand position on the neck from the tail end. */
  neckGrip: 0.27,
  /** The width of the strip that shows the four strings. */
  stringsWidth: 0.008,
} as const;

/** The sizes of the bow model, in meters before the {@link INSTRUMENT_SCALE}. */
export const BOW = {
  length: 0.45,
  /** The distance of the hand from the frog end. */
  grip: 0.03,
  /** The distance from the stick to the hair. */
  hairGap: 0.012,
} as const;

/**
 * The scale of each bowed string, as a factor of the violin model (design 4.6). The viola
 * is the violin at 1.15 scale. The cello is 1.20 m from the tail end to the scroll, and the
 * contrabass is the cello at 1.6 scale.
 */
export const STRING_SCALES = {
  violin: INSTRUMENT_SCALE,
  viola: INSTRUMENT_SCALE * 1.15,
  cello: 1.2 / VIOLIN.length,
  contrabass: (1.6 * 1.2) / VIOLIN.length,
} as const;

/** The length of the end pin of the cello below the tail end, in meters (design 4.6). */
export const CELLO_END_PIN = 0.2;

/**
 * The scale of the bow of the cello and of the contrabass, as a factor of the bow model: 0.63 m.
 * The violin and the viola use the bow at the {@link INSTRUMENT_SCALE}: 0.57 m (design 4.6).
 */
export const LOW_BOW_SCALE = INSTRUMENT_SCALE * 1.1;

/**
 * The hold of the violin and the viola under the chin (design 4.6). `player.ts` keeps a copy of
 * these values for step 3, until it attaches the instrument with `attachInstrument()`.
 */
const CHIN_HOLD = {
  /** The tail end of the violin from the head center, in head heights: left, down, and front. */
  offsetH: [-0.1, -0.6, -0.3],
  /** The turn of the violin to the left of the front. */
  yaw: 70 * DEG,
  /** The tilt of the scroll below the horizontal. */
  pitch: 8 * DEG,
  /** The turn of the top plate from up to the front. */
  roll: 50 * DEG,
} as const;

/**
 * The holds of the cello between the knees and of the contrabass at the left side of the player
 * (design 4.6). The end pin tip stands on the floor at the offset from the floor under the seat:
 * `offsetH` in head heights, then `offset` in meters. The instrument leans along `axis`, and its
 * top plate faces `front` as far as the axis permits.
 */
const UPRIGHT_HOLDS = {
  cello: {
    offsetH: [0, 0, -0.42],
    offset: [0, 0, -0.44],
    axis: [0, Math.cos(25 * DEG), Math.sin(25 * DEG)],
    front: [0, 0, -1],
  },
  contrabass: {
    offsetH: [-0.2, 0, -0.5],
    offset: [-0.25, 0, -0.35],
    axis: [0.18, 1, 0.22],
    front: [0.35, 0, -1],
  },
} as const satisfies Readonly<
  Record<'cello' | 'contrabass', Readonly<Record<'offsetH' | 'offset' | 'axis' | 'front', Vec3>>>
>;

/** The points of a violin that the pose needs, in the axes of the model. */
export interface ViolinAnchors {
  /** The point on the strings where the bow plays. */
  readonly bowContact: Vec3;
  /** The unit direction from the tail end to the scroll. */
  readonly axis: Vec3;
  /** The unit normal of the top plate: the strings are on this side. */
  readonly top: Vec3;
  /** The point under the neck that the left hand holds. */
  readonly neckGrip: Vec3;
}

/** The points of a bow in its bind pose, in the axes of the model. */
export interface BowAnchors {
  /** The point that the right hand holds. */
  readonly grip: Vec3;
  /** The unit direction from the frog to the tip. */
  readonly axis: Vec3;
  /** The unit direction from the stick to the hair. */
  readonly hairSide: Vec3;
  /** The distance from the stick to the hair, in meters. */
  readonly hairGap: number;
}

/**
 * The outline of the body around its center, counterclockwise from +y: the upper bout at +x
 * (the neck side), the waist, and the lower bout at -x (the tail side).
 */
const BODY_HALF: readonly OutlinePoint[] = [
  [0.12, 0],
  [0.11, -0.035],
  [0.085, -0.055],
  [0.055, -0.057],
  [0.03, -0.045],
  [0, -0.04],
  [-0.03, -0.045],
  [-0.06, -0.065],
  [-0.09, -0.068],
  [-0.11, -0.05],
  [-0.12, 0],
];

const BODY_OUTLINE: readonly OutlinePoint[] = [
  ...BODY_HALF,
  ...BODY_HALF.slice(1, -1)
    .toReversed()
    .map(([x, z]): OutlinePoint => [x, -z]),
];

/**
 * Places a part in a frame. The frame has no scale.
 *
 * @param frame The frame.
 * @param local The placement of the part in the frame.
 * @returns The placement in the axes of the frame parent.
 */
function inFrame(frame: Transform, local: Transform): Transform {
  return transform(
    applyTransform(frame, local.position),
    multiply(frame.rotation, local.rotation),
    local.scale,
  );
}

/**
 * Adds the parts of the violin model to a piece. In the violin axes, the violin runs along +x
 * from the tail end at the origin to the scroll. The top plate faces +y, and the bottom of the
 * body is at y = 0.
 *
 * @param piece The piece that gets the parts.
 * @param frame The placement of the violin axes in the piece axes, before the piece scale.
 * @param upright Whether the model is a cello or a contrabass. These have the cello wood and no
 *   chin rest (design 4.5, instrument colors).
 */
function addViolinParts(piece: PieceBuilder, frame: Transform, upright: boolean): void {
  const v = VIOLIN;
  const wood = upright ? INSTRUMENT_COLORS.celloWood : INSTRUMENT_COLORS.violinWood;
  const dark = INSTRUMENT_COLORS.fingerboard;
  const part = (
    corners: number[],
    color: readonly [number, number, number],
    at: Vec3,
    rotation?: Quat,
  ): void => {
    piece.add(corners, color, inFrame(frame, transform(at, rotation)));
  };

  part(prism(BODY_OUTLINE, 0, v.bodyThickness), wood, [v.bodyLength / 2, 0, 0]);
  // The neck, the pegbox, and the scroll.
  part(box(0.1, 0.02, 0.022), wood, [v.bodyLength + 0.045, v.bodyThickness - 0.002, 0]);
  part(box(0.045, 0.025, 0.02), wood, [0.355, v.bodyThickness + 0.002, 0]);
  part(icosphere(0.018, 0), wood, [0.385, v.bodyThickness + 0.008, 0]);
  // The fingerboard over the neck and the upper body, and the tailpiece and the chin rest.
  part(box(0.17, 0.008, 0.026), dark, [0.255, v.bodyThickness + 0.016, 0]);
  part(box(0.05, 0.006, 0.03), dark, [0.04, v.bodyThickness + 0.008, 0]);
  if (!upright) {
    part(box(0.04, 0.012, 0.05), dark, [0.018, v.bodyThickness + 0.006, 0.03]);
  }
  // The bridge, and the strings as one thin dark strip (design 4.5, instrument colors).
  part(box(0.004, 0.024, 0.032), INSTRUMENT_COLORS.bowHair, [v.bridge, v.bodyThickness + 0.012, 0]);
  part(box(0.27, 0.002, v.stringsWidth), INSTRUMENT_COLORS.strings, [
    0.2,
    v.stringHeight - 0.001,
    0,
  ]);
}

/**
 * Adds the parts of the bow model to a piece. In the bow axes, the bow runs along +x from the frog
 * at the origin to the tip, and the hair is below the stick (-y).
 *
 * @param piece The piece that gets the parts.
 * @param frame The placement of the bow axes in the piece axes, before the piece scale.
 */
function addBowParts(piece: PieceBuilder, frame: Transform): void {
  const b = BOW;
  const part = (corners: number[], color: readonly [number, number, number], at: Vec3): void => {
    piece.add(corners, color, inFrame(frame, transform(at)));
  };
  part(box(b.length, 0.006, 0.006), INSTRUMENT_COLORS.bowStick, [b.length / 2, 0, 0]);
  part(box(b.length - 0.05, 0.002, 0.008), INSTRUMENT_COLORS.bowHair, [
    b.length / 2,
    -b.hairGap,
    0,
  ]);
  part(box(0.035, 0.016, 0.01), INSTRUMENT_COLORS.fingerboard, [0.02, -0.007, 0]);
  part(box(0.012, 0.014, 0.007), INSTRUMENT_COLORS.bowStick, [b.length - 0.006, -0.006, 0]);
}

/**
 * Adds the parts of a piece to a mesh at a placement.
 *
 * @param builder The mesh.
 * @param piece The parts.
 * @param at The placement of the piece axes.
 * @param bone The bone of all parts.
 */
function addPieceParts(
  builder: MeshBuilder,
  piece: PieceBuilder,
  at: Transform,
  bone: number,
): void {
  for (const part of piece.build('instrument', hold('floor')).parts) {
    builder.add(part.corners, { color: part.color, group: part.group, bone, at });
  }
}

/**
 * Adds a violin to a mesh. In its own axes, the violin runs along +x from the tail end at the
 * origin to the scroll. The top plate faces +y, and the bottom of the body is at y = 0. Step 3
 * uses this function. Step 4 builds the violin with {@link buildBowedString}.
 *
 * @param builder The mesh that gets the parts.
 * @param at The placement of the violin in the axes of the model. Its scale is the size factor.
 * @param bone The bone that the violin follows.
 * @returns The points that the pose needs.
 */
export function addViolin(builder: MeshBuilder, at: Transform, bone: number): ViolinAnchors {
  const v = VIOLIN;
  const piece = new PieceBuilder();
  addViolinParts(piece, transform(), false);
  addPieceParts(builder, piece, at, bone);
  const toModel = (p: Vec3): Vec3 => applyTransform(at, p);
  return {
    bowContact: toModel([v.bowContact, v.stringHeight, 0]),
    axis: rotate(at.rotation, [1, 0, 0]),
    top: rotate(at.rotation, [0, 1, 0]),
    neckGrip: toModel([v.neckGrip, v.bodyThickness - 0.01, 0]),
  };
}

/**
 * Adds a bow to a mesh. In its own axes, the bow runs along +x from the frog at the origin to the
 * tip, and the hair is below the stick (-y). Step 3 uses this function. Step 4 builds the bow
 * with {@link buildBowedString}.
 *
 * @param builder The mesh that gets the parts.
 * @param at The placement of the bow in the axes of the model, in its bind pose. Its scale is the
 *   size factor.
 * @param bone The bone that the bow follows.
 * @returns The grip and the directions of the bow in its bind pose.
 */
export function addBow(builder: MeshBuilder, at: Transform, bone: number): BowAnchors {
  const b = BOW;
  const piece = new PieceBuilder();
  addBowParts(piece, transform());
  addPieceParts(builder, piece, at, bone);
  return {
    grip: applyTransform(at, [b.grip, 0, 0]),
    axis: rotate(at.rotation, [1, 0, 0]),
    hairSide: rotate(at.rotation, [0, -1, 0]),
    hairGap: b.hairGap * at.scale[1],
  };
}

/**
 * Calculates the rotation of the violin axes under the chin (design 4.6).
 *
 * @returns The rotation from the violin axes to the model axes.
 */
function chinRotation(): Quat {
  const h = CHIN_HOLD;
  const axis: Vec3 = [
    -Math.sin(h.yaw) * Math.cos(h.pitch),
    -Math.sin(h.pitch),
    -Math.cos(h.yaw) * Math.cos(h.pitch),
  ];
  const up = normalize(reject([0, 1, 0], axis));
  // `front` is normal to the axis and to up, on the side of the audience.
  const front = normalize(cross(axis, up));
  const top = normalize(add(scale(up, Math.cos(h.roll)), scale(front, Math.sin(h.roll))));
  return basisRotation(axis, top);
}

/** The bow piece of a bowed string, and its targets. */
interface BowPiece {
  readonly piece: InstrumentPiece;
  readonly targets: readonly PlayTarget[];
}

/**
 * Calculates the rotation of an upright instrument from its hold.
 *
 * @param id The cello or the contrabass.
 * @returns The rotation that turns the piece +y to the axis of the hold, and the piece -z (the
 *   top plate) to its front.
 */
function uprightRotation(id: keyof typeof UPRIGHT_HOLDS): Quat {
  const { axis, front } = UPRIGHT_HOLDS[id];
  const up = normalize(axis);
  const top = normalize(reject(front, up));
  return basisRotation(cross(up, scale(top, -1)), up);
}

/** The bowed strings of design 4.6. */
export type BowedStringId = 'violin' | 'viola' | 'cello' | 'contrabass';

/**
 * Builds the bow piece. In the piece axes, the grip is at the origin, the bow runs along +x to
 * the tip, and the hair is below the stick (-y). In the bind pose, the bow lies in the hanging
 * right hand, points to the left (-x), and has the hair down.
 *
 * @param size The scale of the bow model.
 * @returns The piece and its targets.
 */
function buildBow(size: number): BowPiece {
  const b = BOW;
  const piece = new PieceBuilder(size);
  addBowParts(piece, transform([-b.grip, 0, 0]));
  const hairY = -b.hairGap * size;
  return {
    piece: piece.build('bow', hold('palmR', [0, 0, -0.07], basisRotation([-1, 0, 0], [0, 1, 0]))),
    targets: [
      {
        kind: 'bow-hair',
        bone: 'bow',
        from: [(0.025 - b.grip) * size, hairY, 0],
        to: [(b.length - 0.025 - b.grip) * size, hairY, 0],
        normal: [0, -1, 0],
        keys: null,
      },
    ],
  };
}

/**
 * Builds a bowed string instrument and its bow (design 4.6).
 *
 * The violin and the viola use the violin axes: the tail end is at the origin, the violin runs
 * along +x to the scroll, and the top plate faces +y. The player holds them under the chin.
 *
 * The cello and the contrabass stand on the end pin: its tip is at the origin, the instrument
 * runs along +y to the scroll, and the top plate faces -z (the front of the player). The cello
 * stands between the knees, and the contrabass at the left side of the player.
 *
 * @param id The instrument.
 * @returns The model.
 */
export function buildBowedString(id: BowedStringId): InstrumentModel {
  const v = VIOLIN;
  const s = STRING_SCALES[id];
  const upright = id === 'cello' || id === 'contrabass';
  const pin = upright ? (CELLO_END_PIN * s) / STRING_SCALES.cello : 0;
  // The violin axes in the piece axes, before the scale: upright, the length is +y, the top is
  // -z, and the middle of the body depth is on the axis of the end pin.
  const frame = upright
    ? transform([0, pin / s, v.bodyThickness / 2], basisRotation([0, 1, 0], [0, 0, -1]))
    : transform([0, 0, 0], IDENTITY);
  const piece = new PieceBuilder(s);
  addViolinParts(piece, frame, upright);
  if (upright) {
    // The end pin, from the tail end down to the floor.
    piece.add(
      cylinder(0.004, 0.002, pin / s, 5),
      INSTRUMENT_COLORS.fingerboard,
      transform([0, 0, 0]),
    );
  }
  const at = (p: Vec3): Vec3 => scale(applyTransform(frame, p), s);
  const top = rotate(frame.rotation, [0, 1, 0]);
  const instrumentHold =
    id === 'cello' || id === 'contrabass'
      ? hold('floor', UPRIGHT_HOLDS[id].offsetH, uprightRotation(id), UPRIGHT_HOLDS[id].offset)
      : hold('head', CHIN_HOLD.offsetH, chinRotation());
  const instrument = piece.build('instrument', instrumentHold);
  const bow = buildBow(upright ? LOW_BOW_SCALE : INSTRUMENT_SCALE);
  const stringsY = v.stringHeight;
  return {
    id,
    parent: upright ? 'root' : 'chest',
    pieces: [instrument, bow.piece],
    grips: {
      palmL: { bone: 'instrument', at: at([v.neckGrip, v.bodyThickness - 0.035, 0]) },
      palmR: { bone: 'bow', at: [0, 0, 0] },
      mouth: null,
      chin: upright ? null : { bone: 'instrument', at: at([0.018, v.bodyThickness + 0.012, 0.03]) },
    },
    targets: [
      {
        kind: 'bow-contact',
        bone: 'instrument',
        from: at([v.bowContact, stringsY, 0]),
        to: at([v.bowContact, stringsY, 0]),
        normal: top,
        keys: null,
      },
      {
        kind: 'fingerboard',
        bone: 'instrument',
        from: at([0.335, stringsY, 0]),
        to: at([0.17, stringsY, 0]),
        normal: top,
        keys: null,
      },
      ...bow.targets,
    ],
    size: pieceSize(instrument),
  };
}
