import { Vector3 } from 'three';
import type { BodyBones } from '../biped.ts';
import { bodyFrame } from '../body-frame.ts';
import type { BodyFrame, Stance } from '../body-frame.ts';
import { bodyColors } from '../body-parts.ts';
import type { BodyColors } from '../body-parts.ts';
import type { MeshBuilder } from '../mesh.ts';
import { ringLoft } from '../primitives.ts';
import type { Ring } from '../primitives.ts';
import type { SpeciesParams } from '../species.ts';
import type { Vec3 } from '../tuples.ts';
import { addFoxHead } from './fox-head.ts';
import { addFoxArms, addFoxLegs } from './fox-limbs.ts';
import { limbTube } from '../limb-tube.ts';
import { addPainted, jitter } from '../painted.ts';
import { torsoBoneHeights } from '../trunk.ts';

/**
 * One ring of the torso, in H: the height above the base of the torso, the half width, and the
 * depth of the front and of the back.
 */
type TorsoRow = readonly [y: number, halfWidth: number, front: number, back: number];

/**
 * The rings of the torso of the fox from the seat to the neck (`fox-views.png`): full hips, a
 * long slim waist and chest, and sloping shoulders. A ring at the height of the chest bone ends
 * the lower part and starts the upper part.
 */
const TORSO_ROWS: readonly TorsoRow[] = [
  [0, 0.38, 0.32, 0.28],
  [0.14, 0.58, 0.47, 0.4],
  [0.39, 0.62, 0.55, 0.42],
  [0.67, 0.56, 0.57, 0.37],
  [0.93, 0.5, 0.58, 0.35],
  [1.21, 0.5, 0.52, 0.35],
  [1.42, 0.47, 0.43, 0.35],
  [1.6, 0.45, 0.4, 0.34],
  [1.76, 0.43, 0.36, 0.33],
  [1.9, 0.47, 0.3, 0.3],
  [2.02, 0.4, 0.22, 0.24],
];

/** The number of corners of each ring of the torso. */
const TORSO_SEGMENTS = 14;

/** The scale of the inner ring of each torso part past the split of the torso. */
const TORSO_INSET = 0.97;

/** The largest radial offset of a corner of the torso, as a part of its radius. */
const TORSO_JITTER = 0.04;

/**
 * The half width of the white bib down the front of the torso, in H, at heights above the base:
 * wide on the chest and a point low on the belly, as in `fox-views.png`.
 */
const BIB: readonly (readonly [y: number, halfWidth: number])[] = [
  [0.22, 0],
  [0.6, 0.2],
  [0.95, 0.29],
  [1.4, 0.31],
  [2.4, 0.3],
];

/** The place of the head center in front of the axis of the torso, in H. */
const HEAD_FORWARD = 0.33;

/**
 * The tail of the fox, in H: a large brush with a white tip (`fox-views.png`). Seated, it curls
 * around the right hip on the seat, in front of the back post of the chair, and hangs over the
 * right side of the seat.
 */
const TAIL = {
  /** The base at the back of the hips: the height above the base of the torso and the depth. */
  base: [0, 0.3, 0.25],
  /** The first part, on `tail1`: its length, and its direction seated and standing. */
  first: { length: 0.45, seated: [1, -0.05, 0.05], standing: [0.15, -0.6, 1] },
  /** The brush, on `tail2`: its length, and its direction seated and standing. */
  second: { length: 0.85, seated: [1, -0.25, -0.05], standing: [0.35, -0.9, 0.3] },
  /** The radii at the base, at the joint, and at the fullest place of the brush. */
  radii: [0.14, 0.26, 0.4] as const,
  /** The place along the brush where the white tip starts, from 0 at the joint to 1 at the tip. */
  white: 0.62,
} as const;

/**
 * Gives the forward lean of the torso at a height: none up to the waist, then up to 0.08 H at the
 * neck, so that the chest and the head come forward, as in the side view of `fox-views.png`.
 *
 * @param y The height above the base of the torso, in H.
 * @returns The distance of the middle of the torso in front of its axis, in H.
 */
function lean(y: number): number {
  return 0.08 * Math.max(0, Math.min(1, (y - 0.9) / 1.0)) ** 1.5;
}

/**
 * Gives the half width of the bib at a height.
 *
 * @param y The height above the base of the torso, in H.
 * @returns The half width, in H.
 */
function bibHalfWidth(y: number): number {
  for (let i = 0; i + 1 < BIB.length; i++) {
    const [y0, w0] = BIB[i] ?? [0, 0];
    const [y1, w1] = BIB[i + 1] ?? [0, 0];
    if (y >= y0 && y <= y1) {
      return w0 + ((w1 - w0) * (y - y0)) / (y1 - y0);
    }
  }
  return 0;
}

/**
 * Builds the body of the fox in its bind pose, and adds its parts to a mesh (design 4.3, 4.4):
 * the head of `fox-views.png` with its large eyes and ears, a slim torso with a white bib, slim
 * arms with dark gloves, full thighs and slim shins with dark socks, and a large tail with a
 * white tip. The animal faces -z, its left side is -x, and the floor is at y = 0. The arms hang
 * down beside the body. Each part follows one bone.
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters: the red fox or the tan fox.
 * @param stance The seat under the body, or no seat.
 * @returns The bind positions of the body bones.
 */
export function buildFoxBody(
  builder: MeshBuilder,
  species: SpeciesParams,
  stance: Stance,
): BodyBones {
  const frame = bodyFrame(species, stance);
  const colors = bodyColors(species);
  const { h, at, proportions } = frame;

  const bones = torsoBoneHeights(proportions);
  addTorso(builder, colors, frame, bones.chest);
  const headCenter = at(0, proportions.headCenter, -HEAD_FORWARD);
  const neckBase = at(0, 1.6, -lean(1.6));
  addPainted(
    builder,
    limbTube(
      neckBase,
      at(0, proportions.headCenter - 0.2, -HEAD_FORWARD),
      [
        [0, 0.3 * h, 0.3 * h, 0.28 * h],
        [0.5, 0.29 * h, 0.3 * h, 0.27 * h],
        [1, 0.27 * h, 0.27 * h, 0.25 * h],
      ],
      [0, 0, -1],
      70,
    ),
    'neck',
    (centroid) => (centroid[2] < neckBase[2] - 0.1 * h ? colors.belly : colors.fur),
  );
  const head = addFoxHead(builder, colors, h, headCenter);
  const [tail1, tail2] = addTail(builder, colors, frame);
  const arms = addFoxArms(builder, colors, frame);
  const legs = addFoxLegs(builder, colors, frame);

  return {
    headHeight: h,
    headCenter,
    mouth: head.mouth,
    floor: [0, 0, -frame.forward],
    palmL: arms.palmL,
    palmR: arms.palmR,
    fingerBlockL: arms.fingerBlockL,
    fingerBlockR: arms.fingerBlockR,
    positions: {
      root: [0, 0, 0],
      hips: at(0, bones.hips, 0),
      spine: at(0, bones.spine, -lean(bones.spine)),
      chest: at(0, bones.chest, -lean(bones.chest)),
      neck: neckBase,
      head: at(0, proportions.headCenter - 0.5, -HEAD_FORWARD),
      jaw: head.jaw,
      eyeL: head.eyeL,
      eyeR: head.eyeR,
      earL: head.earL,
      earR: head.earR,
      tail1,
      tail2,
      trunk1: head.mouth,
      trunk2: head.mouth,
      trunk3: head.mouth,
      ...arms.positions,
      ...legs,
    },
  };
}

/**
 * Adds the torso: the part below the chest bone follows `spine`, and the part above it follows
 * `chest`, as the shoulders and the arms do (design 4.7). The front has the white bib.
 *
 * @param builder The mesh that gets the parts.
 * @param colors The colors of the species.
 * @param frame The frame of the body.
 * @param chest The height of the chest bone above the base of the torso, in H: the split of the
 *   torso.
 */
function addTorso(builder: MeshBuilder, colors: BodyColors, frame: BodyFrame, chest: number): void {
  const { h, at } = frame;
  const ring = ([y, halfWidth, front, back]: TorsoRow, j: number, inset = 1): Ring => {
    const turn = j % 2 === 0 ? 0 : 0.5;
    return Array.from({ length: TORSO_SEGMENTS }, (_, i) => {
      const angle = ((i + turn) / TORSO_SEGMENTS) * 2 * Math.PI;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const key = Math.round(Math.abs(cos) * 1000) * 3 + Math.round(sin * 1000);
      const scale = (1 + TORSO_JITTER * jitter(j + 100, key)) * inset;
      // +sin is the front (-z). The upper torso leans forward.
      return at(cos * halfWidth * scale, y, -lean(y) - sin * (sin >= 0 ? front : back) * scale);
    });
  };
  // The ring at the chest bone is the mean of its two neighbors at that height.
  const split = TORSO_ROWS.findIndex(([y]) => y > chest);
  const [below, above] = [TORSO_ROWS[split - 1], TORSO_ROWS[split]];
  const top = TORSO_ROWS.at(-1);
  if (!below || !above || !top) {
    throw new Error(`The chest bone at ${chest} H is not inside the torso.`);
  }
  const k = (chest - below[0]) / (above[0] - below[0]);
  const middle = below.map((v, i) => v + ((above[i] ?? v) - v) * k);
  const rows: TorsoRow[] = [
    ...TORSO_ROWS.slice(0, split),
    [chest, middle[1] ?? 0, middle[2] ?? 0, middle[3] ?? 0],
    ...TORSO_ROWS.slice(split),
  ];
  const rings = rows.map((row, j) => ring(row, j));
  const paint = (centroid: Vec3) => {
    const y = (centroid[1] - at(0, 0, 0)[1]) / h;
    const x = centroid[0] / h;
    const z = (centroid[2] - at(0, 0, 0)[2]) / h + lean(y);
    return z < -0.15 && Math.abs(x) < bibHalfWidth(y) ? colors.belly : colors.fur;
  };
  // Each part reaches a ring past the split, inside the other part, so that a turn of the chest
  // shows no gap at the split.
  addPainted(
    builder,
    ringLoft([
      ...rings.slice(0, split + 1),
      ring(above, split + 1, TORSO_INSET),
      [at(0, above[0], -lean(above[0]))],
    ]),
    'spine',
    paint,
  );
  addPainted(
    builder,
    ringLoft([
      [at(0, below[0], -lean(below[0]))],
      ring(below, split - 1, TORSO_INSET),
      ...rings.slice(split),
      [at(0, top[0] + 0.06, -lean(top[0]))],
    ]),
    'chest',
    paint,
  );
}

/**
 * Adds the tail: the first part on `tail1` and the brush with the white tip on `tail2`.
 *
 * @param builder The mesh that gets the parts.
 * @param colors The colors of the species.
 * @param frame The frame of the body.
 * @returns The bind positions of the `tail1` and the `tail2` bone.
 */
function addTail(builder: MeshBuilder, colors: BodyColors, frame: BodyFrame): [Vec3, Vec3] {
  const { h, at, standing } = frame;
  const base = at(...TAIL.base);
  const firstDirection = new Vector3(
    ...(standing ? TAIL.first.standing : TAIL.first.seated),
  ).normalize();
  const secondDirection = new Vector3(
    ...(standing ? TAIL.second.standing : TAIL.second.seated),
  ).normalize();
  const joint = new Vector3(...base).addScaledVector(firstDirection, TAIL.first.length * h);
  const tip = joint.clone().addScaledVector(secondDirection, TAIL.second.length * h);
  const jointPoint: Vec3 = [joint.x, joint.y, joint.z];
  const [baseRadius, jointRadius, fullRadius] = TAIL.radii;

  addPainted(
    builder,
    limbTube(
      base,
      jointPoint,
      [
        [-0.1, baseRadius * h, baseRadius * h, baseRadius * h],
        [
          0.5,
          ((baseRadius + jointRadius) / 2) * h,
          ((baseRadius + jointRadius) / 2) * h,
          ((baseRadius + jointRadius) / 2) * h,
        ],
        [1.1, jointRadius * h, jointRadius * h, jointRadius * h],
        [1.25, 0, 0, 0],
      ],
      [0, 1, 0],
      80,
    ),
    'tail1',
    () => colors.fur,
  );
  const tipPoint: Vec3 = [tip.x, tip.y, tip.z];
  const span = tip.clone().sub(joint);
  addPainted(
    builder,
    limbTube(
      jointPoint,
      tipPoint,
      [
        [-0.08, 0, 0, 0],
        [0, jointRadius * h, jointRadius * h, jointRadius * h],
        [0.25, 0.3 * h, 0.3 * h, 0.3 * h],
        [0.55, fullRadius * h, fullRadius * 0.95 * h, fullRadius * h],
        [0.78, fullRadius * 0.7 * h, fullRadius * 0.65 * h, fullRadius * 0.7 * h],
        [0.93, fullRadius * 0.35 * h, fullRadius * 0.35 * h, fullRadius * 0.35 * h],
        [1, 0, 0, 0],
      ],
      [0, 1, 0],
      90,
    ),
    'tail2',
    (centroid) =>
      new Vector3(...centroid).sub(joint).dot(span) / span.lengthSq() > TAIL.white
        ? colors.belly
        : colors.fur,
  );
  return [base, jointPoint];
}
