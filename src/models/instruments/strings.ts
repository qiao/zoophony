import { MathUtils, Matrix4, Quaternion, Vector3 } from 'three';
import { INSTRUMENT_COLORS } from '../colors.ts';
import { IDENTITY, toQuat, toVec3 } from '../tuples.ts';
import { applyTransform, splitByCentroid, transform } from '../mesh.ts';
import type { Quat, Vec3 } from '../tuples.ts';
import type { Transform } from '../mesh.ts';
import { box, cylinder, plate } from '../primitives.ts';
import type { OutlinePoint, PlateLevel } from '../primitives.ts';
import { DEFAULT_HEAD_HEIGHT } from '../species.ts';
import { PieceBuilder, hold, pieceSize } from './piece.ts';
import type { InstrumentModel, InstrumentPiece, PlayTarget } from './types.ts';

/**
 * The scale of the instrument models (design 4.6). The sizes of {@link VIOLIN} and {@link BOW} fit
 * a rabbit with a head height of 0.30 m, so the scale is the default head height divided by 0.30.
 * With H 0.38 m, it is 1.27. The hold of each instrument applies it.
 */
export const INSTRUMENT_SCALE = DEFAULT_HEAD_HEIGHT / 0.3;

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
  /** The distances of the nut and of the end of the fingerboard from the tail end. */
  nut: 0.335,
  fingerboardEnd: 0.17,
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

/** The hold of the violin and the viola under the chin (design 4.6). */
const CHIN_HOLD = {
  /** The tail end of the violin from the head center, in head heights: left, down, and front. */
  offsetH: [-0.1, -0.6, -0.3],
  /** The turn of the violin to the left of the front. */
  yaw: 70 * MathUtils.DEG2RAD,
  /** The tilt of the scroll below the horizontal. */
  pitch: 8 * MathUtils.DEG2RAD,
  /** The turn of the top plate from up to the front. */
  roll: 50 * MathUtils.DEG2RAD,
} as const;

/**
 * The holds of the cello between the knees and of the contrabass at the left side of the player
 * (design 4.6). The end pin tip stands on the floor at the offset from the floor under the seat:
 * `offsetH` in head heights, then `offset` in meters. The instrument leans along `axis`, and its
 * top plate faces `front` as far as the axis permits.
 */
export const UPRIGHT_HOLDS = {
  cello: {
    offsetH: [0, 0, -0.42],
    offset: [0.085, 0, -0.44],
    // Back 25° to the chest, then 25° to the left, so that the neck passes the left of the head.
    axis: [
      -Math.cos(25 * MathUtils.DEG2RAD) * Math.sin(25 * MathUtils.DEG2RAD),
      Math.cos(25 * MathUtils.DEG2RAD) ** 2,
      Math.sin(25 * MathUtils.DEG2RAD),
    ],
    front: [0.35, 0, -1],
  },
  contrabass: {
    offsetH: [-0.2, 0, -0.5],
    offset: [0.03, 0, -0.25],
    axis: [-0.265, 1, 0.225],
    front: [0.55, 0, -1],
  },
} as const satisfies Readonly<
  Record<'cello' | 'contrabass', Readonly<Record<'offsetH' | 'offset' | 'axis' | 'front', Vec3>>>
>;

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

/**
 * The levels of the body plate, as (scale of the outline, part of the body thickness): a round
 * edge at the back, the ribs, a round edge at the top, and the arch of the top plate.
 */
const BODY_LEVELS: readonly PlateLevel[] = [
  [0.93, 0],
  [1, 0.18],
  [1, 0.76],
  [0.96, 0.86],
  [0.8, 0.95],
  [0.45, 1],
];

/** The part of the body thickness above which the faces of the body have the top color. */
const TOP_COLOR_FROM = 0.84;

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
    toQuat(new Quaternion(...frame.rotation).multiply(new Quaternion(...local.rotation))),
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
  const top = upright ? INSTRUMENT_COLORS.celloTop : INSTRUMENT_COLORS.violinTop;
  const wood = upright ? INSTRUMENT_COLORS.celloWood : INSTRUMENT_COLORS.violinWood;
  const dark = INSTRUMENT_COLORS.fingerboard;
  const part = (
    corners: number[],
    color: readonly [number, number, number],
    at: Vec3,
    rotation?: Quat,
  ): void => {
    piece.add(corners, color, inFrame(frame, transform(at, rotation)), 'varnish');
  };

  // The body: a plate with round edges and an arched top. The arch has the lighter color of the
  // top, and the edges and the ribs have the darker wood color, as the varnished instruments of
  // the polished images.
  const body = plate(
    BODY_OUTLINE,
    BODY_LEVELS.map(([scale, y]): PlateLevel => [scale, y * v.bodyThickness]),
  );
  const [arch, sides] = splitByCentroid(body, ([, y]) => y > TOP_COLOR_FROM * v.bodyThickness);
  part(arch, top, [v.bodyLength / 2, 0, 0]);
  part(sides, wood, [v.bodyLength / 2, 0, 0]);
  // The f-holes, one at each side of the bridge, a little turned.
  for (const side of [-1, 1]) {
    part(
      box(0.036, 0.003, 0.004),
      dark,
      [v.bridge + 0.004, v.bodyThickness - 0.0016, side * 0.026],
      toQuat(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), side * 0.25)),
    );
  }
  // The neck, the pegbox, the pegs, and the scroll.
  part(box(0.1, 0.02, 0.022), wood, [v.bodyLength + 0.045, v.bodyThickness - 0.002, 0]);
  part(box(0.045, 0.025, 0.02), wood, [0.355, v.bodyThickness + 0.002, 0]);
  part(
    cylinder(0.016, 0.016, 0.022, 8),
    top,
    [0.385, v.bodyThickness + 0.008, -0.011],
    toQuat(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2)),
  );
  for (const x of [0.343, 0.365]) {
    part(box(0.006, 0.006, 0.03), dark, [x, v.bodyThickness + 0.004, 0]);
  }
  // The fingerboard over the neck and the upper body, and the tailpiece and the chin rest.
  part(box(0.17, 0.008, 0.026), dark, [0.255, v.bodyThickness + 0.016, 0]);
  part(box(0.05, 0.006, 0.03), dark, [0.04, v.bodyThickness + 0.008, 0]);
  if (!upright) {
    part(box(0.04, 0.012, 0.05), dark, [0.018, v.bodyThickness + 0.006, 0.03]);
  }
  // The bridge, and the strings as one thin strip (design 4.5, instrument colors).
  part(box(0.004, 0.024, 0.032), INSTRUMENT_COLORS.bridge, [v.bridge, v.bodyThickness + 0.012, 0]);
  piece.add(
    box(0.27, 0.002, v.stringsWidth),
    INSTRUMENT_COLORS.strings,
    inFrame(frame, transform([0.2, v.stringHeight - 0.001, 0])),
  );
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
  piece.add(
    box(b.length, 0.006, 0.006),
    INSTRUMENT_COLORS.bowStick,
    inFrame(frame, transform([b.length / 2, 0, 0])),
    'varnish',
  );
  part(box(b.length - 0.05, 0.002, 0.008), INSTRUMENT_COLORS.bowHair, [
    b.length / 2,
    -b.hairGap,
    0,
  ]);
  part(box(0.035, 0.016, 0.01), INSTRUMENT_COLORS.fingerboard, [0.02, -0.007, 0]);
  part(box(0.012, 0.014, 0.007), INSTRUMENT_COLORS.bowStick, [b.length - 0.006, -0.006, 0]);
}

/**
 * Calculates the rotation of the violin axes under the chin (design 4.6).
 *
 * @returns The rotation from the violin axes to the model axes.
 */
function chinRotation(): Quat {
  const h = CHIN_HOLD;
  const axis = new Vector3(
    -Math.sin(h.yaw) * Math.cos(h.pitch),
    -Math.sin(h.pitch),
    -Math.cos(h.yaw) * Math.cos(h.pitch),
  );
  const up = new Vector3(0, 1, 0).projectOnPlane(axis).normalize();
  // `front` is normal to the axis and to up, on the side of the audience.
  const front = new Vector3().crossVectors(axis, up).normalize();
  const top = up
    .clone()
    .multiplyScalar(Math.cos(h.roll))
    .addScaledVector(front, Math.sin(h.roll))
    .normalize();
  const basis = new Matrix4().makeBasis(axis, top, new Vector3().crossVectors(axis, top));
  return toQuat(new Quaternion().setFromRotationMatrix(basis));
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
  const up = new Vector3(...axis).normalize();
  const top = new Vector3(...front).projectOnPlane(up).normalize();
  const side = new Vector3().crossVectors(up, top.negate());
  const basis = new Matrix4().makeBasis(side, up, new Vector3().crossVectors(side, up));
  return toQuat(new Quaternion().setFromRotationMatrix(basis));
}

/** The bowed strings of design 4.6. */
export type BowedStringId = 'violin' | 'viola' | 'cello' | 'contrabass';

/**
 * The place of the bow stick at the grip, from the middle of the right palm, in head heights
 * (design 4.6). The stick lies in the fingers: on the palm side (-x) of the hanging mitten, in the
 * crease between the palm ball and the finger ball, 0.02 H from each (with the fingers curled
 * 45°). The first grip was 0.07 H in front of the palm, inside the palm ball, and the stick went
 * through the hand (user report of 2026-10-06).
 */
export const BOW_GRIP = [-0.127, 0.005, 0] as const satisfies Vec3;

/**
 * Builds the bow piece. In the piece axes, the grip is at the origin, the bow runs along +x to
 * the tip, and the hair is below the stick (-y). In the bind pose, the stick lies across the
 * fingers of the hanging right hand at {@link BOW_GRIP}: the tip points to the side of the thumb
 * (-z), and the hair faces away from the palm (-x).
 *
 * @param size The scale of the bow model.
 * @returns The piece and its targets.
 */
function buildBow(size: number): BowPiece {
  const b = BOW;
  const piece = new PieceBuilder(size);
  addBowParts(piece, transform([-b.grip, 0, 0]));
  const hairY = -b.hairGap * size;
  // The bow points to the front (-z), and the hair faces the inner side (-x).
  const xAxis = new Vector3(0, 0, -1);
  const yAxis = new Vector3(1, 0, 0);
  const basis = new Matrix4().makeBasis(xAxis, yAxis, new Vector3().crossVectors(xAxis, yAxis));
  const rotation = toQuat(new Quaternion().setFromRotationMatrix(basis));
  return {
    piece: piece.build('bow', hold('palmR', BOW_GRIP, rotation)),
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
 * Builds a bowed string instrument and its bow (design 4.6). A species with short arms plays a
 * smaller violin and bow (`SpeciesParams.violinScale`), as a child plays a fractional violin.
 *
 * The violin and the viola use the violin axes: the tail end is at the origin, the violin runs
 * along +x to the scroll, and the top plate faces +y. The player holds them under the chin.
 *
 * The cello and the contrabass stand on the end pin: its tip is at the origin, the instrument
 * runs along +y to the scroll, and the top plate faces -z (the front of the player). The cello
 * stands between the knees, and the contrabass at the left side of the player.
 *
 * @param id The instrument.
 * @param scale The scale of the instrument and its bow, as a factor of {@link STRING_SCALES}.
 * @returns The model.
 */
export function buildBowedString(id: BowedStringId, scale = 1): InstrumentModel {
  const v = VIOLIN;
  const s = STRING_SCALES[id] * scale;
  const upright = id === 'cello' || id === 'contrabass';
  const pin = upright ? (CELLO_END_PIN * s) / STRING_SCALES.cello : 0;
  // The violin axes in the piece axes, before the scale: upright, the length is +y, the top is
  // -z, and the middle of the body depth is on the axis of the end pin.
  const lengthAxis = new Vector3(0, 1, 0);
  const topAxis = new Vector3(0, 0, -1);
  const uprightBasis = new Matrix4().makeBasis(
    lengthAxis,
    topAxis,
    new Vector3().crossVectors(lengthAxis, topAxis),
  );
  const frame = upright
    ? transform(
        [0, pin / s, v.bodyThickness / 2],
        toQuat(new Quaternion().setFromRotationMatrix(uprightBasis)),
      )
    : transform([0, 0, 0], IDENTITY);
  const piece = new PieceBuilder(s);
  addViolinParts(piece, frame, upright);
  if (upright) {
    // The end pin, from its sharp tip on the floor up to the tail end. A blunt tip on the slanted
    // pin went 4 mm into the floor.
    piece.add(cylinder(0, 0.003, pin / s, 5), INSTRUMENT_COLORS.fingerboard, transform([0, 0, 0]));
  }
  const at = (p: Vec3): Vec3 => toVec3(new Vector3(...applyTransform(frame, p)).multiplyScalar(s));
  const top = toVec3(new Vector3(0, 1, 0).applyQuaternion(new Quaternion(...frame.rotation)));
  const instrumentHold =
    id === 'cello' || id === 'contrabass'
      ? hold('floor', UPRIGHT_HOLDS[id].offsetH, uprightRotation(id), UPRIGHT_HOLDS[id].offset)
      : hold('head', CHIN_HOLD.offsetH, chinRotation());
  const instrument = piece.build('instrument', instrumentHold);
  const bow = buildBow((upright ? LOW_BOW_SCALE : INSTRUMENT_SCALE) * scale);
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
        from: at([v.nut, stringsY, 0]),
        to: at([v.fingerboardEnd, stringsY, 0]),
        normal: top,
        keys: null,
      },
      ...bow.targets,
    ],
    size: pieceSize(instrument),
  };
}
