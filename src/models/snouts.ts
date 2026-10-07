import { Vector3 } from 'three';
import {
  LIMB_SEGMENTS,
  LIMB_BULGE,
  alongAxis,
  partColor,
  placeCorners,
  unknownValue,
} from './body-parts.ts';
import type { BodyColors } from './body-parts.ts';
import { toVec3 } from './tuples.ts';
import type { Vec3 } from './tuples.ts';
import { splitByFacing, srgb, transform } from './mesh.ts';
import type { Finish, MeshBuilder, Rgb } from './mesh.ts';
import { ball, box, cylinder, icosphere, lathe } from './primitives.ts';
import { sweep } from './sweep.ts';
import type { SweepRing } from './sweep.ts';
import { boneIndex } from './rig.ts';
import type { BoneName } from './rig.ts';
import { TEETH_COLOR } from './species.ts';
import type { SpeciesParams } from './species.ts';

/** The bind positions of the bones that the snout places. */
export interface SnoutBones {
  /** The hinge of the lower jaw or of the lower beak (design 4.7). */
  readonly jaw: Vec3;
  /** The joints of the trunk. Each species has them, and only the elephant has a trunk. */
  readonly trunk: readonly [Vec3, Vec3, Vec3];
  /**
   * The middle of the mouth, at the front of the snout or between the two halves of the beak. A
   * wind instrument touches this point (design 4.6).
   */
  readonly mouth: Vec3;
}

/**
 * The mouth of each snout type, from the head center in head heights `H`. The mouth is under
 * the front of the muzzle, under the root of the trunk, or between the halves of the beak. A
 * long or a pointed muzzle reaches past the mouth, so that a wind instrument keeps the place
 * where the arms reach its grips (design 5.3).
 */
const MOUTHS = {
  short: [0, -0.38, -0.62],
  long: [0, -0.43, -0.78],
  blunt: [0, -0.42, -0.74],
  broad: [0, -0.48, -0.7],
  pointed: [0, -0.36, -0.62],
  'buck-teeth': [0, -0.4, -0.6],
  trunk: [0, -0.44, -0.5],
  'flat-nose': [0, -0.42, -0.58],
  horn: [0, -0.42, -0.66],
  beak: [0, -0.17, -0.76],
  roman: [0, -0.4, -0.76],
} as const satisfies Readonly<Record<SpeciesParams['snout'], Vec3>>;

/**
 * The three segments of the trunk (design 4.5: 1.4 H on 3 bones): the direction, the length in
 * H, and the radius at the start in H. The trunk starts low on the face, hangs down in front of
 * the chest, and its tip curls up.
 */
const TRUNK_SEGMENTS: readonly (readonly [direction: Vec3, length: number, radius: number])[] = [
  [[0, -1, -0.35], 0.5, 0.2],
  [[0, -1, -0.6], 0.5, 0.15],
  [[0, 1, -0.25], 0.4, 0.11],
];

/**
 * The two cheeks of the short muzzle (design 4.5): the distance of each cheek center from the
 * middle, and the half sizes on x, y, and z, in H. The width and the height are 1.15 times the
 * first cheeks (0.09 and 0.13 × 0.11 × 0.12).
 */
const SHORT_CHEEK = { spread: 0.1035, size: [0.1495, 0.1265, 0.12] } as const;

/** The cosine above which a face of the long muzzle points up, so that it gets the fur color. */
const MUZZLE_TOP_FACING = 0.35;

/** The direction of the horn: up, and a little to the front. */
export const RHINO_HORN_AXIS: Vec3 = [0, 1, -0.3];

/** The radius of the trunk at its tip, in H. */
const TRUNK_TIP_RADIUS = 0.08;

/**
 * The radius of the curl of the trunk around its last joint, in H: larger than the radius of the
 * trunk there (0.11 H), so that the inner side of the curl does not fold.
 */
const TRUNK_CURL = 0.13;

/** The number of steps of the curl of the trunk. */
const TRUNK_CURL_STEPS = 4;

/**
 * Adds the trunk of the elephant: one swept tube of {@link LIMB_SEGMENTS} sides through its three
 * segments (design 4.5). The path turns a little at the second joint and curls round at the third
 * joint, so the trunk has no ball at a bend. Each ring follows the bone of its segment, and no
 * pose turns the trunk (design 4.7). The first trunk had a tube for each segment and a faceted
 * ball at each bend.
 *
 * @param builder The mesh that gets the parts.
 * @param colors The colors of the species.
 * @param h The head height `H`, in meters.
 * @param joints The joints of the trunk: its root and the start of the second and third segments.
 */
function addTrunk(
  builder: MeshBuilder,
  colors: BodyColors,
  h: number,
  joints: readonly [Vec3, Vec3, Vec3],
): void {
  const [first, second, third] = TRUNK_SEGMENTS;
  if (!first || !second || !third) {
    return;
  }
  const [root, bend, curl] = joints.map((joint) => new Vector3(...joint));
  if (!root || !bend || !curl) {
    return;
  }

  // The path of each segment, and the radius at each end of it.
  const along = TRUNK_SEGMENTS.map(([direction]) => new Vector3(...direction).normalize());
  const [d1, d2, d3] = along;
  if (!d1 || !d2 || !d3) {
    return;
  }
  const tip = curl.clone().addScaledVector(d3, third[1] * h);
  const r1 = first[2] * h;
  const r2 = second[2] * h;
  const r3 = third[2] * h;
  const rings: { readonly ring: SweepRing; readonly bone: BoneName }[] = [];
  let turn = 0;
  const add = (at: Vector3, axis: Vector3, radius: number, bone: BoneName): void => {
    rings.push({ ring: { at: toVec3(at), axis: toVec3(axis), radius, turn }, bone });
    turn = 0.5 - turn;
  };

  // The first segment, with a ring in its middle, and the second joint, where the path turns by
  // 13°.
  add(root, d1, r1, 'trunk1');
  add(root.clone().lerp(bend, 0.5), d1, 0.5 * (r1 + r2) * LIMB_BULGE, 'trunk1');
  add(bend, d1.clone().add(d2), r2, 'trunk2');

  // The curl: an arc of the radius TRUNK_CURL that joins the second and the third segment.
  const angle = d2.angleTo(d3);
  const reach = TRUNK_CURL * h * Math.tan(angle / 2);
  const start = curl.clone().addScaledVector(d2, -reach);
  const inward = d3.clone().addScaledVector(d2, -d3.dot(d2)).normalize();
  const center = start.clone().addScaledVector(inward, TRUNK_CURL * h);
  const axis = new Vector3().crossVectors(d2, d3).normalize();
  add(bend.clone().lerp(start, 0.5), d2, 0.5 * (r2 + r3) * LIMB_BULGE, 'trunk2');
  for (let k = 0; k <= TRUNK_CURL_STEPS; k++) {
    const turnBy = (angle * k) / TRUNK_CURL_STEPS;
    const at = start.clone().sub(center).applyAxisAngle(axis, turnBy).add(center);
    const tangent = d2.clone().applyAxisAngle(axis, turnBy);
    add(at, tangent, r3, 2 * k < TRUNK_CURL_STEPS ? 'trunk2' : 'trunk3');
  }

  // The last segment to the tip, where the trunk ends in a flat nose.
  const end = curl.clone().addScaledVector(d3, reach);
  add(end.clone().lerp(tip, 0.5), d3, 0.5 * (r3 + TRUNK_TIP_RADIUS * h), 'trunk3');
  add(tip, d3, TRUNK_TIP_RADIUS * h, 'trunk3');

  // Each bone gets its run of rings. A run ends in the first ring of the next run, and the
  // shared ring stays open, so the trunk is one closed tube.
  const options = { sides: LIMB_SEGMENTS, side: [1, 0, 0] } as const;
  let from = 0;
  for (let i = 1; i <= rings.length; i++) {
    const bone = rings[from]?.bone ?? 'trunk1';
    if (i < rings.length && rings[i]?.bone === bone) {
      continue;
    }
    const last = Math.min(i, rings.length - 1);
    const part = rings.slice(from, last + 1).map(({ ring }) => ring);
    const startEnd = from === 0 ? 'cap' : 'open';
    const endEnd = i >= rings.length ? 'cap' : 'open';
    builder.add(sweep(part, { ...options, start: startEnd, end: endEnd }), {
      color: colors.fur,
      bone: boneIndex(bone),
      finish: 'fur',
    });
    from = i;
  }
}

/**
 * Calculates the joints of the trunk: its root and the start of the second and third segments.
 *
 * @param h The head height `H`.
 * @param headCenter The center of the head.
 * @returns The joints, and the tip of the trunk.
 */
function trunkJoints(h: number, headCenter: Vec3): Vec3[] {
  const joints: Vec3[] = [
    toVec3(new Vector3(...headCenter).add(new Vector3(0, -0.3 * h, -0.5 * h))),
  ];
  for (const [direction, length] of TRUNK_SEGMENTS) {
    const last = joints.at(-1) ?? headCenter;
    joints.push(
      toVec3(
        new Vector3(...last).addScaledVector(new Vector3(...direction).normalize(), length * h),
      ),
    );
  }
  return joints;
}

/**
 * Adds a nose: a ball 1.3 times as wide as it is tall.
 *
 * @param builder The mesh that gets the part.
 * @param colors The colors of the species.
 * @param h The head height `H`.
 * @param at The center of the nose.
 * @param radius The half height of the nose, in H.
 */
function addNose(
  builder: MeshBuilder,
  colors: BodyColors,
  h: number,
  at: Vec3,
  radius = 0.05,
): void {
  builder.add(ball(1, 8, 4), {
    color: colors.nose,
    bone: boneIndex('head'),
    at: transform(at, undefined, [1.3 * radius * h, radius * h, radius * h]),
  });
}

/** The number of faces around the axis of a muzzle. */
const MUZZLE_SEGMENTS = 10;

/** The tusks of the elephant: the root, the direction, and the length, in H (design 4.5). */
const TUSK = { root: [0.17, -0.42, -0.46], direction: [0.2, -0.35, -1], length: 0.34 } as const;

/**
 * Adds a cone that points out of the face, such as a long muzzle, a horn, or a beak.
 *
 * @param builder The mesh that gets the part.
 * @param from The base of the cone.
 * @param axis The direction of the cone.
 * @param profile The radii and the heights along the axis.
 * @param flat The scale of the cone across the axis, up and down.
 * @param color The color.
 * @param bone The bone that the part follows.
 * @param finish `fur` for a muzzle, and `matte` for a tusk, a horn, or a beak (design 4.5).
 */
function addCone(
  builder: MeshBuilder,
  from: Vec3,
  axis: Vec3,
  profile: readonly (readonly [number, number])[],
  flat: number,
  color: Rgb,
  bone: 'head' | 'jaw',
  finish: Finish,
): void {
  builder.add(lathe(profile, LIMB_SEGMENTS), {
    color,
    bone: boneIndex(bone),
    at: transform(from, alongAxis(axis, [1, 0, 0]), [1, 1, flat]),
    finish,
  });
}

/**
 * Adds the snout and the nose of a species to the head (design 4.3, 4.5). The muzzle has the
 * belly color, unless the accent parts include the snout.
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters.
 * @param colors The colors of the species.
 * @param h The head height `H`, in meters.
 * @param headCenter The center of the head.
 * @returns The bind positions of the jaw and of the trunk, and the mouth.
 */
export function addSnout(
  builder: MeshBuilder,
  species: SpeciesParams,
  colors: BodyColors,
  h: number,
  headCenter: Vec3,
): SnoutBones {
  const head = boneIndex('head');
  const muzzle = partColor(species, colors, 'snout', colors.belly);
  const at = (x: number, y: number, z: number): Vec3 =>
    toVec3(new Vector3(...headCenter).addScaledVector(new Vector3(x, y, z), h));
  const [root = headCenter, second = headCenter, third = headCenter] = trunkJoints(h, headCenter);
  const [mx, my, mz] = MOUTHS[species.snout];
  const bones: SnoutBones = {
    jaw: at(0, -0.2, -0.3),
    trunk: [root, second, third],
    mouth: at(mx, my, mz),
  };
  switch (species.snout) {
    case 'short': {
      // Two full round cheeks low on the face, and the nose above them, as the muzzles of the
      // polished images. They are 1.15 times the first cheeks, so that the muzzle pad reads as
      // one soft form.
      for (const side of [-1, 1]) {
        builder.add(ball(1, 8, 4), {
          color: muzzle,
          bone: head,
          at: transform(at(side * SHORT_CHEEK.spread, -0.31, -0.55), undefined, [
            SHORT_CHEEK.size[0] * h,
            SHORT_CHEEK.size[1] * h,
            SHORT_CHEEK.size[2] * h,
          ]),
          finish: 'fur',
        });
      }
      addNose(builder, colors, h, at(0, -0.21, -0.66), 0.055);
      return bones;
    }
    case 'buck-teeth': {
      // A wide muzzle of 0.25 H with the nose, and two front teeth below it.
      builder.add(ball(1, 8, 4), {
        color: muzzle,
        bone: head,
        at: transform(at(0, -0.3, -0.6), undefined, [0.21 * h, 0.13 * h, 0.12 * h]),
        finish: 'fur',
      });
      addNose(builder, colors, h, at(0, -0.24, -0.69));
      for (const side of [-1, 1]) {
        builder.add(box(0.1 * h, 0.2 * h, 0.04 * h), {
          color: srgb(TEETH_COLOR),
          bone: head,
          at: transform(at(side * 0.055, -0.46, -0.64)),
        });
      }
      return bones;
    }
    case 'long': {
      // A full muzzle that reaches 0.25 H in front of the face, with the nose on its tip, as the
      // muzzles of the fox and the wolf in the polished images. It starts high and wide, so
      // that its top continues the forehead. Its top has the fur color, and its sides and its
      // underside have the color of the muzzle.
      const axis = new Vector3(0, -0.35, -1).normalize();
      const from = at(0, -0.12, -0.36);
      const length = 0.5;
      const cone = placeCorners(
        lathe(
          [
            [0.36 * h, 0],
            [0.32 * h, 0.2 * h],
            [0.24 * h, 0.38 * h],
            [0.13 * h, length * h],
          ],
          MUZZLE_SEGMENTS,
        ),
        transform(from, alongAxis(toVec3(axis), [1, 0, 0]), [1, 1, 0.72]),
      );
      const [top, sides] = splitByFacing(cone, [0, 1, 0], MUZZLE_TOP_FACING);
      builder.add(top, { color: colors.fur, bone: head, finish: 'fur' });
      builder.add(sides, { color: muzzle, bone: head, finish: 'fur' });
      const nose = new Vector3(...from).addScaledVector(axis, (length - 0.03) * h);
      addNose(builder, colors, h, toVec3(nose), 0.075);
      return bones;
    }
    case 'blunt': {
      // A short round muzzle of 0.3 H in front of the face, with a large nose on the top of its
      // tip, as the beagles of the polished images.
      const axis = new Vector3(0, -0.2, -1).normalize();
      const from = at(0, -0.17, -0.41);
      const length = 0.5;
      addCone(
        builder,
        from,
        toVec3(axis),
        [
          [0.3 * h, 0],
          [0.3 * h, 0.24 * h],
          [0.27 * h, 0.38 * h],
          [0.17 * h, 0.47 * h],
          [0, length * h],
        ],
        0.82,
        muzzle,
        'head',
        'fur',
      );
      const nose = new Vector3(...from)
        .addScaledVector(axis, (length - 0.06) * h)
        .add(new Vector3(0, 0.12 * h, 0));
      addNose(builder, colors, h, toVec3(nose), 0.085);
      return bones;
    }
    case 'broad': {
      // A large round muzzle, wider than it is tall, with two nostrils on its top front, as the
      // hippos of the polished images.
      builder.add(ball(1, MUZZLE_SEGMENTS, 5), {
        color: muzzle,
        bone: head,
        at: transform(at(0, -0.28, -0.48), undefined, [0.44 * h, 0.3 * h, 0.34 * h]),
        finish: 'fur',
      });
      for (const side of [-1, 1]) {
        builder.add(ball(1, 8, 4), {
          color: colors.nose,
          bone: head,
          at: transform(at(side * 0.13, -0.16, -0.76), undefined, [0.06 * h, 0.035 * h, 0.04 * h]),
        });
      }
      return bones;
    }
    case 'pointed': {
      // A thin cone that reaches 0.2 H in front of the face, with a small nose at its tip.
      const axis = new Vector3(0, -0.3, -1).normalize();
      const from = at(0, -0.16, -0.36);
      const length = 0.45;
      addCone(
        builder,
        from,
        toVec3(axis),
        [
          [0.17 * h, 0],
          [0.11 * h, 0.2 * h],
          [0.04 * h, length * h],
        ],
        0.85,
        muzzle,
        'head',
        'fur',
      );
      const nose = new Vector3(...from).addScaledVector(axis, length * h);
      addNose(builder, colors, h, toVec3(nose), 0.045);
      return bones;
    }
    case 'trunk': {
      // Two tusks beside the root of the trunk, as the elephant of the polished images.
      for (const side of [-1, 1]) {
        addCone(
          builder,
          at(side * TUSK.root[0], TUSK.root[1], TUSK.root[2]),
          [side * TUSK.direction[0], TUSK.direction[1], TUSK.direction[2]],
          [
            [0.05 * h, 0],
            [0.036 * h, 0.2 * h],
            [0, TUSK.length * h],
          ],
          1,
          srgb(TEETH_COLOR),
          'head',
          'matte',
        );
      }
      // One swept tube of three segments, 1.4 H in all, with a round curl at the tip. The tip of
      // the trunk is its nose, so the trunk has no nose ball.
      addTrunk(builder, colors, h, [root, second, third]);
      return bones;
    }
    case 'flat-nose': {
      // A flat oval disc, 0.4 H wide and 0.3 H tall, in front of the face, with two nostrils.
      const front = -0.8;
      builder.add(cylinder(0.2 * h, 0.2 * h, 0.2 * h, 8), {
        color: muzzle,
        bone: head,
        at: transform(at(0, -0.2, front + 0.2), alongAxis([0, 0, -1], [1, 0, 0]), [1, 1, 0.75]),
      });
      for (const side of [-1, 1]) {
        builder.add(icosphere(0.035 * h, 0), {
          color: colors.nose,
          bone: head,
          at: transform(at(side * 0.08, -0.2, front)),
        });
      }
      return bones;
    }
    case 'horn': {
      // A large muzzle with the nose, and a horn of 0.4 H on it.
      builder.add(icosphere(1, 0), {
        color: muzzle,
        bone: head,
        at: transform(at(0, -0.24, -0.52), undefined, [0.24 * h, 0.2 * h, 0.3 * h]),
        finish: 'fur',
      });
      addNose(builder, colors, h, at(0, -0.28, -0.8));
      addCone(
        builder,
        at(0, -0.08, -0.68),
        RHINO_HORN_AXIS,
        [
          [0.13 * h, 0],
          [0.07 * h, 0.2 * h],
          [0, 0.4 * h],
        ],
        1,
        partColor(species, colors, 'horn'),
        'head',
        'matte',
      );
      return bones;
    }
    case 'beak': {
      // An upper beak that reaches 0.2 H in front of the face, and a lower beak on the jaw, so
      // that the choir can open it (design 4.7).
      const color = partColor(species, colors, 'beak');
      addCone(
        builder,
        at(0, -0.06, -0.42),
        [0, -0.15, -1],
        [
          [0.12 * h, 0],
          [0, 0.4 * h],
        ],
        0.6,
        color,
        'head',
        'matte',
      );
      const jaw = at(0, -0.14, -0.4);
      addCone(
        builder,
        jaw,
        [0, -0.3, -1],
        [
          [0.07 * h, 0],
          [0, 0.32 * h],
        ],
        0.5,
        color,
        'jaw',
        'matte',
      );
      return { ...bones, jaw };
    }
    case 'roman': {
      // A long straight muzzle of 0.27 H in front of the face, with a blunt tip and a large nose
      // on the top of the tip, as the muzzle of a polar bear. It starts high on the face, so
      // that its top continues the forehead in one line. It is narrower than it is tall. Its top
      // has the fur color, and its sides and its underside have the color of the muzzle.
      const axis = new Vector3(0, -0.28, -1).normalize();
      const from = at(0, -0.1, -0.38);
      const length = 0.52;
      const cone = placeCorners(
        lathe(
          [
            [0.3 * h, 0],
            [0.27 * h, 0.22 * h],
            [0.22 * h, 0.4 * h],
            [0.15 * h, 0.49 * h],
            [0, length * h],
          ],
          MUZZLE_SEGMENTS,
        ),
        transform(from, alongAxis(toVec3(axis), [1, 0, 0]), [0.78, 1, 0.82]),
      );
      const [top, sides] = splitByFacing(cone, [0, 1, 0], MUZZLE_TOP_FACING);
      builder.add(top, { color: colors.fur, bone: head, finish: 'fur' });
      builder.add(sides, { color: muzzle, bone: head, finish: 'fur' });
      const nose = new Vector3(...from)
        .addScaledVector(axis, (length - 0.07) * h)
        .add(new Vector3(0, 0.1 * h, 0));
      addNose(builder, colors, h, toVec3(nose), 0.08);
      return bones;
    }
    default:
      throw unknownValue('snout type', species.snout);
  }
}
