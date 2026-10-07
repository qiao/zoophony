import { Vector3 } from 'three';

import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import { SPECIES } from '../models/species.ts';
import type { SpeciesId } from '../models/species.ts';
import { toVec3 } from '../models/tuples.ts';
import type { Vec3 } from '../models/tuples.ts';

/**
 * The plump bodies of option B (`docs/research/2026-10-06-cute-furry-spec.md`, 2.4), which the
 * user chose on 2026-10-07. Values in H.
 */
export const PLUMP_TARGETS = {
  /** The torso factor of the medium animals: a size from 1.05 to 1.15. */
  medium: 1.1,
  /** The torso factor of the large animals: a size of 1.2 or more. */
  large: 1.25,
  /** The half width of the torso at the shoulder joints, before the torso factor. */
  shoulders: 0.53,
  /** The forward bulge of the belly, as a factor of the half width. */
  belly: 1.16,
  /** The radii of the arm at the shoulder, the elbow, and the wrist. */
  arm: [0.2, 0.17, 0.15],
  /** The scale of the mitten. */
  mitten: 1.2,
  /** The share of the extra half width of the torso that moves each shoulder joint out. */
  shoulderMove: 0.7,
} as const;

/**
 * The body of `main`, in H: the values of `models/trunk.ts` and `models/arms.ts` that the targets
 * of option B change.
 */
const MAIN = {
  /** The half width of the torso at the shoulder joints. */
  shoulders: 0.5,
  /** The radii of the arm at the shoulder, the elbow, and the wrist. */
  arm: [0.2, 0.16, 0.12],
  /** The scale of the mitten. */
  mitten: 1.2,
  /** The forward bulge of the belly at each height above the base of the torso. */
  belly: [
    [0, 1],
    [0.05, 1.04],
    [0.16, 1.12],
    [0.3, 1.16],
    [0.45, 1.12],
    [0.6, 1.06],
    [0.75, 1],
  ],
  /** The largest forward bulge of the belly. */
  bellyPeak: 1.16,
  /** The height of the base of the hips bone above the base of the torso. */
  hips: 0.15,
  /** The height from which the torso widens to the shoulder width of option B. */
  widenFrom: 0.6,
  /** The height of the shoulder joints above the base of the torso. */
  shoulderHeight: 0.98,
  /** The half width of the shoulder joints from the axis of the torso, before the girth. */
  shoulderJoint: 0.52,
} as const;

/**
 * Gives the torso factor of option B for a species: 1 for a small animal, 1.1 for a medium one
 * (size 1.05 to 1.15), and 1.25 for a large one (size 1.2 or more).
 *
 * @param species The species.
 * @returns The factor of the width and the depth of the torso.
 */
export function plumpOf(species: SpeciesId): number {
  const { size } = SPECIES[species];
  if (size >= 1.2) {
    return PLUMP_TARGETS.large;
  }
  return size >= 1.05 ? PLUMP_TARGETS.medium : 1;
}

/**
 * Gives the forward bulge of the belly of `main` at a height, between the rings of its profile.
 *
 * @param y The height above the base of the torso, in H.
 * @returns The bulge, as a factor of the half width.
 */
function bellyAt(y: number): number {
  const rings = MAIN.belly;
  for (let i = 0; i + 1 < rings.length; i++) {
    const [y0, b0] = rings[i] ?? [0, 1];
    const [y1, b1] = rings[i + 1] ?? [1, 1];
    if (y >= y0 && y <= y1) {
      return b0 + ((b1 - b0) * (y - y0)) / (y1 - y0);
    }
  }
  return 1;
}

/** The bones of one arm, and the instrument bones that hang on its hand. */
const ARM_SIDES = {
  L: ['upperArmL', 'forearmL', 'handL', 'fingersL', 'malletL'],
  R: ['upperArmR', 'forearmR', 'handR', 'fingersR', 'bow', 'malletR', 'baton'],
} as const satisfies Readonly<Record<'L' | 'R', readonly BoneName[]>>;

/**
 * Moves the corners of an arm part away from the axis of its bone: the radius changes from one
 * factor at the start joint to another at the end joint. Above the start joint, the dome of the
 * shoulder grows by the first factor.
 *
 * @param p The corner. The function moves it in place.
 * @param from The start joint.
 * @param to The end joint, below the start joint in the bind pose.
 * @param factors The factors of the radius at the two joints.
 */
function thicken(p: Vector3, from: Vec3, to: Vec3, factors: readonly [number, number]): void {
  const t = Math.min(1, Math.max(0, (from[1] - p.y) / (from[1] - to[1])));
  const k = factors[0] + (factors[1] - factors[0]) * t;
  p.x = from[0] + (p.x - from[0]) * k;
  p.z = from[2] + (p.z - from[2]) * k;
  if (p.y > from[1]) {
    p.y = from[1] + (p.y - from[1]) * factors[0];
  }
}

/**
 * Makes the body of a player plump, as the option B targets ask: a wider and deeper torso with
 * the belly bulge of 1.16, thicker arms, larger mittens, and the shoulder joints moved out by 0.7
 * of the extra half width. The legs, the head, and the instrument keep their places. Only tests
 * use this function, so the rest poses leave room for the bodies of option B before they come.
 *
 * @param model The player model of `main`.
 * @param species The species of the model.
 * @returns The plump model, with the mesh, the skeleton, the body points, and the pieces moved.
 */
export function plumpModel(model: PlayerModel, species: SpeciesId): PlayerModel {
  const plump = plumpOf(species);
  const h = model.body.headHeight;
  const at = (bone: BoneName): Vec3 => model.skeleton.positions[boneIndex(bone)] ?? [0, 0, 0];
  const hips = at('hips');
  const base = hips[1] - MAIN.hips * h;
  const axis = hips[2];
  const girth = at('upperArmR')[0] / (MAIN.shoulderJoint * h);
  const move = PLUMP_TARGETS.shoulderMove * (plump - 1) * PLUMP_TARGETS.shoulders * girth * h;
  const torso = new Set([boneIndex('spine'), boneIndex('chest')]);
  const shift = new Map<number, number>();
  for (const [side, sign] of [
    ['L', -1],
    ['R', 1],
  ] as const) {
    for (const bone of ARM_SIDES[side]) {
      shift.set(boneIndex(bone), sign * move);
    }
  }

  const arm = PLUMP_TARGETS.arm.map((r, i) => r / (MAIN.arm[i] ?? r));
  const thick = (side: 'L' | 'R'): ReadonlyMap<number, (p: Vector3) => void> => {
    const [shoulder, elbow, wrist] = [
      at(`upperArm${side}`),
      at(`forearm${side}`),
      at(`hand${side}`),
    ];
    return new Map([
      [
        boneIndex(`upperArm${side}`),
        (p: Vector3) => thicken(p, shoulder, elbow, [arm[0] ?? 1, arm[1] ?? 1]),
      ],
      [
        boneIndex(`forearm${side}`),
        (p: Vector3) => thicken(p, elbow, wrist, [arm[1] ?? 1, arm[2] ?? 1]),
      ],
    ]);
  };
  const thickArms = new Map([...thick('L'), ...thick('R')]);

  // The mittens grow around the middle of their corners.
  const { positions, bones } = model.mesh;
  const middles = new Map<number, Vector3>();
  const counts = new Map<number, number>();
  const mittens = new Set(
    (['handL', 'fingersL', 'handR', 'fingersR'] as const).map((b) => boneIndex(b)),
  );
  for (let v = 0; v < bones.length; v++) {
    const bone = bones[v] ?? 0;
    if (mittens.has(bone)) {
      const p = new Vector3(positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]);
      middles.set(bone, (middles.get(bone) ?? new Vector3()).add(p));
      counts.set(bone, (counts.get(bone) ?? 0) + 1);
    }
  }
  for (const [bone, sum] of middles) {
    sum.divideScalar(counts.get(bone) ?? 1);
  }

  const out = new Float32Array(positions);
  const p = new Vector3();
  for (let v = 0; v < bones.length; v++) {
    const bone = bones[v] ?? 0;
    p.fromArray(out, v * 3);
    if (torso.has(bone)) {
      const y = (p.y - base) / h;
      const widen = widthFactor(y);
      const across = plump * widen;
      p.x *= across;
      const depth = p.z - axis;
      const belly = bellyAt(y);
      p.z = axis + depth * across * (depth < 0 ? bellyGrowth(belly) : 1);
    }
    thickArms.get(bone)?.(p);
    const middle = middles.get(bone);
    if (middle) {
      p.sub(middle)
        .multiplyScalar(PLUMP_TARGETS.mitten / MAIN.mitten)
        .add(middle);
    }
    p.x += shift.get(bone) ?? 0;
    p.toArray(out, v * 3);
  }

  const moved = (bone: number, place: Vec3): Vec3 =>
    toVec3(new Vector3(...place).add(new Vector3(shift.get(bone) ?? 0, 0, 0)));
  return {
    ...model,
    mesh: { ...model.mesh, positions: out },
    skeleton: {
      ...model.skeleton,
      positions: model.skeleton.positions.map((place, bone) => moved(bone, place)),
    },
    body: {
      ...model.body,
      palmL: moved(boneIndex('handL'), model.body.palmL),
      palmR: moved(boneIndex('handR'), model.body.palmR),
      fingerBlockL: moved(boneIndex('fingersL'), model.body.fingerBlockL),
      fingerBlockR: moved(boneIndex('fingersR'), model.body.fingerBlockR),
    },
    pieces: model.pieces.map((placed) => ({
      ...placed,
      at: { ...placed.at, position: moved(boneIndex(placed.piece.bone), placed.at.position) },
    })),
  };
}

/**
 * Gives the factor of the front depth of the torso that changes the bulge of `main` to the bulge
 * of option B. The bulge of each ring grows in proportion, so that the largest bulge becomes
 * {@link PLUMP_TARGETS.belly}.
 *
 * @param belly The bulge of `main` at a height.
 * @returns The factor of the front depth.
 */
function bellyGrowth(belly: number): number {
  const share = (PLUMP_TARGETS.belly - 1) / (MAIN.bellyPeak - 1);
  return (1 + share * (belly - 1)) / belly;
}

/**
 * Gives the factor of the half width of the torso of option B at a height: 1 up to 0.6 H, then
 * up to 0.53 / 0.5 at the shoulder joints and above them.
 *
 * @param y The height above the base of the torso, in H.
 * @returns The factor.
 */
function widthFactor(y: number): number {
  const t = Math.min(1, Math.max(0, (y - MAIN.widenFrom) / (MAIN.shoulderHeight - MAIN.widenFrom)));
  return 1 + (PLUMP_TARGETS.shoulders / MAIN.shoulders - 1) * t;
}
