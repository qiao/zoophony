import { MathUtils, Matrix4, Quaternion, Vector3 } from 'three';
import { INSTRUMENT_COLORS } from '../colors.ts';
import { IDENTITY, toQuat, toVec3 } from '../tuples.ts';
import { applyTransform, transform } from '../mesh.ts';
import type { Quat, Vec3 } from '../tuples.ts';
import type { Transform } from '../mesh.ts';
import { box, cylinder, quad } from '../primitives.ts';
import type { OutlinePoint } from '../primitives.ts';
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
 * The length of the end pin of the contrabass below the tail end, in meters, at each size (design
 * 4.6): a real end pin stands out about 0.15 m to 0.25 m. The hold of the contrabass moves it to
 * the body of the player, so a smaller contrabass needs no longer end pin. With the cello rule, the
 * smaller contrabass of the hippo had an end pin of 0.55 m.
 */
const BASS_END_PIN = 0.2;

/**
 * Gives the length of the end pin of an upright bowed string below the tail end, in meters
 * (design 4.6). A smaller cello has a longer end pin, so that the top of its body stays at the
 * place of the top of the full size: a player of a fractional cello sets the end pin so that the
 * upper bout rests against the chest. The contrabass keeps {@link BASS_END_PIN} at each size.
 *
 * @param id The upright bowed string.
 * @param scale The scale of the instrument, as a factor of its full size.
 * @returns The length.
 */
export function endPinLength(id: 'cello' | 'contrabass', scale: number): number {
  if (id === 'contrabass') {
    return BASS_END_PIN;
  }
  const body = VIOLIN.bodyLength * STRING_SCALES.cello;
  return CELLO_END_PIN + body * (1 - scale);
}

/**
 * The scale of the bow of the cello and of the contrabass, as a factor of the bow model: 0.63 m.
 * The violin and the viola use the bow at the {@link INSTRUMENT_SCALE}: 0.57 m (design 4.6).
 */
const LOW_BOW_SCALE = INSTRUMENT_SCALE * 1.1;

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
const UPRIGHT_HOLDS = {
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
 * The outline of the violin body around its center, from the neck end (+x) along the -z side to
 * the tail end (-x): the upper bout, the upper corner, the C-bout, the lower corner, and the
 * lower bout (`docs/research/2026-10-29-string-models.md`). Each corner is a tip and a point on
 * the line from the tip to the center, so that the outline stays star-shaped around the center
 * for the fan caps.
 */
const VIOLIN_HALF: readonly OutlinePoint[] = [
  [0.12, 0],
  [0.116, -0.022],
  [0.098, -0.045],
  [0.068, -0.0566],
  [0.045, -0.052],
  [0.032, -0.0475],
  [0.0278, -0.0413],
  [0.01, -0.0378],
  [-0.0135, -0.0434],
  [-0.016, -0.0515],
  [-0.035, -0.062],
  [-0.062, -0.068],
  [-0.092, -0.062],
  [-0.112, -0.04],
  [-0.12, 0],
];

/**
 * One level of the body: the outline at a scale around the center, at a part of the body
 * thickness.
 */
interface BodyLevel {
  /** The scale of the outline. */
  readonly scale: number;
  /** The height, as a part of the body thickness. */
  readonly y: number;
  /**
   * The color of the band from the level below to this level: the color of the top, or the
   * darker wood of the edges.
   */
  readonly band: 'top' | 'edge';
}

/**
 * The levels of the violin body from the back to the top: the arch of the back, the back edge
 * that stands out over the ribs, the ribs, the top edge that stands out over the ribs, and the
 * arch of the top. The edges have the darker wood color, so that a dark band goes around the top
 * and the back, as in `orchestra-latest.png`.
 */
const VIOLIN_LEVELS: readonly BodyLevel[] = [
  { scale: 0.8, y: 0, band: 'top' },
  { scale: 1, y: 0.13, band: 'top' },
  { scale: 0.965, y: 0.17, band: 'edge' },
  { scale: 0.965, y: 0.76, band: 'top' },
  { scale: 1, y: 0.8, band: 'edge' },
  { scale: 0.93, y: 0.85, band: 'edge' },
  { scale: 0.72, y: 0.95, band: 'top' },
  { scale: 0.45, y: 1, band: 'top' },
];

/**
 * Makes a closed outline from its half on the -z side.
 *
 * @param half The half from +x to -x, with the two end points on the x axis.
 * @returns The outline, counterclockwise when seen from +y.
 */
function mirrorOutline(half: readonly OutlinePoint[]): OutlinePoint[] {
  return [
    ...half,
    ...half
      .slice(1, -1)
      .toReversed()
      .map(([x, z]): OutlinePoint => [x, -z]),
  ];
}

/** The faces of the body of a bowed string, by color. */
interface BodyBands {
  /** The faces with the color of the top. */
  readonly top: number[];
  /** The faces with the darker wood color of the edges. */
  readonly edge: number[];
}

/**
 * Makes the body of a bowed string: the outline at each level, with a fan cap at the back and at
 * the top.
 *
 * @param outline The outline, counterclockwise when seen from +y.
 * @param levels The levels from the back to the top.
 * @param thickness The thickness of the body.
 * @returns The faces by color.
 */
function bodyBands(
  outline: readonly OutlinePoint[],
  levels: readonly BodyLevel[],
  thickness: number,
): BodyBands {
  const top: number[] = [];
  const edge: number[] = [];
  const at = (level: BodyLevel, i: number): Vec3 => {
    const [x, z] = outline[i % outline.length] ?? [0, 0];
    return [x * level.scale, level.y * thickness, z * level.scale];
  };
  for (let j = 1; j < levels.length; j++) {
    const lower = levels[j - 1];
    const upper = levels[j];
    if (!lower || !upper) {
      continue;
    }
    const out = upper.band === 'top' ? top : edge;
    for (let i = 0; i < outline.length; i++) {
      out.push(...quad(at(lower, i), at(lower, i + 1), at(upper, i + 1), at(upper, i)));
    }
  }
  const back = levels[0];
  const arch = levels.at(-1);
  for (let i = 0; i < outline.length; i++) {
    if (back) {
      top.push(0, back.y * thickness, 0, ...at(back, i + 1), ...at(back, i));
    }
    if (arch) {
      top.push(0, arch.y * thickness, 0, ...at(arch, i), ...at(arch, i + 1));
    }
  }
  return { top, edge };
}

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

  // The body: the outline with its corners at each level, with the darker edges (design 4.5,
  // instrument colors).
  const body = bodyBands(mirrorOutline(VIOLIN_HALF), VIOLIN_LEVELS, v.bodyThickness);
  part(body.top, top, [v.bodyLength / 2, 0, 0]);
  part(body.edge, wood, [v.bodyLength / 2, 0, 0]);
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
type BowedStringId = 'violin' | 'viola' | 'cello' | 'contrabass';

/**
 * The place of the bow stick at the grip, from the middle of the right palm, in head heights
 * (design 4.6). The stick lies in the fingers: on the palm side (-x) of the hanging mitten, in the
 * crease between the palm ball and the finger ball, 0.02 H from each (with the fingers curled
 * 45°). The first grip was 0.07 H in front of the palm, inside the palm ball, and the stick went
 * through the hand (user report of 2026-10-06).
 */
export const BOW_GRIP = [-0.127, 0.005, 0] as const satisfies Vec3;

/**
 * The grip of the bow in the right paw of a species (`SpeciesParams.bowGrip`, design 4.6), in the
 * axes of the hanging right paw of the bind pose: the palm faces -x, and the fingers point down.
 */
export interface BowGrip {
  /** The place of the stick at the grip, from the middle of the right palm, in head heights. */
  readonly at: Vec3;
  /**
   * The turn of the stick around the normal of the palm, in radians. A positive turn moves the tip
   * from the side of the thumb (-z) toward the wrist (+y).
   */
  readonly turn: number;
}

/** The grip of the bow of each species with no grip of its own: {@link BOW_GRIP}, square. */
const SQUARE_GRIP: BowGrip = { at: BOW_GRIP, turn: 0 };

/**
 * Builds the bow piece. In the piece axes, the grip is at the origin, the bow runs along +x to
 * the tip, and the hair is below the stick (-y). In the bind pose, the stick lies across the
 * fingers of the hanging right hand at the place of the grip: the tip points to the side of the
 * thumb (-z), turned toward the fingers by the turn of the grip, and the hair faces away from the
 * palm (-x).
 *
 * @param size The scale of the bow model.
 * @param grip The grip of the bow in the right paw.
 * @returns The piece and its targets.
 */
function buildBow(size: number, grip: BowGrip): BowPiece {
  const b = BOW;
  const piece = new PieceBuilder(size);
  addBowParts(piece, transform([-b.grip, 0, 0]));
  const hairY = -b.hairGap * size;
  // The bow points to the front (-z), and the hair faces the inner side (-x).
  const xAxis = new Vector3(0, 0, -1);
  const yAxis = new Vector3(1, 0, 0);
  const basis = new Matrix4().makeBasis(xAxis, yAxis, new Vector3().crossVectors(xAxis, yAxis));
  const rotation = toQuat(
    new Quaternion()
      .setFromAxisAngle(new Vector3(1, 0, 0), grip.turn)
      .multiply(new Quaternion().setFromRotationMatrix(basis)),
  );
  return {
    piece: piece.build('bow', hold('palmR', grip.at, rotation)),
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
 * smaller violin, cello, or contrabass and bow (`SpeciesParams.violinScale`,
 * `SpeciesParams.celloScale`, `SpeciesParams.bassScale`), as a child plays a fractional size. A
 * smaller cello or contrabass has a longer end pin ({@link endPinLength}).
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
 * @param grip The grip of the bow in the right paw of the species.
 * @returns The model.
 */
export function buildBowedString(
  id: BowedStringId,
  scale = 1,
  grip: BowGrip = SQUARE_GRIP,
): InstrumentModel {
  const v = VIOLIN;
  const s = STRING_SCALES[id] * scale;
  const upright = id === 'cello' || id === 'contrabass';
  const pin = upright ? endPinLength(id, scale) : 0;
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
  const bow = buildBow((upright ? LOW_BOW_SCALE : INSTRUMENT_SCALE) * scale, grip);
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
