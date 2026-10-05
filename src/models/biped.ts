import { DEG, add, euler, rotationBetween, sub, transform } from './math.ts';
import type { Vec3 } from './math.ts';
import { MeshBuilder, splitByFacing, srgb } from './mesh.ts';
import type { Rgb } from './mesh.ts';
import { box, cylinder, icosphere, lathe } from './primitives.ts';
import { boneIndex } from './rig.ts';
import type { BoneName } from './rig.ts';
import { EYE_COLOR, NOSE_COLOR, RABBIT_HEAD_HEIGHT } from './species.ts';
import type { AccentPart, SpeciesParams } from './species.ts';

/** The bones that the body places. The instrument generators place the other bones. */
export type BodyBoneName = Exclude<
  BoneName,
  'instrument' | 'bow' | 'malletL' | 'malletR' | 'baton' | 'slide'
>;

/** The bind positions of the body bones, and the points that the instruments need. */
export interface BodyBones {
  readonly positions: Readonly<Record<BodyBoneName, Vec3>>;
  /** The head height `H` of the species, in meters (design 4.5, body proportions). */
  readonly headHeight: number;
  /** The center of the head. */
  readonly headCenter: Vec3;
  /** The point in the middle of the palm of each hand. */
  readonly palmL: Vec3;
  readonly palmR: Vec3;
}

/** The facets of design 4.5: a head is an icosphere of detail 1, a limb has 6 sides. */
const HEAD_DETAIL = 1;
const LIMB_SEGMENTS = 6;
const TORSO_SEGMENTS = 8;

/** The cosine above which a face of the head or the torso faces the front, for the belly color. */
const FRONT_FACING = 0.55;

/** The colors of one species, in linear values. */
interface BodyColors {
  readonly fur: Rgb;
  readonly belly: Rgb;
  readonly accent: Rgb;
  readonly eye: Rgb;
  readonly nose: Rgb;
}

function bodyColors(species: SpeciesParams): BodyColors {
  return {
    fur: srgb(species.colors.fur),
    belly: srgb(species.colors.belly),
    accent: srgb(species.colors.accent),
    eye: srgb(EYE_COLOR),
    nose: srgb(species.accentParts.includes('nose') ? species.colors.accent : NOSE_COLOR),
  };
}

function partColor(species: SpeciesParams, colors: BodyColors, part: AccentPart): Rgb {
  return species.accentParts.includes(part) ? colors.accent : colors.fur;
}

/**
 * Adds a limb segment: a cylinder of 6 sides from one joint to the next.
 */
function addLimb(
  builder: MeshBuilder,
  from: Vec3,
  to: Vec3,
  radii: readonly [number, number],
  color: Rgb,
  bone: BoneName,
): void {
  const axis = sub(to, from);
  const length = Math.hypot(axis[0], axis[1], axis[2]);
  builder.add(cylinder(radii[0], radii[1], length, LIMB_SEGMENTS), {
    color,
    bone: boneIndex(bone),
    at: transform(from, rotationBetween([0, 1, 0], axis)),
  });
}

function addEars(
  builder: MeshBuilder,
  species: SpeciesParams,
  colors: BodyColors,
  h: number,
  headCenter: Vec3,
): [Vec3, Vec3] {
  switch (species.ears) {
    case 'long': {
      const outer = lathe(
        [
          [0.1 * h, 0],
          [0.15 * h, 0.35 * h],
          [0.13 * h, 0.8 * h],
          [0.05 * h, 1.05 * h],
          [0, 1.1 * h],
        ],
        LIMB_SEGMENTS,
      );
      const inner = lathe(
        [
          [0.05 * h, 0.12 * h],
          [0.09 * h, 0.4 * h],
          [0.07 * h, 0.8 * h],
          [0, 1.0 * h],
        ],
        LIMB_SEGMENTS,
      );
      const bases: [Vec3, Vec3] = [
        add(headCenter, [-0.17 * h, 0.4 * h, 0.03 * h]),
        add(headCenter, [0.17 * h, 0.4 * h, 0.03 * h]),
      ];
      for (const [i, side] of ([-1, 1] as const).entries()) {
        const base = bases[i] ?? headCenter;
        // Each ear leans out by 12° and back by 8°.
        const turn = euler(8 * DEG, 0, -side * 12 * DEG);
        const bone = boneIndex(side < 0 ? 'earL' : 'earR');
        builder.add(outer, {
          color: partColor(species, colors, 'ears'),
          bone,
          at: transform(base, turn, [1, 1, 0.45]),
        });
        builder.add(inner, {
          color: partColor(species, colors, 'inner-ears'),
          bone,
          at: transform(add(base, [0, 0, -0.045 * h]), turn, [1, 1, 0.3]),
        });
      }
      return bases;
    }
    default:
      throw new Error(`The ear type "${species.ears}" is not built yet (step 4).`);
  }
}

function addSnout(
  builder: MeshBuilder,
  species: SpeciesParams,
  colors: BodyColors,
  h: number,
  headCenter: Vec3,
): void {
  const head = boneIndex('head');
  switch (species.snout) {
    case 'short': {
      // A muzzle of 0.25 H in front of the face, in the belly color (design 4.3), and the nose.
      builder.add(icosphere(1, 0), {
        color: colors.belly,
        bone: head,
        at: transform(add(headCenter, [0, -0.17 * h, -0.36 * h]), undefined, [
          0.17 * h,
          0.13 * h,
          0.13 * h,
        ]),
      });
      builder.add(icosphere(0.05 * h, 0), {
        color: colors.nose,
        bone: head,
        at: transform(add(headCenter, [0, -0.1 * h, -0.48 * h])),
      });
      return;
    }
    default:
      throw new Error(`The snout type "${species.snout}" is not built yet (step 4).`);
  }
}

function addTail(
  builder: MeshBuilder,
  species: SpeciesParams,
  colors: BodyColors,
  h: number,
  base: Vec3,
): void {
  switch (species.tail) {
    case 'puff':
      // A ball of 0.2 H on one bone (design 4.5).
      builder.add(icosphere(0.12 * h, 0), {
        color: partColor(species, colors, 'tail'),
        bone: boneIndex('tail1'),
        at: transform(add(base, [0, 0, 0.06 * h])),
      });
      return;
    default:
      throw new Error(`The tail type "${species.tail}" is not built yet (step 4).`);
  }
}

/**
 * Builds the body of the parametric biped in its seated bind pose, and adds its parts to a mesh
 * (design 4.3, 4.5). The animal faces -z, its left side is -x, and the floor under the seat is at
 * y = 0. The arms hang down beside the body. Each part follows one bone (design 4.4).
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters.
 * @param seatHeight The height of the seat, in meters.
 * @returns The bind positions of the body bones.
 * @throws Error for a shape parameter that step 4 adds.
 */
export function buildBiped(
  builder: MeshBuilder,
  species: SpeciesParams,
  seatHeight: number,
): BodyBones {
  if (species.facePattern !== 'none') {
    throw new Error(`The face pattern "${species.facePattern}" is not built yet (step 4).`);
  }
  const h = RABBIT_HEAD_HEIGHT * species.size;
  const colors = bodyColors(species);
  const at = (x: number, y: number, z: number): Vec3 => [x * h, seatHeight + y * h, z * h];

  // The torso: a pear-shaped lathe, 1.3 H tall, 1.0 H wide at the hips and 0.75 H at the
  // shoulders. The faces at the front get the belly color.
  const torso = lathe(
    [
      [0, 0],
      [0.4 * h, 0.04 * h],
      [0.5 * h, 0.3 * h],
      [0.47 * h, 0.65 * h],
      [0.375 * h, 1.05 * h],
      [0.25 * h, 1.25 * h],
      [0, 1.3 * h],
    ],
    TORSO_SEGMENTS,
  );
  const [belly, back] = splitByFacing(torso, [0, 0, -1], FRONT_FACING);
  const torsoPlace = transform(at(0, 0, 0), undefined, [1, 1, 0.85]);
  builder.add(belly, { color: colors.belly, bone: boneIndex('spine'), at: torsoPlace });
  builder.add(back, { color: colors.fur, bone: boneIndex('spine'), at: torsoPlace });

  // The neck and the head. The head is 1.0 H tall and 0.9 H wide, and its top is 2.6 H above
  // the seat.
  addLimb(builder, at(0, 1.15, 0), at(0, 1.7, 0), [0.26 * h, 0.22 * h], colors.fur, 'neck');
  const headCenter = at(0, 2.1, 0);
  const [face, skull] = splitByFacing(icosphere(0.5, HEAD_DETAIL), [0, 0, -1], FRONT_FACING);
  const headPlace = transform(headCenter, undefined, [0.9 * h, h, 0.9 * h]);
  builder.add(face, { color: colors.belly, bone: boneIndex('head'), at: headPlace });
  builder.add(skull, { color: colors.fur, bone: boneIndex('head'), at: headPlace });

  // The eyes: two black spheres of 0.08 H, wide apart, on the surface of the head.
  const eyes: [Vec3, Vec3] = [
    add(headCenter, [-0.2 * h, 0.1 * h, -0.39 * h]),
    add(headCenter, [0.2 * h, 0.1 * h, -0.39 * h]),
  ];
  builder.add(icosphere(0.04 * h, 0), {
    color: colors.eye,
    bone: boneIndex('eyeL'),
    at: transform(eyes[0]),
  });
  builder.add(icosphere(0.04 * h, 0), {
    color: colors.eye,
    bone: boneIndex('eyeR'),
    at: transform(eyes[1]),
  });

  const [earL, earR] = addEars(builder, species, colors, h, headCenter);
  addSnout(builder, species, colors, h, headCenter);
  const tailBase = at(0, 0.3, 0.4);
  addTail(builder, species, colors, h, tailBase);

  // The arms hang down: upper arm 0.6 H, forearm 0.55 H, and a mitten hand of 0.25 H.
  const arms = ([-1, 1] as const).map((side) => {
    const shoulder = at(side * 0.4, 1.12, 0);
    const elbow = add(shoulder, [0, -0.6 * h, 0]);
    const wrist = add(elbow, [0, -0.55 * h, 0]);
    const knuckles = add(wrist, [0, -0.12 * h, 0]);
    const left = side < 0;
    addLimb(
      builder,
      shoulder,
      elbow,
      [0.13 * h, 0.11 * h],
      colors.fur,
      left ? 'upperArmL' : 'upperArmR',
    );
    addLimb(builder, elbow, wrist, [0.11 * h, 0.1 * h], colors.fur, left ? 'forearmL' : 'forearmR');
    const handColor = partColor(species, colors, 'hands');
    builder.add(box(0.2 * h, 0.13 * h, 0.13 * h), {
      color: handColor,
      bone: boneIndex(left ? 'handL' : 'handR'),
      at: transform(add(wrist, [0, -0.06 * h, 0])),
    });
    builder.add(box(0.18 * h, 0.13 * h, 0.12 * h), {
      color: handColor,
      bone: boneIndex(left ? 'fingersL' : 'fingersR'),
      at: transform(add(knuckles, [0, -0.06 * h, 0])),
    });
    return { clavicle: at(side * 0.12, 1.12, 0), shoulder, elbow, wrist, knuckles };
  });

  // The legs keep the seated pose: the thighs point forward and the shins hang down. The shin
  // reaches down to the ankle at 0.1 H, so that the bottom of the foot rests on the floor.
  const legs = ([-1, 1] as const).map((side) => {
    const hip = at(side * 0.22, 0.17, -0.05);
    const knee = add(hip, [0, 0, -0.6 * h]);
    const ankle: Vec3 = [knee[0], 0.1 * h, knee[2]];
    const left = side < 0;
    addLimb(builder, hip, knee, [0.17 * h, 0.14 * h], colors.fur, left ? 'thighL' : 'thighR');
    addLimb(builder, knee, ankle, [0.13 * h, 0.11 * h], colors.fur, left ? 'shinL' : 'shinR');
    builder.add(box(0.2 * h, 0.12 * h, 0.36 * h), {
      color: partColor(species, colors, 'feet'),
      bone: boneIndex(left ? 'footL' : 'footR'),
      at: transform(add(ankle, [0, -0.04 * h, -0.1 * h])),
    });
    return { hip, knee, ankle };
  });

  const [armL, armR] = arms;
  const [legL, legR] = legs;
  if (!armL || !armR || !legL || !legR) {
    throw new Error('The body has no arms or legs.');
  }
  const palm = (wrist: Vec3): Vec3 => add(wrist, [0, -0.08 * h, 0]);
  return {
    headHeight: h,
    headCenter,
    palmL: palm(armL.wrist),
    palmR: palm(armR.wrist),
    positions: {
      root: [0, 0, 0],
      hips: at(0, 0.15, 0),
      spine: at(0, 0.45, 0),
      chest: at(0, 0.85, 0),
      neck: at(0, 1.2, 0),
      head: at(0, 1.6, 0),
      jaw: add(headCenter, [0, -0.2 * h, -0.3 * h]),
      eyeL: eyes[0],
      eyeR: eyes[1],
      earL,
      earR,
      tail1: tailBase,
      tail2: add(tailBase, [0, 0, 0.1 * h]),
      trunk1: add(headCenter, [0, -0.15 * h, -0.45 * h]),
      trunk2: add(headCenter, [0, -0.6 * h, -0.5 * h]),
      trunk3: add(headCenter, [0, -1.0 * h, -0.5 * h]),
      shoulderL: armL.clavicle,
      upperArmL: armL.shoulder,
      forearmL: armL.elbow,
      handL: armL.wrist,
      fingersL: armL.knuckles,
      shoulderR: armR.clavicle,
      upperArmR: armR.shoulder,
      forearmR: armR.elbow,
      handR: armR.wrist,
      fingersR: armR.knuckles,
      thighL: legL.hip,
      shinL: legL.knee,
      footL: legL.ankle,
      thighR: legR.hip,
      shinR: legR.knee,
      footR: legR.ankle,
    },
  };
}
