import { Vector3 } from 'three';
import { oval, plate, skullSurface } from '../face-plates.ts';
import type { MeshBuilder, Rgb } from '../mesh.ts';
import { addPainted, jitter } from '../painted.ts';
import { ringLoft } from '../primitives.ts';
import type { Ring } from '../primitives.ts';
import type { Vec3 } from '../tuples.ts';
import type { BearPalette } from './bear-palette.ts';

/**
 * A place in the axes of the head, in head heights `H` from the head center: `s` to the right
 * side of the animal (+x), `u` up, and `f` forward (-z).
 */
type HeadPoint = readonly [s: number, u: number, f: number];

/**
 * One ring of the head across the forward axis, in H: the forward place, the height of the
 * middle, the half width, the height above and below the middle, the size of the jowls, and the
 * squareness from 0 for an oval to 1 for a box with round corners.
 */
type HeadRow = readonly [
  f: number,
  middle: number,
  halfWidth: number,
  up: number,
  down: number,
  jowl: number,
  square: number,
];

/**
 * The rings of the bear head from the back of the skull to the tip of the muzzle
 * (`bear-views.png`). The skull is broad and round, the jowls make the head widest below the
 * eyes, and the long tall muzzle stands out of the lower half of the face. An end ring with a
 * half width of 0 is a point.
 */
const HEAD_ROWS: readonly HeadRow[] = [
  [-0.66, -0.02, 0, 0, 0, 0, 0],
  [-0.58, -0.02, 0.35, 0.3, 0.4, 0, 0],
  [-0.42, 0, 0.57, 0.43, 0.53, 0.04, 0],
  [-0.15, 0.01, 0.65, 0.5, 0.55, 0.07, 0],
  [0.12, -0.01, 0.66, 0.52, 0.53, 0.08, 0],
  [0.34, -0.04, 0.6, 0.47, 0.48, 0.06, 0],
  [0.5, -0.09, 0.48, 0.36, 0.43, 0.02, 0.2],
  [0.6, -0.2, 0.28, 0.28, 0.31, 0, 0.6],
  [0.76, -0.21, 0.27, 0.25, 0.28, 0, 0.6],
  [0.9, -0.2, 0.24, 0.19, 0.23, 0, 0.5],
  [0.98, -0.19, 0.17, 0.13, 0.16, 0, 0.3],
  [1.02, -0.17, 0, 0, 0, 0, 0],
];

/** The number of corners of each ring of the head. */
const HEAD_SEGMENTS = 16;

/** The angle of the jowls below the side of the head, in radians. */
const JOWL_ANGLE = (35 * Math.PI) / 180;

/** The half width of a jowl around its angle, in radians. */
const JOWL_SPREAD = (25 * Math.PI) / 180;

/** The largest radial offset of a corner of the head, as a part of its radius. */
const HEAD_JITTER = 0.035;

/**
 * The tan muzzle, in H: the forward place where the tan starts, its half width, and the half
 * width and the top of the tan chin under the face.
 */
const MUZZLE = { from: 0.58, halfWidth: 0.34, chinHalfWidth: 0.28, chinTop: -0.32 } as const;

/** The black nose on the top front of the muzzle, in H. */
const NOSE = { middle: -0.1, halfWidth: 0.15, up: 0.08, down: 0.1 } as const;

/**
 * The eye of the bear, in H: small and dark, with a tan rim, a black pupil, and a white light,
 * as in `bear-views.png`.
 */
const EYE = {
  /** The place of the right eye in the axes of the head. The ray from the head center finds the face. */
  direction: [0.26, 0.05, 0.5],
  /** The radius of the tan rim. */
  rim: 0.07,
  /** The radius of the iris. */
  iris: 0.055,
  /** The radius of the pupil. */
  pupil: 0.03,
  /** The radius of the light. */
  light: 0.014,
  /** The distance of the eye plane out of the face. */
  lift: 0.01,
} as const;

/** The round ear of the bear, in H. */
const EAR = {
  /** The middle of the base of the right ear, in the axes of the head. */
  base: [0.46, 0.36, -0.05],
  /** The length from the base to the top. */
  length: 0.27,
  /** The width at the widest ring. */
  width: 0.36,
  /** The depth of the ear from its back to the rims of its hollow. */
  depth: 0.15,
  /** The lean of the ear out to the side, in radians. */
  lean: 0.5,
  /** The turn of the hollow of the ear from the front toward the side, in radians. */
  turn: 0.6,
} as const;

/** The rings of an ear: their places along the ear and their widths, as parts of the full width. */
const EAR_RINGS: readonly (readonly [t: number, width: number])[] = [
  [0, 0.85],
  [0.35, 1],
  [0.7, 0.85],
  [0.92, 0.45],
];

/** The parts of the head that the instruments and the pose need, in the axes of the model. */
export interface BearHead {
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

/**
 * Adds the head of the bear (`bear-views.png`): the broad skull with the jowls and the tan
 * muzzle, the black nose, the small dark eyes, and the round ears. The whole head follows the
 * `head` bone, except the eyes and the ears.
 *
 * @param builder The mesh that gets the parts.
 * @param palette The colors of the bear.
 * @param h The head height `H`, in meters.
 * @param center The center of the head.
 * @returns The places of the eyes, the ears, the jaw, and the mouth.
 */
export function addBearHead(
  builder: MeshBuilder,
  palette: BearPalette,
  h: number,
  center: Vec3,
): BearHead {
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

  const skull = ringLoft(HEAD_ROWS.map((row, j) => headRing(row, j).map(toModel)));
  addPainted(builder, skull, 'head', (centroid) => skullColor(toHead(centroid), palette));
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
    jaw: toModel([0, -0.35, 0.3]),
    mouth: toModel([0, -0.36, 0.92]),
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
function headRing(
  [f, middle, halfWidth, up, down, jowl, square]: HeadRow,
  index: number,
): HeadPoint[] {
  if (halfWidth === 0) {
    return [[0, middle, f]];
  }
  const turn = index % 2 === 0 ? 0 : 0.5;
  const ring: HeadPoint[] = [];
  for (let i = 0; i < HEAD_SEGMENTS; i++) {
    const angle = ((i + turn) / HEAD_SEGMENTS) * 2 * Math.PI;
    // A power below 1 of the cosine and the sine moves the corners toward the corners of a box.
    const power = 1 / (1 + square);
    const cos = Math.sign(Math.cos(angle)) * Math.abs(Math.cos(angle)) ** power;
    const sin = Math.sign(Math.sin(angle)) * Math.abs(Math.sin(angle)) ** power;
    // The jowls stand out at the same angle below each side.
    const below = Math.atan2(-sin, Math.abs(cos));
    const bump = jowl * Math.exp(-(((below - JOWL_ANGLE) / JOWL_SPREAD) ** 2));
    const key = Math.round(Math.abs(cos) * 1000) * 3 + Math.round(sin * 1000);
    const scale = 1 + HEAD_JITTER * jitter(index + 200, key);
    const radiusS = (halfWidth + bump) * scale;
    const radiusU = ((sin >= 0 ? up : down) + bump) * scale;
    ring.push([cos * radiusS, middle + sin * radiusU, f]);
  }
  return ring;
}

/**
 * Gives the color of a triangle of the skull: the tan of the muzzle in front of the face and on
 * the chin, and the fur elsewhere.
 *
 * @param p The centroid of the triangle, in the axes of the head.
 * @param palette The colors of the bear.
 * @returns The color.
 */
function skullColor([s, u, f]: HeadPoint, palette: BearPalette): Rgb {
  const muzzle = f > MUZZLE.from && Math.abs(s) < MUZZLE.halfWidth;
  const chin = f > 0.4 && Math.abs(s) < MUZZLE.chinHalfWidth && u < MUZZLE.chinTop;
  return muzzle || chin ? palette.muzzle : palette.fur;
}

/**
 * Adds the black nose on the top front of the muzzle.
 *
 * @param builder The mesh that gets the part.
 * @param palette The colors of the bear.
 * @param toModel The change from the axes of the head to the axes of the model.
 */
function addNose(
  builder: MeshBuilder,
  palette: BearPalette,
  toModel: (p: HeadPoint) => Vec3,
): void {
  const ring = (f: number, scale: number): Ring =>
    Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * 2 * Math.PI;
      const sin = Math.sin(angle);
      // The nose is a rounded triangle with its point down, as in the sheet.
      const width = NOSE.halfWidth * scale * (sin >= 0 ? 1 : 1 + 0.5 * sin);
      return toModel([
        Math.cos(angle) * width,
        NOSE.middle + sin * (sin >= 0 ? NOSE.up : NOSE.down) * scale,
        f,
      ]);
    });
  const corners = ringLoft([
    ring(0.92, 0.8),
    ring(0.99, 1),
    ring(1.04, 0.7),
    [toModel([0, NOSE.middle + 0.01, 1.06])],
  ]);
  addPainted(builder, corners, 'head', () => palette.dark, 'lacquer');
}

/**
 * Adds one eye (`bear-views.png`): a small dark iris in a tan rim, with a black pupil and a white
 * light. The parts are thin plates on the face, and they all follow the eye bone, so that they
 * close together in a blink.
 *
 * @param builder The mesh that gets the parts.
 * @param palette The colors of the bear.
 * @param h The head height `H`, in meters.
 * @param center The head center.
 * @param skull The corner list of the skull, in the axes of the model.
 * @param side 1 for the right eye, -1 for the left eye.
 * @returns The middle of the eye: the bind position of its bone.
 */
function addEye(
  builder: MeshBuilder,
  palette: BearPalette,
  h: number,
  center: Vec3,
  skull: readonly number[],
  side: 1 | -1,
): Vec3 {
  const [s, u, f] = EYE.direction;
  const surface = skullSurface(skull, center, new Vector3(side * s, u, -f));
  const point = surface.point.clone().addScaledVector(surface.normal, EYE.lift * h);
  // The eye faces a little more forward than the face, as the eyes of the sheet do.
  const out = surface.normal
    .clone()
    .lerp(new Vector3(0, 0, -1), 0.4)
    .normalize();
  const up = new Vector3(0, 1, 0).projectOnPlane(out).normalize();
  const across = new Vector3().crossVectors(up, out).multiplyScalar(-side);
  const place = (a: number, b: number, o: number): Vec3 => {
    const p = point
      .clone()
      .addScaledVector(across, a * h)
      .addScaledVector(up, b * h)
      .addScaledVector(out, o * h);
    return [p.x, p.y, p.z];
  };
  const bone = side > 0 ? 'eyeR' : 'eyeL';

  addPainted(
    builder,
    plate(oval([0, 0], EYE.rim, EYE.rim * 0.9, EYE.rim * 0.9, 8), -0.02, 0.006, place),
    bone,
    () => palette.muzzle,
  );
  addPainted(
    builder,
    plate(oval([0, 0], EYE.iris, EYE.iris, EYE.iris, 8), -0.01, 0.012, place),
    bone,
    () => palette.iris,
    'lacquer',
  );
  addPainted(
    builder,
    plate(oval([0, 0], EYE.pupil, EYE.pupil, EYE.pupil, 6), 0, 0.016, place),
    bone,
    () => palette.pupil,
    'lacquer',
  );
  addPainted(
    builder,
    plate(oval([-0.014, 0.018], EYE.light, EYE.light, EYE.light, 5), 0.004, 0.02, place),
    bone,
    () => palette.light,
    'lacquer',
  );
  return [point.x, point.y, point.z];
}

/**
 * Adds one ear (`bear-views.png`): a short round ear on the top corner of the head that leans
 * out. Its front is a hollow between two rims, in a darker brown.
 *
 * @param builder The mesh that gets the parts.
 * @param palette The colors of the bear.
 * @param toModel The change from the axes of the head to the axes of the model.
 * @param side 1 for the right ear, -1 for the left ear.
 * @returns The base of the ear: the bind position of its bone.
 */
function addEar(
  builder: MeshBuilder,
  palette: BearPalette,
  toModel: (p: HeadPoint) => Vec3,
  side: 1 | -1,
): Vec3 {
  const base: HeadPoint = [side * EAR.base[0], EAR.base[1], EAR.base[2]];
  // The axes of the ear in the axes of the head: up along the ear and leaning out.
  const axis = new Vector3(side * Math.sin(EAR.lean), Math.cos(EAR.lean), 0);
  const front = new Vector3(side * Math.sin(EAR.turn), 0, Math.cos(EAR.turn))
    .projectOnPlane(axis)
    .normalize();
  const across = new Vector3().crossVectors(axis, front).multiplyScalar(side);
  const place = (a: number, n: number, t: number): Vec3 => {
    const p = new Vector3(...base)
      .addScaledVector(across, a)
      .addScaledVector(front, n)
      .addScaledVector(axis, t * EAR.length);
    return toModel([p.x, p.y, p.z]);
  };

  const rings: Ring[] = EAR_RINGS.map(([t, scale]) => {
    const w = (EAR.width / 2) * scale;
    const d = EAR.depth * scale;
    return [
      place(w, 0.2 * d, t),
      place(0.5 * w, -0.6 * d, t),
      place(-0.5 * w, -0.6 * d, t),
      place(-w, 0.2 * d, t),
      place(-0.45 * w, 0.12 * d, t),
      place(0.45 * w, 0.12 * d, t),
    ];
  });
  rings.push([place(0, 0, 1)]);
  const corners = ringLoft(rings);

  // The front of the ear in the axes of the model, for the color of the hollow.
  const origin = new Vector3(...toModel([0, 0, 0]));
  const frontModel = new Vector3(...toModel([front.x, front.y, front.z])).sub(origin).normalize();
  addPainted(builder, corners, side > 0 ? 'earR' : 'earL', (_, normal) =>
    new Vector3(...normal).dot(frontModel) > 0.3 ? palette.innerEar : palette.fur,
  );

  return toModel(base);
}
