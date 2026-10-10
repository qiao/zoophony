import { Vector3 } from 'three';
import type { BodyColors } from '../body-parts.ts';
import { srgb } from '../mesh.ts';
import type { MeshBuilder, Rgb } from '../mesh.ts';
import { ringLoft } from '../primitives.ts';
import type { Ring } from '../primitives.ts';
import type { Vec3 } from '../tuples.ts';
import { oval, plate, skullSurface } from '../face-plates.ts';
import { addPainted, jitter } from '../painted.ts';

/**
 * A place in the axes of the head, in head heights `H` from the head center: `s` to the right
 * side of the animal (+x), `u` up, and `f` forward (-z).
 */
type HeadPoint = readonly [s: number, u: number, f: number];

/**
 * One ring of the head across the forward axis, in H: the forward place, the height of the
 * middle, the half width, the height above and below the middle, and the length of the cheek
 * tufts.
 */
type HeadRow = readonly [
  f: number,
  middle: number,
  halfWidth: number,
  up: number,
  down: number,
  tuft: number,
];

/**
 * The rings of the fox head from the back of the skull to the nose (`fox-views.png`). The skull
 * is round, the cheek tufts stand out low on the sides, and the muzzle tapers to the nose below
 * the eyes. An end ring with a half width of 0 is a point.
 */
const HEAD_ROWS: readonly HeadRow[] = [
  [-0.64, 0.1, 0, 0, 0, 0],
  [-0.58, 0.09, 0.28, 0.3, 0.22, 0],
  [-0.44, 0.06, 0.47, 0.47, 0.35, 0.02],
  [-0.22, 0.04, 0.57, 0.52, 0.4, 0.1],
  [-0.04, 0.01, 0.6, 0.53, 0.42, 0.24],
  [0.12, -0.02, 0.55, 0.54, 0.42, 0.22],
  [0.24, -0.05, 0.43, 0.5, 0.39, 0.06],
  [0.33, -0.09, 0.31, 0.39, 0.34, 0],
  [0.41, -0.17, 0.21, 0.18, 0.25, 0],
  [0.52, -0.22, 0.15, 0.12, 0.17, 0],
  [0.63, -0.26, 0.105, 0.09, 0.11, 0],
  [0.72, -0.28, 0.065, 0.055, 0.07, 0],
  [0.77, -0.29, 0, 0, 0, 0],
];

/** The number of corners of each ring of the head. */
const HEAD_SEGMENTS = 16;

/** The angle of each cheek tuft below the side of the head, in radians. */
const TUFT_ANGLE = (18 * Math.PI) / 180;

/** The half width of a cheek tuft around its angle, in radians. */
const TUFT_SPREAD = (17 * Math.PI) / 180;

/** The largest radial offset of a corner of the head, as a part of its radius. */
const HEAD_JITTER = 0.035;

/** The rings of an ear: their places along the ear, from 0 at the base to 1 at the tip. */
const EAR_RINGS = [0, 0.28, 0.52, 0.74, 0.9] as const;

/**
 * The first band between two rings of an ear that has a dark color, as an index in
 * {@link EAR_RINGS}: the tip from the fourth ring, and the back from the second ring, as in
 * `fox-views.png`.
 */
const EAR_BANDS = { tip: 3, back: 1 } as const;

/** The color of the iris of the fox eyes (`fox-views.png`). */
const IRIS_COLOR = '#6e3a1e';

/** The color of the upper lid line and the pupil. */
const LID_COLOR = '#1c130e';

/** The eye of the fox, in H: the white, the iris, the pupil, the light, and the lid line. */
const EYE = {
  /** The place of the right eye in the axes of the head. The ray from the head center finds the face. */
  direction: [0.43, -0.05, 0.6],
  /** The half width and the heights above and below the middle of the white. */
  white: [0.16, 0.12, 0.072] as const,
  /** The turn of the eye: the outer corner goes up, in radians. */
  tilt: (15 * Math.PI) / 180,
  /** The half width and the half height of the iris, and its move toward the nose. */
  iris: [0.087, 0.118, 0.016] as const,
  /** The radius of the pupil. */
  pupil: 0.042,
  /** The radius of the white light on the iris. */
  light: 0.025,
  /** The width of the lid line. */
  lid: 0.036,
  /**
   * The start of the lid line, as a part of the half width from the middle of the white toward
   * the inner corner. The lid line stops short of the steep inner end of the white, so that it
   * does not hook down beside the nose.
   */
  lidStart: -0.55,
  /** The rise of the flick of the lid line past the outer corner, for each unit to the side. */
  flick: 0.5,
  /** The distance of the eye plane out of the face. */
  lift: 0.022,
} as const;

/** The parts of the head that the trunk and the instruments need, in the axes of the model. */
export interface FoxHead {
  /** The middle of the right eye. */
  readonly eyeR: Vec3;
  /** The middle of the left eye. */
  readonly eyeL: Vec3;
  /** The base of the right ear. */
  readonly earR: Vec3;
  /** The base of the left ear. */
  readonly earL: Vec3;
  /** The hinge of the lower jaw. */
  readonly jaw: Vec3;
  /** The middle of the mouth, under the front of the muzzle. */
  readonly mouth: Vec3;
}

/** The colors of the head, in linear values. */
interface HeadColors {
  /** The fur of the skull and the ears. */
  readonly fur: Rgb;
  /** The white of the face, the cheeks, and the inner ears. */
  readonly white: Rgb;
  /** The dark brown of the ear tips and the ear backs. */
  readonly dark: Rgb;
  /** The black of the nose. */
  readonly nose: Rgb;
  /** The white of the eyes and the light on the iris. */
  readonly eyeWhite: Rgb;
  /** The brown of the iris. */
  readonly iris: Rgb;
  /** The black of the pupil. */
  readonly pupil: Rgb;
  /** The dark of the lid line. */
  readonly lid: Rgb;
}

/**
 * Adds the head of the fox (`fox-views.png`): the skull with the cheek tufts and the muzzle, the
 * nose, the eyes, and the ears. The face below the eyes, the cheeks, and the underside of the
 * muzzle are white, and the top of the muzzle keeps the fur color to the nose.
 *
 * @param builder The mesh that gets the parts.
 * @param colors The colors of the species.
 * @param h The head height `H`, in meters.
 * @param center The center of the head.
 * @returns The places of the eyes, the ears, the jaw, and the mouth.
 */
export function addFoxHead(
  builder: MeshBuilder,
  colors: BodyColors,
  h: number,
  center: Vec3,
): FoxHead {
  const toModel = ([s, u, f]: HeadPoint): Vec3 => [
    center[0] + s * h,
    center[1] + u * h,
    center[2] - f * h,
  ];
  const toHead = (p: Vec3): HeadPoint => [
    (p[0] - center[0]) / h,
    (p[1] - center[1]) / h,
    (center[2] - p[2]) / h,
  ];
  const palette: HeadColors = {
    fur: colors.fur,
    white: colors.belly,
    dark: colors.accent,
    nose: colors.nose,
    eyeWhite: colors.eyeLight,
    iris: srgb(IRIS_COLOR),
    pupil: colors.eye,
    lid: srgb(LID_COLOR),
  };

  const skull = ringLoft(HEAD_ROWS.map((row, j) => headRing(row, j).map(toModel)));
  addPainted(builder, skull, 'head', (centroid, normal) =>
    faceColor(toHead(centroid), normal, palette),
  );
  addNose(builder, palette, toModel);

  const [eyeR, eyeL] = ([1, -1] as const).map((side) =>
    addEye(builder, palette, h, center, skull, side),
  );
  const [earR, earL] = ([1, -1] as const).map((side) => addEar(builder, palette, toModel, side));

  return {
    eyeR: eyeR ?? center,
    eyeL: eyeL ?? center,
    earR: earR ?? center,
    earL: earL ?? center,
    jaw: toModel([0, -0.3, 0.15]),
    mouth: toModel([0, -0.37, 0.66]),
  };
}

/**
 * Gives the corners of one ring of the head in the axes of the head. Every second ring turns by
 * half a step, so that the facets are triangles. The corners of the left half are the mirror
 * images of the corners of the right half, also with their offsets.
 *
 * @param row The ring.
 * @param index The index of the ring.
 * @returns The corners from the right side up, around.
 */
function headRing([f, middle, halfWidth, up, down, tuft]: HeadRow, index: number): HeadPoint[] {
  if (halfWidth === 0) {
    return [[0, middle, f]];
  }
  const turn = index % 2 === 0 ? 0 : 0.5;
  const ring: HeadPoint[] = [];
  for (let i = 0; i < HEAD_SEGMENTS; i++) {
    const angle = ((i + turn) / HEAD_SEGMENTS) * 2 * Math.PI;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // The tufts stand out at the same angle below each side.
    const below = Math.atan2(-sin, Math.abs(cos));
    const bump = tuft * Math.exp(-(((below - TUFT_ANGLE) / TUFT_SPREAD) ** 2));
    const key = Math.round(Math.abs(cos) * 1000) * 3 + Math.round(sin * 1000);
    const scale = 1 + HEAD_JITTER * jitter(index, key);
    const radiusS = (halfWidth + bump) * scale;
    const radiusU = ((sin >= 0 ? up : down) + bump) * scale;
    ring.push([cos * radiusS, middle + sin * radiusU, f]);
  }
  return ring;
}

/**
 * Gives the color of a triangle of the skull. The white of the face starts just under the eyes
 * and leans back down the cheeks to the throat. The top of the muzzle keeps the fur color to the
 * nose, and the cheek tufts are white under their top edge.
 *
 * @param p The centroid of the triangle, in the axes of the head.
 * @param normal The unit normal of the triangle, in the axes of the model.
 * @param palette The colors of the head.
 * @returns The color.
 */
function faceColor([s, u, f]: HeadPoint, normal: Vec3, palette: HeadColors): Rgb {
  const muzzleTop = f > 0.3 && normal[1] > 0.55 && Math.abs(s) < 0.14;
  if (muzzleTop) {
    return palette.fur;
  }
  // The border of the white: just under the eyes on the face, and leaning back down the cheeks.
  const border = f >= 0.12 ? -0.07 - 0.2 * Math.max(0, f - 0.4) : -0.07 - 0.75 * (0.12 - f);
  const tuft = Math.abs(s) > 0.5 && u < 0.02 && f > -0.3;
  return u < border || tuft ? palette.white : palette.fur;
}

/**
 * Adds the black nose on the tip of the muzzle.
 *
 * @param builder The mesh that gets the part.
 * @param palette The colors of the head.
 * @param toModel The change from the axes of the head to the axes of the model.
 */
function addNose(builder: MeshBuilder, palette: HeadColors, toModel: (p: HeadPoint) => Vec3): void {
  const ring = (f: number, halfWidth: number, up: number, down: number): Ring =>
    Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * 2 * Math.PI;
      const sin = Math.sin(angle);
      return toModel([Math.cos(angle) * halfWidth, -0.27 + sin * (sin >= 0 ? up : down), f]);
    });
  const corners = ringLoft([
    ring(0.68, 0.05, 0.04, 0.035),
    ring(0.745, 0.068, 0.05, 0.04),
    ring(0.79, 0.045, 0.035, 0.03),
    [toModel([0, -0.27, 0.805])],
  ]);
  addPainted(builder, corners, 'head', () => palette.nose, 'lacquer');
}

/**
 * Adds one eye (`fox-views.png`): a large white almond with a brown iris, a black pupil, a white
 * light, and a dark lid line along its top. The parts are thin plates on the face, and they all
 * follow the eye bone, so that they close together in a blink.
 *
 * @param builder The mesh that gets the parts.
 * @param palette The colors of the head.
 * @param h The head height `H`, in meters.
 * @param center The head center.
 * @param skull The corner list of the skull, in the axes of the model.
 * @param side 1 for the right eye, -1 for the left eye.
 * @returns The middle of the eye: the bind position of its bone.
 */
function addEye(
  builder: MeshBuilder,
  palette: HeadColors,
  h: number,
  center: Vec3,
  skull: readonly number[],
  side: 1 | -1,
): Vec3 {
  const [s, u, f] = EYE.direction;
  const surface = skullSurface(skull, center, new Vector3(side * s, u, -f));
  const normal = surface.normal;
  // The eye stands a little out of the face, so that the forehead over it does not hide the top
  // of the white.
  const point = surface.point.clone().addScaledVector(normal, EYE.lift * h);
  // The eye faces a little more forward than the face, as the eyes of the sheet do.
  const out = normal
    .clone()
    .lerp(new Vector3(0, 0, -1), 0.25)
    .normalize();
  const up = new Vector3(0, 1, 0).projectOnPlane(out).normalize();
  // `across` points away from the nose, to the outer corner of the eye.
  const across = new Vector3().crossVectors(up, out).multiplyScalar(-side);
  const cos = Math.cos(EYE.tilt);
  const sin = Math.sin(EYE.tilt);
  const place = (a: number, b: number, o: number): Vec3 => {
    // The tilt raises the outer corner.
    const ta = a * cos - b * sin;
    const tb = a * sin + b * cos;
    const p = point
      .clone()
      .addScaledVector(across, ta * h)
      .addScaledVector(up, tb * h)
      .addScaledVector(out, o * h);
    return [p.x, p.y, p.z];
  };
  const bone = side > 0 ? 'eyeR' : 'eyeL';
  const [halfWidth, top, bottom] = EYE.white;
  // The almond: the outer corner (+across) is narrower than the inner corner.
  const almondHeight = (a: number, upper: boolean): number => {
    const c = Math.max(-1, Math.min(1, a / halfWidth));
    return (upper ? top : bottom) * Math.sqrt(1 - c * c) * (1 - 0.1 * c);
  };
  const almond: [number, number][] = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 2 * Math.PI;
    const a = Math.cos(angle) * halfWidth;
    return [a, Math.sign(Math.sin(angle)) * almondHeight(a, Math.sin(angle) >= 0)];
  });
  // The iris and the pupil end at the lids, as in the sheet.
  const clip = (outline: [number, number][]): [number, number][] =>
    outline.map(([a, b]) => {
      const limit = 0.94 * almondHeight(Math.max(-halfWidth, Math.min(halfWidth, a)), b >= 0);
      return [
        Math.max(-halfWidth * 0.94, Math.min(halfWidth * 0.94, a)),
        Math.max(-limit, Math.min(limit, b)),
      ];
    });

  addPainted(builder, plate(almond, -0.02, 0.01, place), bone, () => palette.eyeWhite, 'lacquer');
  const [irisWidth, irisHeight, toNose] = EYE.iris;
  const irisMiddle = [-toNose, 0.004] as const;
  addPainted(
    builder,
    plate(clip(oval(irisMiddle, irisWidth, irisHeight, irisHeight, 10)), -0.01, 0.016, place),
    bone,
    () => palette.iris,
    'lacquer',
  );
  addPainted(
    builder,
    plate(clip(oval(irisMiddle, EYE.pupil, EYE.pupil * 1.2, EYE.pupil * 1.2, 8)), 0, 0.021, place),
    bone,
    () => palette.pupil,
    'lacquer',
  );
  const lightMiddle = [irisMiddle[0] + 0.034, irisMiddle[1] + 0.038] as const;
  addPainted(
    builder,
    plate(oval(lightMiddle, EYE.light, EYE.light, EYE.light, 6), 0.005, 0.026, place),
    bone,
    () => palette.eyeWhite,
    'lacquer',
  );

  // The lid line: a bar along the top of the almond, from near the inner corner to a short flick
  // past the outer corner. It is thicker at the outer end.
  const lidRings: Ring[] = [];
  const steps = 7;
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const a = (EYE.lidStart + (1.12 - EYE.lidStart) * k) * halfWidth;
    const b = a <= halfWidth ? almondHeight(a, true) : 0.012 + EYE.flick * (a - halfWidth);
    const width = EYE.lid * (0.5 + 0.9 * k);
    const low = b - width * 0.35;
    const high = b + width * 0.65;
    lidRings.push([
      place(a, low, -0.01),
      place(a, high, -0.01),
      place(a, high, 0.02),
      place(a, low, 0.02),
    ]);
  }
  addPainted(builder, ringLoft(lidRings), bone, () => palette.lid, 'lacquer');

  return [point.x, point.y, point.z];
}

/**
 * Adds one ear (`fox-views.png`): a tall pointed ear that leans out, white inside, with a dark
 * tip and a dark back. The front of the ear is a hollow between two rims.
 *
 * @param builder The mesh that gets the parts.
 * @param palette The colors of the head.
 * @param toModel The change from the axes of the head to the axes of the model.
 * @param side 1 for the right ear, -1 for the left ear.
 * @returns The base of the ear: the bind position of its bone.
 */
function addEar(
  builder: MeshBuilder,
  palette: HeadColors,
  toModel: (p: HeadPoint) => Vec3,
  side: 1 | -1,
): Vec3 {
  const base: HeadPoint = [side * 0.34, 0.29, -0.08];
  const length = 0.68;
  const [width, depth] = [0.72, 0.34];
  // The axes of the ear in the axes of the head: up along the ear, leaning out 17° and forward 4°.
  const axis = new Vector3(side * Math.sin(0.3), Math.cos(0.3), Math.sin(0.07)).normalize();
  const front = new Vector3(side * 0.3, 0, 1).projectOnPlane(axis).normalize();
  const across = new Vector3().crossVectors(axis, front).multiplyScalar(side);
  const place = (a: number, n: number, t: number): Vec3 => {
    const p = new Vector3(...base)
      .addScaledVector(across, a)
      .addScaledVector(front, n)
      .addScaledVector(axis, t * length);
    return toModel([p.x, p.y, p.z]);
  };

  const rings: Ring[] = [];
  for (const t of EAR_RINGS) {
    const w = (width / 2) * (1 - t) ** 0.85;
    const d = depth * (1 - 0.75 * t);
    rings.push([
      place(w, 0.15 * d, t),
      place(0.45 * w, -0.65 * d, t),
      place(-0.45 * w, -0.65 * d, t),
      place(-w, 0.15 * d, t),
      place(-0.5 * w, -0.04 * d, t),
      place(0.5 * w, -0.04 * d, t),
    ]);
  }
  rings.push([place(0, 0, 1)]);
  const corners = ringLoft(rings);

  // The axes of the ear in the axes of the model, for the colors.
  const origin = new Vector3(...toModel([0, 0, 0]));
  const direction = (v: Vector3): Vector3 =>
    new Vector3(...toModel([v.x, v.y, v.z])).sub(origin).normalize();
  const [acrossModel, frontModel, axisModel] = [across, front, axis].map(direction);
  const baseModel = new Vector3(...toModel(base));
  const h = origin.distanceTo(new Vector3(...toModel([1, 0, 0])));
  addPainted(builder, corners, side > 0 ? 'earR' : 'earL', (centroid, normal) => {
    const offset = new Vector3(...centroid).sub(baseModel);
    const t = offset.dot(axisModel ?? new Vector3()) / (length * h);
    const a = Math.abs(offset.dot(acrossModel ?? new Vector3())) / h;
    const facing = new Vector3(...normal).dot(frontModel ?? new Vector3());
    const halfWidth = (width / 2) * Math.max(0, 1 - t) ** 0.85;
    // The band between two rings of the ear, so that each color border follows a ring.
    const band = EAR_RINGS.filter((ring) => ring < t).length - 1;
    if (band >= EAR_BANDS.tip) {
      return palette.dark;
    }
    if (facing > 0.25 && a < 0.62 * halfWidth) {
      return palette.white;
    }
    if (facing < -0.3 && band >= EAR_BANDS.back) {
      return palette.dark;
    }
    return palette.fur;
  });

  return toModel(base);
}
