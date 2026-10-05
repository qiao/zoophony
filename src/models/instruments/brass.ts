import { INSTRUMENT_COLORS } from '../colors.ts';
import {
  DEG,
  IDENTITY,
  add,
  axisAngle,
  basisRotation,
  normalize,
  reject,
  rotate,
  rotationBetween,
  scale,
  transform,
} from '../math.ts';
import type { Quat, Vec3 } from '../math.ts';
import { cylinder, lathe } from '../primitives.ts';
import type { ProfilePoint } from '../primitives.ts';
import { PieceBuilder, hold, pieceSize } from './piece.ts';
import type { InstrumentModel, InstrumentPiece, PlayTarget } from './types.ts';

/** The brass instruments of design 4.6. */
export type BrassId = 'horn' | 'trumpet' | 'trombone' | 'tuba';

/**
 * The sizes of the brass instruments in meters (design 4.6). The horn, the trumpet, and the
 * trombone are 0.85 of their real size, as the violin. The tuba is 0.95 m tall, so that it stands
 * in the lap of the rhino and reaches its mouth.
 */
export const BRASS = {
  horn: { coilRadius: 0.13, bellRadius: 0.13 },
  trumpet: { length: 0.41, bellRadius: 0.052 },
  /** `travel` is the move of the slide from the first position to the seventh. */
  trombone: { length: 0.95, bellRadius: 0.09, travel: 0.55 },
  tuba: { height: 0.95, bellRadius: 0.21 },
} as const;

const METAL = INSTRUMENT_COLORS.brass;

/** The faces around the axis of a tube. */
const TUBE_SEGMENTS = 5;

/**
 * Adds a solid of revolution along an axis.
 *
 * @param piece The piece.
 * @param from The point on the axis where the profile height is 0.
 * @param axis The direction of the axis.
 * @param profile The radius at each distance along the axis.
 * @param segments The number of faces around the axis.
 */
function turned(
  piece: PieceBuilder,
  from: Vec3,
  axis: Vec3,
  profile: readonly ProfilePoint[],
  segments: number,
): void {
  piece.add(
    lathe(profile, segments),
    METAL,
    transform(from, rotationBetween([0, 1, 0], axis)),
    'metal',
  );
}

/**
 * Adds a tube through a list of points.
 *
 * @param piece The piece.
 * @param points The points along the tube.
 * @param radius The radius of the tube.
 */
function pipe(piece: PieceBuilder, points: readonly Vec3[], radius: number): void {
  for (let i = 0; i + 1 < points.length; i++) {
    piece.rod(
      points[i] ?? [0, 0, 0],
      points[i + 1] ?? [0, 0, 0],
      radius,
      TUBE_SEGMENTS,
      METAL,
      'metal',
    );
  }
}

/**
 * Adds the mouthpiece: a small cup at the origin that opens to -along.
 *
 * @param piece The piece.
 * @param along The direction from the mouthpiece into the instrument.
 * @param radius The radius of the cup.
 */
function mouthpiece(piece: PieceBuilder, along: Vec3, radius: number): void {
  turned(
    piece,
    [0, 0, 0],
    along,
    [
      [radius, 0],
      [radius * 0.4, radius * 2.5],
      [radius * 0.35, radius * 4],
    ],
    TUBE_SEGMENTS,
  );
}

/**
 * Adds a bell that opens along an axis.
 *
 * @param piece The piece.
 * @param mouth The middle of the opening of the bell.
 * @param axis The direction in which the bell opens.
 * @param radius The radius of the opening.
 * @param depth The length of the flare.
 * @returns The target at the middle of the opening.
 */
function bell(
  piece: PieceBuilder,
  mouth: Vec3,
  axis: Vec3,
  radius: number,
  depth: number,
): PlayTarget {
  const n = normalize(axis);
  turned(
    piece,
    add(mouth, scale(n, -depth)),
    n,
    [
      [radius * 0.18, 0],
      [radius * 0.35, depth * 0.6],
      [radius * 0.7, depth * 0.9],
      [radius, depth],
    ],
    8,
  );
  return { kind: 'bell', bone: 'instrument', from: mouth, to: mouth, normal: n, keys: null };
}

/**
 * Adds valve casings: short upright cylinders in a row.
 *
 * @param piece The piece.
 * @param first The middle of the first casing.
 * @param step The offset from one casing to the next.
 * @param count The number of casings.
 * @param radius The radius of a casing.
 * @param height The height of a casing.
 * @param up The direction of the casings.
 */
function valves(
  piece: PieceBuilder,
  first: Vec3,
  step: Vec3,
  count: number,
  radius: number,
  height: number,
  up: Vec3 = [0, 1, 0],
): void {
  for (let i = 0; i < count; i++) {
    const middle = add(first, scale(step, i));
    piece.add(
      cylinder(radius, radius, height, TUBE_SEGMENTS),
      METAL,
      transform(add(middle, scale(normalize(up), -height / 2)), rotationBetween([0, 1, 0], up)),
      'metal',
    );
  }
}

/**
 * Calculates the rotation that turns the piece +x to a direction, with the piece +y as near to
 * a second direction as the first permits.
 *
 * @param along The new direction of +x.
 * @param up The direction for +y.
 * @returns The rotation.
 */
function pointing(along: Vec3, up: Vec3): Quat {
  const x = normalize(along);
  return basisRotation(x, normalize(reject(up, x)));
}

/** The parts and the play data of one brass instrument. */
interface BrassBuild {
  readonly pieces: readonly InstrumentPiece[];
  readonly palmL: Vec3;
  /** The right palm is on the slide for the trombone, and on the instrument for the others. */
  readonly palmR: Vec3;
  readonly targets: readonly PlayTarget[];
}

/**
 * Builds the trumpet. The mouthpiece is at the origin, and the trumpet runs along +x to the bell.
 * The valves stand up (+y), and the player holds it horizontal and forward.
 *
 * @returns The parts and the play data.
 */
function trumpet(): BrassBuild {
  const t = BRASS.trumpet;
  const piece = new PieceBuilder();
  mouthpiece(piece, [1, 0, 0], 0.009);
  // The lead pipe, the valve block, the lower loop, and the bell.
  pipe(
    piece,
    [
      [0.035, 0, 0],
      [0.2, 0, 0],
    ],
    0.006,
  );
  valves(piece, [0.15, -0.025, 0], [0.026, 0, 0], 3, 0.009, 0.075);
  pipe(
    piece,
    [
      [0.12, -0.05, 0],
      [0.06, -0.05, 0],
      [0.06, -0.025, 0],
      [0.12, -0.025, 0],
    ],
    0.005,
  );
  pipe(
    piece,
    [
      [0.2, -0.05, 0],
      [t.length - 0.13, -0.05, 0],
    ],
    0.006,
  );
  const bellTarget = bell(piece, [t.length, -0.05, 0], [1, 0, 0], t.bellRadius, 0.13);
  return {
    pieces: [
      piece.build(
        'instrument',
        hold('mouth', [0, 0, 0], pointing([0, -Math.sin(5 * DEG), -1], [0, 1, 0])),
      ),
    ],
    palmL: [0.17, -0.04, -0.03],
    palmR: [0.18, 0.03, 0.01],
    targets: [bellTarget],
  };
}

/**
 * Builds the trombone with its slide. The mouthpiece is at the origin, and the slide runs along
 * +x. The two slide tubes lie one above the other. The bell section lies at the left of the slide
 * (-z), and its tuning loop goes back over the left shoulder.
 *
 * The slide is a second piece on the `slide` bone. Its origin is the slide brace in the first
 * position, and it moves along +x by `travel` to the seventh position.
 *
 * @returns The parts and the play data.
 */
function trombone(): BrassBuild {
  const t = BRASS.trombone;
  const main = new PieceBuilder();
  mouthpiece(main, [1, 0, 0], 0.01);
  const low = -0.07;
  const side = -0.11;
  // The inner slide tubes, and the brace near the mouthpiece that the left hand holds.
  pipe(
    main,
    [
      [0.04, 0, 0],
      [0.62, 0, 0],
    ],
    0.006,
  );
  pipe(
    main,
    [
      [0.04, low, 0],
      [0.62, low, 0],
    ],
    0.006,
  );
  pipe(
    main,
    [
      [0.08, 0, 0],
      [0.08, low, 0],
      [0.08, low, side],
    ],
    0.005,
  );
  // The bell section, its tuning loop over the shoulder, and the bell.
  const back = t.length - 0.7;
  pipe(
    main,
    [
      [0.54, low / 2, side],
      [0.03 - back, low / 2, side],
      [-back, low * 0.75, side],
      [0.03 - back, low, side],
      [0.04, low, side],
      [0.04, low, 0],
    ],
    0.007,
  );
  const bellTarget = bell(main, [0.7, low / 2, side], [1, 0, 0], t.bellRadius, 0.16);

  // The outer slide: two tubes over the inner tubes, the bow at the end, and the brace.
  const brace: Vec3 = [0.3, low / 2, 0];
  const slide = new PieceBuilder();
  const local = (p: Vec3): Vec3 => [p[0] - brace[0], p[1] - brace[1], p[2] - brace[2]];
  pipe(slide, [local([0.14, 0, 0]), local([0.68, 0, 0])], 0.009);
  pipe(slide, [local([0.14, low, 0]), local([0.68, low, 0])], 0.009);
  pipe(slide, [local([0.68, 0, 0]), local([0.7, low / 2, 0]), local([0.68, low, 0])], 0.009);
  pipe(slide, [local([0.3, 0, 0]), local([0.3, low, 0])], 0.005);

  const rotation = pointing([0, -Math.sin(15 * DEG), -Math.cos(15 * DEG)], [0, 1, 0]);
  return {
    pieces: [
      main.build('instrument', hold('mouth', [0, 0, 0], rotation)),
      slide.build('slide', hold('instrument', [0, 0, 0], IDENTITY, brace)),
    ],
    palmL: [0.08, low / 2, side / 2],
    palmR: [0, 0, 0.02],
    targets: [
      bellTarget,
      {
        kind: 'slide',
        bone: 'slide',
        from: [0, 0, 0.02],
        to: [t.travel, 0, 0.02],
        normal: [0, 0, 1],
        keys: null,
      },
    ],
  };
}

/**
 * Builds the horn. The mouthpiece is at the origin, and the horn has the axes of the player: the
 * coil stands in front of the right side of the chest, and the bell opens to the right and to
 * the back, near the right thigh.
 *
 * @returns The parts and the play data.
 */
function horn(): BrassBuild {
  const h = BRASS.horn;
  const piece = new PieceBuilder();
  const into: Vec3 = normalize([0.25, -0.35, -1]);
  mouthpiece(piece, into, 0.009);
  // The coil leans back 20° from the vertical, with its middle low at the right of the mouth.
  const center: Vec3 = [0.1, -0.3, -0.24];
  const lean = axisAngle([1, 0, 0], -20 * DEG);
  const ring = (angle: number, r: number): Vec3 =>
    add(center, rotate(lean, [r * Math.cos(angle), r * Math.sin(angle), 0]));
  const coil: Vec3[] = [];
  for (let i = 0; i <= 12; i++) {
    coil.push(ring((i / 12) * 2 * Math.PI, h.coilRadius));
  }
  pipe(piece, coil, 0.011);
  // The lead pipe from the mouthpiece to the top of the coil, and the valves at its front left.
  pipe(piece, [scale(into, 0.04), ring(Math.PI * 0.6, h.coilRadius)], 0.005);
  valves(
    piece,
    ring(Math.PI * 0.85, h.coilRadius * 0.55),
    rotate(lean, [0.024, -0.012, 0]),
    3,
    0.009,
    0.06,
    rotate(lean, [0, 0, 1]),
  );
  // The bell leaves the coil at its bottom right, and opens to the right and to the back.
  const bellAxis: Vec3 = normalize([0.75, -0.25, 0.6]);
  const bellStart = ring(-Math.PI * 0.35, h.coilRadius);
  const bellTarget = bell(piece, add(bellStart, scale(bellAxis, 0.2)), bellAxis, h.bellRadius, 0.2);
  return {
    pieces: [piece.build('instrument', hold('mouth', [0, 0, 0], IDENTITY))],
    palmL: ring(Math.PI * 0.8, h.coilRadius * 0.6),
    palmR: add(bellTarget.from, scale(bellAxis, -0.06)),
    targets: [bellTarget],
  };
}

/**
 * Builds the tuba. The mouthpiece is at the origin, and the tuba has the axes of the player: the
 * body stands in the lap in front of the player, and the bell opens up at the left of the head.
 *
 * @returns The parts and the play data.
 */
function tuba(): BrassBuild {
  const t = BRASS.tuba;
  const piece = new PieceBuilder();
  mouthpiece(piece, [0, 0, -1], 0.012);
  // The axes of the drawing: the bottom bow is at y = 0. The mouthpiece is 0.72 m above it.
  const bottom: Vec3 = [-0.06, -0.72, -0.2];
  const at = (p: Vec3): Vec3 => add(bottom, p);
  // The main branch rises from the bottom bow to the bell.
  turned(
    piece,
    at([-0.06, 0, 0]),
    [0, 1, 0],
    [
      [0, 0],
      [0.07, 0.03],
      [0.08, 0.45],
      [0.11, t.height - 0.25],
      [t.bellRadius * 0.7, t.height - 0.06],
      [t.bellRadius, t.height],
    ],
    8,
  );
  // The second branch with the valves, the bottom bow, and the lead pipe to the mouthpiece.
  pipe(piece, [at([0.1, 0.06, 0]), at([0.1, 0.5, 0])], 0.04);
  pipe(piece, [at([-0.06, 0.06, 0]), at([0.1, 0.06, 0])], 0.05);
  valves(piece, at([0.1, 0.42, -0.06]), [0, 0, 0.035], 4, 0.012, 0.11, [0, 1, 0]);
  pipe(piece, [at([0.1, 0.5, 0]), at([0.1, 0.65, 0.08]), [0, 0, 0.05]], 0.012);
  const bellTarget: PlayTarget = {
    kind: 'bell',
    bone: 'instrument',
    from: at([-0.06, t.height, 0]),
    to: at([-0.06, t.height, 0]),
    normal: [0, 1, 0],
    keys: null,
  };
  return {
    pieces: [piece.build('instrument', hold('mouth', [0, 0, 0], IDENTITY))],
    palmL: at([-0.15, 0.4, 0.02]),
    palmR: at([0.1, 0.47, 0.05]),
    targets: [bellTarget],
  };
}

/**
 * Builds a brass instrument (design 4.6). The origin of the instrument piece is the mouthpiece,
 * and the instrument bone hangs on the chest (4.7).
 *
 * @param id The brass instrument.
 * @returns The model.
 */
export function buildBrass(id: BrassId): InstrumentModel {
  const built =
    id === 'horn' ? horn() : id === 'trumpet' ? trumpet() : id === 'trombone' ? trombone() : tuba();
  const main = built.pieces[0];
  if (!main) {
    throw new Error(`The ${id} has no piece.`);
  }
  return {
    id,
    parent: 'chest',
    pieces: built.pieces,
    grips: {
      palmL: { bone: 'instrument', at: built.palmL },
      palmR: { bone: id === 'trombone' ? 'slide' : 'instrument', at: built.palmR },
      mouth: { bone: 'instrument', at: [0, 0, 0] },
      chin: null,
    },
    targets: built.targets,
    size: pieceSize(main),
  };
}
