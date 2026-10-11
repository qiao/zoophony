import { Vector3 } from 'three';

import type { BodyColors } from '../body-parts.ts';
import { oval, plate, skullSurface } from '../face-plates.ts';
import { inMeters, limbTube } from '../limb-tube.ts';
import { srgb } from '../mesh.ts';
import type { MeshBuilder } from '../mesh.ts';
import { addPainted } from '../painted.ts';
import { ringLoft } from '../primitives.ts';
import type { Ring } from '../primitives.ts';
import type { BoneName } from '../rig.ts';
import type { Vec3 } from '../tuples.ts';

/** The axes of the body of a penguin: the head height, and the change from H to the model. */
export interface PenguinPlace {
  /** The head height `H`, in meters. */
  readonly h: number;
  /**
   * Gives a point of the body in meters, in the axes of the model. The animal faces -z, and its
   * left side is -x.
   *
   * @param x The distance to the side, in H.
   * @param y The height above the soles, in H.
   * @param z The distance to the back, in H.
   * @returns The point.
   */
  readonly at: (x: number, y: number, z: number) => Vec3;
}

/**
 * The color of the inside of the open beak: a dark brown, a little lighter than the darkest
 * samples in the open beaks of `orchestra-side.png` (`#321207` to `#6d3818`).
 */
export const MOUTH_COLOR = '#4d2312';

/**
 * The beak of the penguin, in H (`orchestra-latest.png`, `orchestra-side.png`): a large orange
 * beak that points forward and a little down. The upper half follows the head, and the lower half
 * follows the jaw, so that the choir pose opens it (design 4.7).
 */
const BEAK = {
  /** The middle of the root on the line of the mouth, in H above the soles and forward. */
  root: [0, 2.7, -0.31],
  /** The direction of the beak: forward and a little down. */
  direction: [0, -0.18, -1],
  /** The length from the root to the tip. */
  length: 0.48,
  /** The half width and the height of the upper half along the beak: (place, width, height). */
  upper: [
    [0, 0.19, 0.15],
    [0.35, 0.15, 0.115],
    [0.7, 0.09, 0.075],
  ],
  /** The half width and the depth of the lower half along the beak: (place, width, depth). */
  lower: [
    [0, 0.175, 0.1],
    [0.35, 0.135, 0.08],
    [0.7, 0.08, 0.05],
  ],
  /** The place of the tip of the lower half along the beak. The upper half reaches past it. */
  lowerTip: 0.94,
  /** The place of the mouth along the beak: the middle of the mouth for the instruments. */
  mouth: 0.8,
  /**
   * The part of the beak from the root that has the dark inside of the mouth. The front of the
   * beak is orange inside, so that an open beak shows a dark mouth and orange tips.
   */
  inside: 0.55,
} as const;

/** The eye of the penguin, in H: a black eye on a white patch, as in the reference images. */
const EYE = {
  /** The direction of the right eye from the head center: to the side, up, and forward. */
  direction: [0.24, 0.32, 0.3],
  /** The half width, the height above the middle, and the depth below it of the white patch. */
  patch: [0.056, 0.062, 0.056],
  /** The half width and the half height of the black eye. */
  eye: [0.028, 0.034],
  /** The white light on the eye. */
  light: {
    /** The radius of the light. */
    radius: 0.01,
    /** The place of the light from the middle of the eye: out from the nose, and up. */
    at: [0.008, 0.013],
  },
  /** The distance of the patch out of the head surface. */
  lift: 0.03,
} as const;

/**
 * The flipper of the penguin, in H. The flipper hangs from the shoulder joint in the bind pose. It
 * is flat and wide: thin to the side, and wide to the front and the back. It reaches the edge of
 * the choir folder in front of the belly.
 */
const FLIPPER = {
  /** The shoulder joint: the distance to the side, the height above the soles, and the depth. */
  shoulder: [0.46, 2.22, 0],
  /** The distance of each clavicle from the middle. */
  clavicle: 0.15,
  /** The start of the rounded root of the flipper above the shoulder joint, inside the body. */
  root: 0.06,
  /** The length of the upper part, on `upperArm`. */
  upper: 0.395,
  /** The length of the middle part, on `forearm`. */
  fore: 0.395,
  /** The length of the tip, on `hand`. */
  tip: 0.16,
  /** The distance of the palm, the point that holds the folder, below the wrist. */
  palm: 0.12,
  /** The half thickness, and the half width to the front and to the back, at the elbow. */
  elbow: [0.065, 0.17, 0.155],
  /** The turn of the wide side of the flipper to the front, as the tangent of its angle. */
  turn: 0.45,
} as const;

/** The foot of the penguin, in H: a small flat orange foot under the front of the body. */
const FOOT = {
  /** The distance of the middle of each heel from the middle of the body. */
  spread: 0.31,
  /** The depth of the middle of the heel, under the egg. */
  heel: -0.14,
  /** The depth of the tips of the toes, which stand out in front of the belly. */
  toes: -0.56,
  /** The turn of the toes out from the front, in radians. */
  turn: (12 * Math.PI) / 180,
  /** The half width and the height along the foot: (place from the heel, width, height). */
  sections: [
    [0, 0.08, 0.09],
    [0.3, 0.115, 0.1],
    [0.65, 0.14, 0.07],
    [0.9, 0.145, 0.045],
    [1, 0.1, 0.022],
  ],
} as const;

/** The points of the face that the body needs. */
export interface PenguinFace {
  /** The hinge of the lower beak: the bind position of the `jaw` bone. */
  readonly jaw: Vec3;
  /** The middle of the mouth, between the two halves of the beak. */
  readonly mouth: Vec3;
  /** The middle of the left eye: the bind position of the `eyeL` bone. */
  readonly eyeL: Vec3;
  /** The middle of the right eye: the bind position of the `eyeR` bone. */
  readonly eyeR: Vec3;
}

/**
 * Adds the face of the penguin: the beak and the eyes.
 *
 * @param builder The mesh that gets the parts.
 * @param colors The colors of the species.
 * @param place The axes of the body.
 * @param skull The corner list of the head, for the places of the eyes.
 * @param center The head center.
 * @returns The points of the face.
 */
export function addFace(
  builder: MeshBuilder,
  colors: BodyColors,
  place: PenguinPlace,
  skull: readonly number[],
  center: Vec3,
): PenguinFace {
  const beak = addBeak(builder, colors, place);
  const [eyeR, eyeL] = ([1, -1] as const).map((side) =>
    addEye(builder, colors, place.h, skull, center, side),
  );
  return { ...beak, eyeR: eyeR ?? center, eyeL: eyeL ?? center };
}

/**
 * Adds the beak: the upper half on `head` and the lower half on `jaw`. The faces of the mouth
 * inside the two halves are dark, so that the open beak shows its inside.
 *
 * @param builder The mesh that gets the parts.
 * @param colors The colors of the species.
 * @param place The axes of the body.
 * @returns The hinge of the jaw and the mouth.
 */
function addBeak(
  builder: MeshBuilder,
  colors: BodyColors,
  place: PenguinPlace,
): Pick<PenguinFace, 'jaw' | 'mouth'> {
  const { h } = place;
  const root = new Vector3(...place.at(...BEAK.root));
  const along = new Vector3(...BEAK.direction).normalize();
  const up = new Vector3(0, 1, 0).projectOnPlane(along).normalize();
  const across = new Vector3().crossVectors(along, up).normalize();
  const point = (t: number, a: number, b: number): Vec3 => {
    const p = root
      .clone()
      .addScaledVector(along, t * BEAK.length * h)
      .addScaledVector(across, a * h)
      .addScaledVector(up, b * h);
    return [p.x, p.y, p.z];
  };

  // The upper half: a dome over the line of the mouth, with a flat underside.
  const upperRings: Ring[] = BEAK.upper.map(([t, w, height]) => [
    point(t, w, 0),
    point(t, 0.7 * w, 0.65 * height),
    point(t, 0, height),
    point(t, -0.7 * w, 0.65 * height),
    point(t, -w, 0),
    point(t, -0.5 * w, -0.08 * height),
    point(t, 0.5 * w, -0.08 * height),
  ]);
  upperRings.push([point(1, 0, -0.012)]);
  const mouth = srgb(MOUTH_COLOR);
  const facing = (normal: readonly number[]): number =>
    up.dot(new Vector3(normal[0], normal[1], normal[2]));
  const inside = (centroid: readonly number[]): boolean =>
    new Vector3(centroid[0], centroid[1], centroid[2]).sub(root).dot(along) <
    BEAK.inside * BEAK.length * h;
  addPainted(builder, ringLoft(upperRings), 'head', (centroid, normal) =>
    facing(normal) < -0.6 && inside(centroid) ? mouth : colors.accent,
  );

  // The lower half: a flat top under the line of the mouth, and a keel below.
  const lowerRings: Ring[] = BEAK.lower.map(([t, w, depth]) => [
    point(t, w, 0),
    point(t, 0.5 * w, 0.08 * depth),
    point(t, -0.5 * w, 0.08 * depth),
    point(t, -w, 0),
    point(t, -0.6 * w, -0.6 * depth),
    point(t, 0, -depth),
    point(t, 0.6 * w, -0.6 * depth),
  ]);
  lowerRings.push([point(BEAK.lowerTip, 0, -0.01)]);
  addPainted(builder, ringLoft(lowerRings), 'jaw', (centroid, normal) =>
    facing(normal) > 0.6 && inside(centroid) ? mouth : colors.accent,
  );

  return { jaw: point(0, 0, 0), mouth: point(BEAK.mouth, 0, 0) };
}

/**
 * Adds one eye: a white patch on the head, and a black eye with a white light on its eye bone,
 * so that the eye closes in a blink and the patch stays.
 *
 * @param builder The mesh that gets the parts.
 * @param colors The colors of the species.
 * @param h The head height `H`, in meters.
 * @param skull The corner list of the head.
 * @param center The head center.
 * @param side 1 for the right eye, -1 for the left eye.
 * @returns The middle of the eye: the bind position of its bone.
 */
function addEye(
  builder: MeshBuilder,
  colors: BodyColors,
  h: number,
  skull: readonly number[],
  center: Vec3,
  side: 1 | -1,
): Vec3 {
  const [s, u, f] = EYE.direction;
  const ray = new Vector3(side * s, u, -f).normalize();
  const surface = skullSurface(skull, center, ray);
  // The plate faces between the facet under it and the ray from the head center, so that a
  // tilted facet does not tip the plate into the head.
  const out = surface.normal.clone().add(ray).normalize();
  const middle = surface.point.clone().addScaledVector(out, EYE.lift * h);
  const up = new Vector3(0, 1, 0).projectOnPlane(out).normalize();
  const across = new Vector3().crossVectors(up, out).normalize();
  const place = (a: number, b: number, o: number): Vec3 => {
    const p = middle
      .clone()
      .addScaledVector(across, a * h)
      .addScaledVector(up, b * h)
      .addScaledVector(out, o * h);
    return [p.x, p.y, p.z];
  };
  const bone: BoneName = side > 0 ? 'eyeR' : 'eyeL';

  const [width, top, bottom] = EYE.patch;
  addPainted(
    builder,
    plate(oval([0, 0], width, top, bottom, 12), -0.04, 0, place),
    'head',
    () => colors.belly,
  );
  const [eyeWidth, eyeHeight] = EYE.eye;
  addPainted(
    builder,
    plate(oval([0, 0], eyeWidth, eyeHeight, eyeHeight, 10), -0.01, 0.012, place),
    bone,
    () => colors.eye,
    'lacquer',
  );
  const { radius, at } = EYE.light;
  addPainted(
    builder,
    plate(oval([side * at[0], at[1]], radius, radius, radius, 6), 0, 0.017, place),
    bone,
    () => colors.eyeLight,
    'lacquer',
  );
  return [middle.x, middle.y, middle.z];
}

/** The places of the arm bones and the points of the flippers. */
export interface PenguinFlippers {
  /** The bind position of each arm bone. */
  readonly positions: Readonly<
    Record<
      | 'shoulderL'
      | 'upperArmL'
      | 'forearmL'
      | 'handL'
      | 'fingersL'
      | 'shoulderR'
      | 'upperArmR'
      | 'forearmR'
      | 'handR'
      | 'fingersR',
      Vec3
    >
  >;
  /** The point of the left flipper that holds the folder. */
  readonly palmL: Vec3;
  /** The point of the right flipper that holds the folder. */
  readonly palmR: Vec3;
  /** The middle of the left finger block, on its `fingers` bone: the palm. */
  readonly fingerBlockL: Vec3;
  /** The middle of the right finger block, on its `fingers` bone: the palm. */
  readonly fingerBlockR: Vec3;
}

/**
 * Adds the two flippers in the bind pose: each hangs straight down from its shoulder joint
 * (design 4.7). A flipper is three flat parts: the upper part on `upperArm`, the middle part on
 * `forearm`, and the tip on `hand`. The upper part starts in the body, so that the root of the
 * flipper stays in the body in each pose. The `fingers` bone has no part.
 *
 * @param builder The mesh that gets the parts.
 * @param colors The colors of the species.
 * @param place The axes of the body.
 * @returns The places of the arm bones and the points that hold the folder.
 */
export function addFlippers(
  builder: MeshBuilder,
  colors: BodyColors,
  place: PenguinPlace,
): PenguinFlippers {
  const { h, at } = place;
  const flipper = (side: -1 | 1) => {
    const [x, y, z] = FLIPPER.shoulder;
    const shoulder = at(side * x, y, z);
    const elbow = at(side * x, y - FLIPPER.upper, z);
    const wrist = at(side * x, y - FLIPPER.upper - FLIPPER.fore, z);
    const tip = at(side * x, y - FLIPPER.upper - FLIPPER.fore - FLIPPER.tip, z);
    const palm = at(side * x, y - FLIPPER.upper - FLIPPER.fore - FLIPPER.palm, z);
    // The wide side of the flipper turns a little to the front, so that the front view shows
    // the flipper beside the body.
    const forward: Vec3 = [side * FLIPPER.turn, 0, -1];
    const name = (base: 'upperArm' | 'forearm' | 'hand'): BoneName =>
      `${base}${side < 0 ? 'L' : 'R'}`;
    const black = () => colors.fur;
    const [thick, front, back] = FLIPPER.elbow;

    // The root starts a little above the joint, inside the body.
    const root = at(side * x, y + FLIPPER.root, z);
    const rootShare = FLIPPER.root / (FLIPPER.root + FLIPPER.upper);
    addPainted(
      builder,
      limbTube(
        root,
        elbow,
        inMeters(h, [
          [0, 0, 0, 0],
          [rootShare, 0.8 * thick, 0.6 * front, 0.6 * back],
          [0.45, thick * 1.05, front, back],
          [0.85, thick * 1.02, front * 1.02, back * 1.02],
          [1.05, thick, front, back],
        ]),
        forward,
        side * 10,
      ),
      name('upperArm'),
      black,
    );
    addPainted(
      builder,
      limbTube(
        elbow,
        wrist,
        inMeters(h, [
          [-0.08, thick, front, back],
          [0.5, 0.92 * thick, 0.88 * front, 0.88 * back],
          [1.06, 0.8 * thick, 0.7 * front, 0.68 * back],
        ]),
        forward,
        side * 20,
      ),
      name('forearm'),
      black,
    );
    addPainted(
      builder,
      limbTube(
        wrist,
        tip,
        inMeters(h, [
          [-0.15, 0.8 * thick, 0.7 * front, 0.68 * back],
          [0.45, 0.68 * thick, 0.56 * front, 0.54 * back],
          [0.85, 0.45 * thick, 0.32 * front, 0.3 * back],
          [1, 0, 0, 0],
        ]),
        forward,
        side * 30,
      ),
      name('hand'),
      black,
    );

    return {
      clavicle: at(side * FLIPPER.clavicle, y, z),
      shoulder,
      elbow,
      wrist,
      palm,
    };
  };

  const left = flipper(-1);
  const right = flipper(1);
  return {
    palmL: left.palm,
    palmR: right.palm,
    fingerBlockL: left.palm,
    fingerBlockR: right.palm,
    positions: {
      shoulderL: left.clavicle,
      upperArmL: left.shoulder,
      forearmL: left.elbow,
      handL: left.wrist,
      fingersL: left.palm,
      shoulderR: right.clavicle,
      upperArmR: right.shoulder,
      forearmR: right.elbow,
      handR: right.wrist,
      fingersR: right.palm,
    },
  };
}

/**
 * Adds the two feet: flat orange feet on the soles, with the toes out in front of the belly and
 * turned a little out. The penguin shows no legs, so the `thigh` and the `shin` bones have no
 * part. No pose turns the legs (design 4.7).
 *
 * @param builder The mesh that gets the parts.
 * @param colors The colors of the species.
 * @param place The axes of the body.
 * @returns The bind positions of the leg bones.
 */
export function addFeet(
  builder: MeshBuilder,
  colors: BodyColors,
  place: PenguinPlace,
): Readonly<Record<'thighL' | 'shinL' | 'footL' | 'thighR' | 'shinR' | 'footR', Vec3>> {
  const { at } = place;
  const foot = (side: -1 | 1) => {
    const heel = new Vector3(side * FOOT.spread, 0, FOOT.heel);
    const toward = new Vector3(side * Math.sin(FOOT.turn), 0, -Math.cos(FOOT.turn));
    const length = FOOT.heel - FOOT.toes;
    const across = new Vector3(Math.cos(FOOT.turn), 0, side * Math.sin(FOOT.turn));
    const section = ([t, width, rise]: readonly [number, number, number]): Ring => {
      const middle = heel.clone().addScaledVector(toward, t * length);
      const corner = (a: number, b: number): Vec3 => {
        const p = middle.clone().addScaledVector(across, a);
        return at(p.x, b, p.z);
      };
      return [
        corner(width, 0),
        corner(0.95 * width, 0.6 * rise),
        corner(0, rise),
        corner(-0.95 * width, 0.6 * rise),
        corner(-width, 0),
      ];
    };
    addPainted(
      builder,
      ringLoft(FOOT.sections.map(section)),
      side < 0 ? 'footL' : 'footR',
      () => colors.accent,
    );
    const ankle = heel.clone().addScaledVector(toward, 0.2 * length);
    return {
      hip: at(side * 0.25, 0.5, -0.05),
      knee: at(side * FOOT.spread, 0.3, -0.1),
      ankle: at(ankle.x, 0.08, ankle.z),
    };
  };

  const left = foot(-1);
  const right = foot(1);
  return {
    thighL: left.hip,
    shinL: left.knee,
    footL: left.ankle,
    thighR: right.hip,
    shinR: right.knee,
    footR: right.ankle,
  };
}
