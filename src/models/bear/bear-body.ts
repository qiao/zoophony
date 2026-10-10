import type { BodyBones } from '../biped.ts';
import { bodyFrame } from '../body-frame.ts';
import type { BodyFrame, Stance } from '../body-frame.ts';
import { limbTube } from '../limb-tube.ts';
import type { MeshBuilder } from '../mesh.ts';
import { addPainted, jitter } from '../painted.ts';
import { ringLoft } from '../primitives.ts';
import type { Ring } from '../primitives.ts';
import type { SpeciesParams } from '../species.ts';
import { torsoBoneHeights } from '../trunk.ts';
import type { Vec3 } from '../tuples.ts';
import { addBearHead } from './bear-head.ts';
import { addBearArms, addBearLegs } from './bear-limbs.ts';
import { bearPalette } from './bear-palette.ts';
import type { BearPalette } from './bear-palette.ts';

/**
 * One ring of the torso, in H: the height above the base of the torso, the half width, and the
 * depth of the front and of the back.
 */
type TorsoRow = readonly [y: number, halfWidth: number, front: number, back: number];

/**
 * The rings of the torso of the bear from the crotch to the head (`bear-views.png`): a pear
 * that is widest at the belly and the hips, a round belly in front, a hump of the back at the
 * shoulders, and a thick neck as wide as the head.
 */
const TORSO_ROWS: readonly TorsoRow[] = [
  [0, 0.95, 0.56, 0.55],
  [0.14, 1.05, 0.64, 0.6],
  [0.4, 1.1, 0.72, 0.68],
  [0.7, 1.12, 0.8, 0.8],
  [1.05, 1.12, 0.9, 0.78],
  [1.35, 1.07, 0.95, 0.72],
  [1.7, 1, 0.92, 0.66],
  [2, 0.95, 0.84, 0.64],
  [2.3, 0.92, 0.74, 0.66],
  [2.6, 0.9, 0.64, 0.69],
  [2.88, 0.86, 0.57, 0.69],
  [3.15, 0.8, 0.53, 0.66],
  [3.4, 0.7, 0.44, 0.58],
];

/** The height of the top point of the torso above its base, in H, inside the head. */
const TORSO_TOP = 3.6;

/** The height of the bottom point of the torso above its base, in H, between the thighs. */
const TORSO_BOTTOM = -0.08;

/** The number of corners of each ring of the torso. */
const TORSO_SEGMENTS = 16;

/** The largest radial offset of a corner of the torso, as a part of its radius. */
const TORSO_JITTER = 0.05;

/**
 * The largest offset of a corner of the torso up or down, in H. It breaks the even rows of the
 * facets, as the cut facets of `bear-views.png`.
 */
const TORSO_RISE = 0.05;

/** The place of the head center in front of the axis of the torso, in H. */
const HEAD_FORWARD = 0.1;

/** The height of the `neck` bone above the base of the torso, in H. */
const NECK = 2.85;

/** The small round tail low on the back, in H (`bear-views.png`). */
const TAIL = {
  /** The middle: the height above the base of the torso, and the depth behind the axis. */
  middle: [0.76, 0.82] as const,
  /** The radius. */
  radius: 0.19,
} as const;

/**
 * Builds the body of the bear conductor in its bind pose, and adds its parts to a mesh (design
 * 4.3, 4.4): the small head of `bear-views.png` with its tan muzzle and round ears, a large
 * pear-shaped torso, thick arms with broad paws, short thick legs with large flat feet, dark
 * claws, and a small round tail. The animal faces -z, its left side is -x, and the floor is at
 * y = 0. The arms hang down beside the body. Each part follows one bone.
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters of the bear.
 * @param stance The stance of the body. The conductor stands.
 * @returns The bind positions of the body bones.
 */
export function buildBearBody(
  builder: MeshBuilder,
  species: SpeciesParams,
  stance: Stance,
): BodyBones {
  const frame = bodyFrame(species, stance);
  const palette = bearPalette(species);
  const { h, at, proportions } = frame;

  const bones = torsoBoneHeights(proportions);
  addTorso(builder, palette, frame);
  const headCenter = at(0, proportions.headCenter, -HEAD_FORWARD);
  // The neck fills the space between the torso and the head when the head turns or bows.
  addPainted(
    builder,
    limbTube(
      at(0, NECK - 0.2, 0),
      at(0, proportions.headCenter - 0.1, -HEAD_FORWARD),
      [
        [0, 0.62 * h, 0.5 * h, 0.55 * h],
        [0.5, 0.6 * h, 0.45 * h, 0.55 * h],
        [1, 0.5 * h, 0.35 * h, 0.45 * h],
      ],
      [0, 0, -1],
      170,
    ),
    'neck',
    () => palette.fur,
  );
  const head = addBearHead(builder, palette, h, headCenter);
  const tail = addTail(builder, palette, frame);
  const arms = addBearArms(builder, palette, frame);
  const legs = addBearLegs(builder, palette, frame);

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
      spine: at(0, bones.spine, 0),
      chest: at(0, bones.chest, 0),
      neck: at(0, NECK, 0),
      head: at(0, proportions.headCenter - 0.5, -HEAD_FORWARD),
      jaw: head.jaw,
      eyeL: head.eyeL,
      eyeR: head.eyeR,
      earL: head.earL,
      earR: head.earR,
      tail1: tail,
      tail2: tail,
      trunk1: head.mouth,
      trunk2: head.mouth,
      trunk3: head.mouth,
      ...arms.positions,
      ...legs,
    },
  };
}

/**
 * Adds the torso as one part on `spine`. Two parts with a split at the chest bone made a dark line
 * at the split: the baked occlusion counted the triangles of the other bone on one side of the
 * concave back as a fold, and the corners kept 0.4 of their light. The chest of the conductor
 * turns at most 15° against the spine, half of the turn to a cued section, and the round
 * shoulders cover the move of the arms.
 *
 * @param builder The mesh that gets the part.
 * @param palette The colors of the bear.
 * @param frame The frame of the body.
 */
function addTorso(builder: MeshBuilder, palette: BearPalette, frame: BodyFrame): void {
  const { at } = frame;
  const depth = frame.proportions.torsoDepth;
  const rings = TORSO_ROWS.map(([y, halfWidth, front, back], j): Ring => {
    const turn = j % 2 === 0 ? 0 : 0.5;
    return Array.from({ length: TORSO_SEGMENTS }, (_, i) => {
      const angle = ((i + turn) / TORSO_SEGMENTS) * 2 * Math.PI;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const key = Math.round(Math.abs(cos) * 1000) * 3 + Math.round(sin * 1000);
      const scale = 1 + TORSO_JITTER * jitter(j + 300, key);
      const rise = TORSO_RISE * jitter(j + 400, key);
      // +sin is the front (-z).
      return at(
        cos * halfWidth * scale,
        y + rise,
        -sin * (sin >= 0 ? front : back) * depth * scale,
      );
    });
  });
  addPainted(
    builder,
    ringLoft([[at(0, TORSO_BOTTOM, 0)], ...rings, [at(0, TORSO_TOP, 0)]]),
    'spine',
    () => palette.fur,
  );
}

/**
 * Adds the small round tail on `tail1`, low on the back.
 *
 * @param builder The mesh that gets the part.
 * @param palette The colors of the bear.
 * @param frame The frame of the body.
 * @returns The middle of the tail: the bind position of `tail1` and `tail2`.
 */
function addTail(builder: MeshBuilder, palette: BearPalette, frame: BodyFrame): Vec3 {
  const { h, at } = frame;
  const [y, back] = TAIL.middle;
  const middle = at(0, y, back);
  const r = TAIL.radius;
  addPainted(
    builder,
    limbTube(
      at(0, y, back - r),
      at(0, y, back + r),
      [
        [0, 0, 0, 0],
        [0.2, 0.75 * r * h, 0.75 * r * h, 0.75 * r * h],
        [0.55, r * h, r * h, r * h],
        [0.85, 0.75 * r * h, 0.7 * r * h, 0.75 * r * h],
        [1, 0, 0, 0],
      ],
      [0, 1, 0],
      180,
    ),
    'tail1',
    () => palette.fur,
  );
  return middle;
}
